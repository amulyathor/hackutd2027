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
        agentId: "AGENT-01-THERMAL",
        agentName: "Thermal Agent",
        role: "CRAH Valve Anomaly & Airflow Diagnostics",
        model: resolvedModel,
        reactPhase: "REASON_THINK",
        summaryAction: `Detected CRAH-02 bypass valve override at 38% from Badge #4491 entry, causing 14.2 L/min coolant drop to Cluster Bravo.`,
        thinkTrace:
          liveNemotronThink ||
          `1. Telemetry Sentinel observing thermal drift across Cluster Bravo (Racks 09-16) at T+${metrics.horizonOffsetMin}m horizon.
2. Retrieved unstructured NMC² Shift C log + CBRE Access Control badge events: Contractor Badge #4491 entered Mech Room M2 and left CRAH-02 manual bypass at 38%.
3. Mapped CBRE Master Lease #HYP-02 Clause 14.2: active SLA risk is $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr with T-${metrics.remainingTimeToCascadeMin} mins remaining before breach.`,
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
        conclusion: `Root cause verified: Unclosed manual bypass valve in Room M2 (Badge #4491) threatens $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr in tenant SLAs within T-${metrics.remainingTimeToCascadeMin} mins.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-02-POWER",
        agentName: "Power Agent",
        role: "Substation Harmonics & Busbar Rectifier Diagnostics",
        model: resolvedModel,
        reactPhase: "ACT_TOOL_CALL",
        summaryAction: `Audited 48V busbar harmonics on Feeder PDU-B1: isolated 91.8mV ripple accelerating capacitor wear on Cluster Charlie rectifiers.`,
        thinkTrace: `1. Executing electrical spectrum scan across PDU-B1 and Cluster Charlie/Delta busbars.
2. Detected 8.7% Total Harmonic Distortion (THD) on Substation Feeder B1.
3. Isolated rectifier shelves in RACK-19 and RACK-20 suffering from 91.8mV switching harmonic ripple, inducing single-bit ECC errors on Tray U6.
4. Engaged active harmonic power filter to clamp busbar ripple down to 1.9% THD.`,
        toolCalls: [
          {
            id: "tc-201",
            toolName: "audit_pdu_harmonics_and_busbar_ripple",
            arguments: {
              feederId: "PDU-B1",
              targetClusters: ["CLUSTER-C", "CLUSTER-D"],
            },
            observation:
              "Measured 8.7% THD / 91.8mV peak-to-peak ripple on 48V DC busbar. Activated active harmonic cancellation filter.",
            status: "SUCCESS",
            latencyMs: 146,
          },
        ],
        conclusion: `Suppressed harmonic resonance on Feeder PDU-B1 from 8.7% to 1.9% THD, protecting power delivery across 16 server racks.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-03-HARDWARE",
        agentName: "Hardware Agent",
        role: "Manifold Seals & Cage 4 Swap Staging",
        model: resolvedModel,
        reactPhase: "ACT_TOOL_CALL",
        summaryAction: `Identified damaged quick-disconnect seals on Rack-11 (U4 Tray) & 4 other degraded racks; staged Cage 4 modular replacement kits.`,
        thinkTrace: `1. Executing spectral clustering over per-blade telemetry [tempC, psuRippleMv, eccErrorsPerHr, vibrationMmS].
2. Identified ${metrics.transientDriftRacksCount} racks suffering purely from external CRAH-02 coolant starvation (0 blade hardware faults -> recover via valve actuation).
3. Isolated ${metrics.flaggedHardwareSwapsCount} racks with intrinsic component failure: RACK-11 (U4 Manifold/38 ECC), RACK-12 (U2 TIM/31 ECC), RACK-19 (U8 91.8mV Ripple/54 ECC), RACK-20 (U8 84.5mV Ripple/42 ECC), and RACK-27 (CDU Bearing 4.7 mm/s).`,
        toolCalls: [
          {
            id: "tc-301",
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
            id: "tc-302",
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
        conclusion: `Isolated damaged quick-disconnect manifold seals on RACK-11 & staged 5 precision replacements in Cage 4, saving $242.5K in unnecessary parts.`,
        metricsImpact: {
          slaSavedPerHrUsd: metrics.activeSlaExposurePerHrUsd,
          racksStabilized: totalUnstableRacks,
          racksFlaggedForReplacement: metrics.flaggedSwapRackIds,
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-04-DISPATCHER",
        agentName: "Executive Dispatcher",
        role: "Auto-Healing & CBRE Lease Portal Bridge",
        model: resolvedModel,
        reactPhase: "OBSERVE_SYNTHESIZE",
        summaryAction: `Actuated CRAH-02 Aux Valve V-204B, live-drained 48 GPU workloads, and transmitted protected status to CBRE Lease Portal.`,
        thinkTrace: `1. With T-${metrics.remainingTimeToCascadeMin} mins to SLA breach, executing zero-touch mitigation.
2. Actuating motorized Auxiliary Valve V-204B on CRAH-02 to bypass the stuck manual valve in Room M2 and engaging active harmonic filtering on PDU-B1.
3. Live-draining distributed training & inference shards off swap-bound racks to Cluster Alpha with 0 dropped tokens.
4. Transmitting executive briefing to CBRE Asset Management portal recommending Hillsboro OR site expansion.`,
        toolCalls: [
          {
            id: "tc-401",
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
            id: "tc-402",
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
          {
            id: "tc-403",
            toolName: "broadcast_cbre_portal_status_handshake",
            arguments: {
              protectedSlaUsd: metrics.activeSlaExposurePerHrUsd,
              recommendedSite: "CBRE Hillsboro Clean-Grid AI Factory (34MW Ready)",
            },
            observation:
              "CBRE Asset Management Portal updated: $80,712/hr SLA exposure marked 100% Protected; Hillsboro expansion pipeline recommendation dispatched.",
            status: "SUCCESS",
            latencyMs: 64,
          },
        ],
        conclusion:
          liveNemotronContent ||
          `Facility drift in DFW will trigger a lease covenant breach within 18 minutes. Autonomous mitigation has stabilized cooling, but local grid headroom is near capacity (3.2 MW margin). Recommend approving capacity offload to Hillsboro.`,
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
