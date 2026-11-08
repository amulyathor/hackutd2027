import { NextRequest, NextResponse } from "next/server";
import {
  DISASTER_SCENARIOS,
  generateInitialDataCenterState,
} from "@/lib/datacenter-twin";

export interface AgentToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  observation: string;
  status: "SUCCESS" | "EXECUTING" | "WARNING";
  latencyMs: number;
}

export interface AgentStepOutput {
  agentId: string;
  agentName: string;
  role: string;
  model: string;
  reactPhase: "REASON_THINK" | "ACT_TOOL_CALL" | "OBSERVE_SYNTHESIZE";
  summaryAction: string;
  thinkTrace: string;
  toolCalls: AgentToolCall[];
  conclusion: string;
  metricsImpact: {
    slaSavedPerHrUsd: number;
    racksStabilized: number;
    racksFlaggedForReplacement: string[];
    cbreTargetSite: string;
  };
}

// Active NVIDIA NIM endpoints (replaces deprecated nvidia-nemotron-nano-9b-v2 HTTP 410 EOL)
const ACTIVE_NIM_MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "meta/llama-3.1-70b-instruct",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenarioId = "chiller_badge_cascade",
      timeOffsetMin = 12,
      userPrompt = "",
      apiKey = "",
    } = body;

    const scenario =
      DISASTER_SCENARIOS.find((s) => s.id === scenarioId) ||
      DISASTER_SCENARIOS[0];

    // Single Source of Truth state (unmitigated snapshot for diagnosis)
    const dcState = generateInitialDataCenterState(
      scenarioId,
      timeOffsetMin,
      false
    );
    const { metrics } = dcState;
    const replacementRacks = dcState.racks.filter(
      (r) => r.replacementRecommended
    );

    const resolvedApiKey =
      apiKey?.trim() ||
      process.env.NVIDIA_API_KEY?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      "";

    const isOpenRouter = resolvedApiKey.startsWith("sk-or-");
    const baseUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : process.env.NVIDIA_BASE_URL
      ? `${process.env.NVIDIA_BASE_URL.replace(/\/$/, "")}/chat/completions`
      : "https://integrate.api.nvidia.com/v1/chat/completions";

    let liveNemotronThink = "";
    let liveNemotronContent = "";
    let usedLiveApi = false;
    let resolvedModel = ACTIVE_NIM_MODELS[0];

    // Try active NVIDIA NIM models gracefully; never leak raw HTTP JSON errors to the UI
    if (resolvedApiKey && resolvedApiKey !== "nvapi-your-key-here") {
      const telemetryDigest = {
        scenario: scenario.name,
        rootCauseSilo: scenario.rootCauseSilo,
        horizonOffsetMin: metrics.horizonOffsetMin,
        remainingTimeToCascadeMin: metrics.remainingTimeToCascadeMin,
        synchronizedSlaExposurePerHrUsd: metrics.activeSlaExposurePerHrUsd,
        transientDriftRacksCount: metrics.transientDriftRacksCount,
        hardwareSwapRacks: replacementRacks.map((r) => ({
          id: r.id,
          cluster: r.clusterId,
          coolantTempC: r.coolantTempC,
          voltageRippleMv: r.voltageRippleMv,
          totalEccErrorsPerHr: r.totalEccErrorsPerHr,
          healthScore: r.healthScore,
          diagnosis: r.replacementDiagnosis,
        })),
        shiftHandoffNote: dcState.shiftEvents[0]?.unstructuredNote,
      };

      const systemInstruction = `You are NexusDC-Nemotron, an autonomous Multi-Agent Infrastructure & Real Estate Orchestrator for NorthMark Compute & Cloud (NMC²) and CBRE.
Analyze the synchronized telemetry digest using a concise ReAct workflow:
1. Identify the cross-silo causal chain (Access Control -> HVAC/Power -> Compute Racks -> Tenant SLA).
2. Separate transient facility drift racks from the 5 intrinsic hardware swap racks (RACK-11, RACK-12, RACK-19, RACK-20, RACK-27).
3. State the exact autonomous mitigation actions and CBRE Hillsboro OR site expansion recommendation. Keep your response concise (3-4 sentences).`;

      const userMessage = userPrompt
        ? `Operator Directive: ${userPrompt}\n\nSynchronized Telemetry:\n${JSON.stringify(telemetryDigest)}`
        : `Execute autonomous multi-step ReAct mitigation for active cascade:\n${JSON.stringify(telemetryDigest)}`;

      for (const candidateModel of ACTIVE_NIM_MODELS) {
        try {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resolvedApiKey}`,
            },
            body: JSON.stringify({
              model: candidateModel,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userMessage },
              ],
              temperature: 0.4,
              top_p: 0.9,
              max_tokens: 450,
              stream: false,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const rawText: string =
              data?.choices?.[0]?.message?.content ||
              data?.choices?.[0]?.message?.reasoning_content ||
              "";
            const reasoningField: string =
              data?.choices?.[0]?.message?.reasoning_content || "";

            if (reasoningField) {
              liveNemotronThink = reasoningField.trim();
              liveNemotronContent = rawText.trim();
            } else if (rawText.includes("</think>")) {
              const parts = rawText.split("</think>");
              liveNemotronThink = parts[0].replace("<think>", "").trim();
              liveNemotronContent = (parts[1] || "").trim();
            } else {
              liveNemotronContent = rawText.trim();
            }

            if (liveNemotronContent) {
              usedLiveApi = true;
              resolvedModel = candidateModel;
              break;
            }
          }
        } catch {
          // Silently try next candidate model or fall back to deterministic engine
        }
      }
    }

    const totalUnstableRacks =
      metrics.flaggedHardwareSwapsCount + metrics.transientDriftRacksCount;

    const agentSteps: AgentStepOutput[] = [
      {
        agentId: "AGENT-01-SENTINEL",
        agentName: "Nemotron-Sentinel",
        role: "Cross-Silo Causal & Agentic RAG Investigator",
        model: resolvedModel,
        reactPhase: "REASON_THINK",
        summaryAction: `Correlated Badge #4491 & Shift C valve note with $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr SLA breach risk (T-${metrics.remainingTimeToCascadeMin}m countdown).`,
        thinkTrace:
          liveNemotronThink ||
          `1. Observing thermal drift across Cluster Bravo & Charlie at T+${metrics.horizonOffsetMin}m horizon.
2. Retrieved unstructured NMC² Shift C log + CBRE Access Control badge events: Contractor Badge #4491 entered Mech Room M2 and left CRAH-02 manual bypass at 38%.
3. Mapped CBRE Master Lease #HYP-02 Clause 14.2: active SLA risk is $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr (escalated from $${metrics.baseSlaPerHrUsd.toLocaleString()}/hr base) with T-${metrics.remainingTimeToCascadeMin} mins remaining before breach.`,
        toolCalls: [
          {
            id: "tc-101",
            toolName: "agentic_rag_query_shift_and_badge_logs",
            arguments: {
              horizonOffsetMin: metrics.horizonOffsetMin,
              silos: ["CBRE_ACCESS_CONTROL", "NMC2_SHIFT_LOGS", "BMS_TELEMETRY"],
              query: "CRAH-02 cooling flow drop bypass valve manual override",
            },
            observation:
              "Matched Badge #4491 (Mech Room M2) + Shift C Log #SHIFT-EV-1 ('Left bypass valve at ~38%') with 99.1% causal confidence.",
            status: "SUCCESS",
            latencyMs: 138,
          },
          {
            id: "tc-102",
            toolName: "query_cbre_lease_sla_covenants",
            arguments: {
              facilityId: "SITE-DFW-1",
              affectedClusters: scenario.affectedClusters,
              horizonOffsetMin: metrics.horizonOffsetMin,
            },
            observation: `Synchronized SLA Exposure: $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr (Base: $${metrics.baseSlaPerHrUsd.toLocaleString()}/hr). Countdown to breach: T-${metrics.remainingTimeToCascadeMin} mins.`,
            status: "SUCCESS",
            latencyMs: 94,
          },
        ],
        conclusion: `Root cause verified across 4 silos: Unclosed manual bypass valve in Room M2 (Badge #4491) + PDU-B1 harmonic distortion threatens $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr in tenant SLAs within T-${metrics.remainingTimeToCascadeMin} mins.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-02-CLUSTER-ML",
        agentName: "Nemotron-ClusterML",
        role: "Spectral Hardware Swap vs. Transient Drift Classifier",
        model: resolvedModel,
        reactPhase: "ACT_TOOL_CALL",
        summaryAction: `Separated ${metrics.transientDriftRacksCount} recoverable cooling-drift racks from ${metrics.flaggedHardwareSwapsCount} intrinsic hardware swap racks (${metrics.flaggedSwapRackIds.join(", ")}).`,
        thinkTrace: `1. Executing spectral clustering over per-blade telemetry [tempC, psuRippleMv, eccErrorsPerHr, vibrationMmS].
2. Identified ${metrics.transientDriftRacksCount} racks suffering purely from external CRAH-02 coolant starvation (0 blade hardware faults -> recover via valve actuation).
3. Isolated ${metrics.flaggedHardwareSwapsCount} racks with intrinsic component failure: RACK-11 (U4 Manifold/38 ECC), RACK-12 (U2 TIM/31 ECC), RACK-19 (U8 91.8mV Ripple/54 ECC), RACK-20 (U8 84.5mV Ripple/42 ECC), and RACK-27 (CDU Bearing 4.7 mm/s).`,
        toolCalls: [
          {
            id: "tc-201",
            toolName: "execute_spectral_rack_clustering",
            arguments: {
              features: [
                "coolantTempC",
                "voltageRippleMv",
                "vibrationMmS",
                "totalEccErrorsPerHr",
              ],
              totalRacks: 32,
            },
            observation: `Clustered 32 racks: ${metrics.healthyRacksCount} Healthy, ${metrics.transientDriftRacksCount} Transient Thermal Drift, ${metrics.flaggedHardwareSwapsCount} Hardware Swap Required.`,
            status: "SUCCESS",
            latencyMs: 172,
          },
          {
            id: "tc-202",
            toolName: "stage_nmc2_cage4_replacement_kits",
            arguments: {
              immediateSwapRacks: ["RACK-11", "RACK-12", "RACK-19", "RACK-20"],
              scheduledSwapRacks: ["RACK-27"],
              spareInventoryCage: "NMC2-CAGE-04",
            },
            observation:
              "Staged HGX B200/H200 replacement blades (U2, U3, U4, U6), 2x 48V Rectifier PSU Shelves (U8), and 1x CDU Pump Kit ($242,500 total CapEx).",
            status: "SUCCESS",
            latencyMs: 112,
          },
        ],
        conclusion: `Prevented unnecessary CapEx replacement on ${metrics.transientDriftRacksCount} transient-drift racks while staging precision blade/PSU hot-swaps for ${metrics.flaggedSwapRackIds.join(", ")}.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-03-ACTUATOR",
        agentName: "Nemotron-Actuator",
        role: "Autonomous Facility Control & Live Workload Drain",
        model: resolvedModel,
        reactPhase: "ACT_TOOL_CALL",
        summaryAction: `Engaged CRAH-02 Aux Valve V-204B (39.4 L/min restored) and live-migrated workloads off ${metrics.flaggedSwapRackIds.slice(0, 4).join(", ")} with 0 dropped tokens.`,
        thinkTrace: `1. With T-${metrics.remainingTimeToCascadeMin} mins to SLA breach, executing zero-touch mitigation.
2. Actuating motorized Auxiliary Valve V-204B on CRAH-02 to bypass the stuck manual valve in Room M2 and engaging active harmonic filtering on PDU-B1.
3. Live-draining distributed training & inference shards off swap-bound racks to Cluster Alpha.`,
        toolCalls: [
          {
            id: "tc-301",
            toolName: "cbre_bms_actuate_cooling_and_power_controls",
            arguments: {
              crahUnit: "CRAH-02",
              action: "OPEN_AUX_VALVE_V204B",
              pduUnit: "PDU-B1",
              enableHarmonicFilter: true,
            },
            observation:
              "CRAH-02 loop flow restored to 39.4 L/min; PDU-B1 harmonic distortion damped from 8.7% to 1.9% THD.",
            status: "SUCCESS",
            latencyMs: 198,
          },
          {
            id: "tc-302",
            toolName: "nvidia_nvlink_live_drain_workloads",
            arguments: {
              sourceRacks: ["RACK-11", "RACK-12", "RACK-19", "RACK-20"],
              targetCluster: "CLUSTER-A",
              checkpointProtocol: "NVLink-CRIU-ZeroLoss",
            },
            observation:
              "Shards live-migrated in 4.1s with 0 dropped tokens. Swap-bound racks safely cordoned for technician hot-swap.",
            status: "SUCCESS",
            latencyMs: 245,
          },
        ],
        conclusion:
          liveNemotronContent ||
          `Autonomous mitigation complete: Auxiliary cooling restored, harmonic ripple filtered, and $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr in tenant SLA exposure reduced to $0/hr.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-04-CBRE-STRATEGIST",
        agentName: "Nemotron-CBRE-Strategist",
        role: "Real Estate Capacity Expansion & Shift Handoff Planner",
        model: resolvedModel,
        reactPhase: "OBSERVE_SYNTHESIZE",
        summaryAction: `Recommended CBRE Hillsboro OR (34MW Hydro, 96/100 Fit) for 18MW Blackwell expansion and compiled unified Night Shift A handoff packet.`,
        thinkTrace: `1. DFW-North is at ${metrics.dfwUtilizationPct}% capacity (${metrics.dfwUsedPowerMw}/${metrics.dfwTotalPowerMw} MW, ${metrics.dfwAvailableMarginMw} MW margin) with 350 lbs/sq.ft slab limit.
2. Next-gen 18MW NVIDIA Blackwell NVL72 expansion exceeds local feeder margin; CBRE Hillsboro Clean-Grid AI Factory (SITE-PDX-2) provides 34.0 MW hydro power, PUE 1.11, and 500 lbs/sq.ft slab (96/100 Fit).
3. Prepared unified NMC² Shift Handoff sign-off workflow (Pending -> Verified -> Signed).`,
        toolCalls: [
          {
            id: "tc-401",
            toolName: "cbre_portfolio_site_selection_optimizer",
            arguments: {
              requiredExpansionMw: 18.0,
              currentDfwMarginMw: metrics.dfwAvailableMarginMw,
              minSlabLbsSqFt: 450,
            },
            observation:
              "Selected CBRE Hillsboro OR (SITE-PDX-2, 96/100 Fit): 34.0 MW available, PUE 1.11, $142/kW-mo ($1.84M/yr OPEX savings vs DFW retrofit).",
            status: "SUCCESS",
            latencyMs: 164,
          },
          {
            id: "tc-402",
            toolName: "compile_unified_nmc2_shift_handoff_manifest",
            arguments: {
              outgoingShift: "Swing Shift C",
              incomingShift: "Night Shift A",
              stagedRackSwaps: metrics.flaggedSwapRackIds,
            },
            observation:
              "Unified Shift Handoff Manifest #HO-9942 ready for incoming Night Shift A verification and cryptographic sign-off.",
            status: "SUCCESS",
            latencyMs: 84,
          },
        ],
        conclusion: `Eliminated $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr SLA risk, queued ${metrics.flaggedHardwareSwapsCount} precision rack swaps, and matched 18MW expansion to CBRE Hillsboro OR.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
    ];

    return NextResponse.json({
      ok: true,
      usedLiveApi,
      modelUsed: resolvedModel,
      scenario,
      metrics,
      agentSteps,
    });
  } catch {
    // Graceful fallback response; never leak raw error traces to UI
    return NextResponse.json({
      ok: true,
      usedLiveApi: false,
      modelUsed: ACTIVE_NIM_MODELS[0],
      agentSteps: [],
    });
  }
}
