import { NextRequest, NextResponse } from "next/server";
import { DISASTER_SCENARIOS, generateInitialDataCenterState } from "@/lib/datacenter-twin";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scenarioId = "chiller_badge_cascade",
      timeOffsetMin = 15,
      userPrompt = "",
      apiKey = "",
      model = process.env.NEMOTRON_MODEL || "nvidia/nvidia-nemotron-nano-9b-v2",
      mode = "autonomous_mitigation", // "autonomous_mitigation" | "custom_query" | "cbre_expansion"
    } = body;

    const scenario =
      DISASTER_SCENARIOS.find((s) => s.id === scenarioId) || DISASTER_SCENARIOS[0];
    const dcState = generateInitialDataCenterState(scenarioId, timeOffsetMin, false);
    const unstableRacks = dcState.racks.filter((r) => r.healthScore < 72);
    const replacementRacks = dcState.racks.filter((r) => r.replacementRecommended);

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
    let apiErrorNote = "";

    // If an API key is provided, call live NVIDIA Nemotron with `/think` system prompt (per HackUTD NVIDIA Slide 5)
    if (resolvedApiKey && resolvedApiKey !== "nvapi-your-key-here") {
      try {
        const telemetryDigest = {
          scenario: scenario.name,
          rootCauseSilo: scenario.rootCauseSilo,
          timeOffsetMin,
          unstableRacksCount: unstableRacks.length,
          replacementCandidates: replacementRacks.map((r) => ({
            id: r.id,
            cluster: r.clusterId,
            coolantTempC: r.coolantTempC,
            voltageRippleMv: r.voltageRippleMv,
            healthScore: r.healthScore,
            diagnosis: r.replacementDiagnosis,
          })),
          cbreSlaRiskPerHrUsd: scenario.unmitigatedSlaLossPerHr,
          shiftHandoffNote: dcState.shiftEvents[0]?.unstructuredNote,
        };

        const systemInstruction = `/think
You are NexusDC-Nemotron, an autonomous Multi-Agent Infrastructure & Real Estate Orchestrator built for NorthMark Compute & Cloud (NMC²) and CBRE.
You operate using a strict ReAct (Reason -> Act -> Observe) workflow across 4 silos:
1. CBRE Invisible Network (Access Control, HVAC Chiller Loops, Utility Substations, Tenant SLA Leases)
2. NMC² Compute Rack Clusters (identifying unstable GPU racks vs. chronic degraded hardware needing physical blade/PSU/manifold replacement)
3. Autonomous Tool Execution (draining Kubernetes/Slurm LLM jobs, actuating backup CRAH cooling valves, staging replacement hardware)
4. CBRE Commercial Real Estate Portfolio Expansion & Zero-Drop Shift Handoff synthesis.

Analyze the live telemetry digest and provide:
- Exact cross-silo causal chain
- Specific racks to drain vs. physically replace (RACK-11, RACK-12, RACK-19, RACK-20, RACK-27)
- Autonomous mitigation steps & CBRE real estate SLA/site recommendation.`;

        const userMessage = userPrompt
          ? `Operator Query: ${userPrompt}\n\nLive Telemetry Context:\n${JSON.stringify(telemetryDigest, null, 2)}`
          : `Execute autonomous multi-step ReAct investigation, hardware replacement clustering, and CBRE SLA mitigation for active crisis:\n${JSON.stringify(telemetryDigest, null, 2)}`;

        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolvedApiKey}`,
          },
          body: JSON.stringify({
            model: isOpenRouter && !model.includes("nemotron") ? "nvidia/llama-3.1-nemotron-70b-instruct" : model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userMessage },
            ],
            temperature: 0.6,
            top_p: 0.95,
            max_tokens: 1024,
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
          usedLiveApi = true;
        } else {
          const errText = await response.text();
          apiErrorNote = `NVIDIA API returned HTTP ${response.status}: ${errText.slice(0, 160)}`;
        }
      } catch (err: unknown) {
        apiErrorNote =
          err instanceof Error ? err.message : "Network error reaching NVIDIA NIM endpoint";
      }
    }

    // Build the 4-Agent ReAct + Tool-Calling Pipeline Output (enriched with live Nemotron output when available)
    const agentSteps: AgentStepOutput[] = [
      {
        agentId: "AGENT-01-SENTINEL",
        agentName: "Nemotron-Sentinel (Agentic RAG & Cross-Silo Correlator)",
        role: "CBRE 'Invisible Network' & NMC² Shift Log Investigator",
        model,
        reactPhase: "REASON_THINK",
        thinkTrace:
          liveNemotronThink ||
          `[Nemotron /think Trace]
1. Observing thermal spike across Cluster Bravo (RACK-09 to RACK-16 inlet coolant climbing +1.8°C/min).
2. Traditional BMS threshold alerts only show "High Rack Temp", missing the root cause.
3. Decided WHEN to retrieve from Agentic RAG: querying unstructured NMC² Shift Handoff logs + CBRE Physical Access Control badge events within T-45m window.
4. Found correlation: Contractor Badge #4491 entered Mechanical Room M2 at 22:42 CST + Tech Marcus Vance logged "Left CRAH-02 secondary bypass valve at ~35-40% manual override".
5. Cross-referencing CBRE Master Lease #HYP-02 Clause 14.2: >42°C liquid inlet for 15 mins triggers $44,000/hr SLA penalty + $24,400/hr cascading exposure on Cluster Charlie.`,
        toolCalls: [
          {
            id: "tc-101",
            toolName: "agentic_rag_query_shift_and_badge_logs",
            arguments: {
              timeWindowMin: 60,
              silos: ["CBRE_ACCESS_CONTROL", "NMC2_SHIFT_LOGS", "BMS_MODBUS_TELEMETRY"],
              semanticQuery: "CRAH-02 cooling flow drop bypass valve manual override",
            },
            observation:
              "Matched Badge #4491 (Mech Room M2) + Shift C Log #SHIFT-EV-1 ('Left bypass valve at 35-40%') with 99.1% causal confidence.",
            status: "SUCCESS",
            latencyMs: 142,
          },
          {
            id: "tc-102",
            toolName: "query_cbre_lease_sla_covenants",
            arguments: {
              facilityId: "SITE-DFW-1",
              affectedClusters: scenario.affectedClusters,
            },
            observation: `Active SLA Exposure: $${scenario.unmitigatedSlaLossPerHr.toLocaleString()}/hr across Hyperscale Lease #HYP-02 & Sovereign Cloud Lease #FIN-03. Time to breach: ${Math.max(4, scenario.timeToCascadeCriticalMin - Math.round(timeOffsetMin * 0.4))} mins.`,
            status: "SUCCESS",
            latencyMs: 98,
          },
        ],
        conclusion:
          "Root cause isolated across 4 fragmented silos: Unclosed manual bypass valve in Mechanical Room M2 (Badge #4491) + PDU-B1 harmonic distortion is driving a multi-cluster thermal & voltage cascade.",
        metricsImpact: {
          slaSavedPerHrUsd: scenario.unmitigatedSlaLossPerHr,
          racksStabilized: unstableRacks.length,
          racksFlaggedForReplacement: replacementRacks.map((r) => r.id),
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-02-CLUSTER-ML",
        agentName: "Nemotron-ClusterML (Hardware Degradation & Replacement Agent)",
        role: "Spectral Clustering: Transient Cascade vs. Hardware Replacement",
        model,
        reactPhase: "ACT_TOOL_CALL",
        thinkTrace: `[Nemotron /think Trace]
1. Not all hot racks need hardware replacement! Must separate racks suffering from external CRAH-02 coolant starvation from racks with intrinsic hardware failure.
2. Executing spectral graph clustering over [coolantFlowLpm, voltageRippleMv, vibrationMmS, HBM3e_ECC_rate].
3. RACK-09, 10, 13, 14, 15, 16 have normal impedance & zero ECC errors -> classify as THERMAL_CASCADE_RISK (recoverable via cooling restoration).
4. RACK-11 & RACK-12 exhibit localized manifold pressure drop -> classify as COOLING_MICRO_LEAK_REPLACE (Blade U4 + Quick-Disconnect Seal swap).
5. RACK-19 & RACK-20 exhibit 82mV 48V busbar ripple + 48 ECC errors/hr on Blade U6 -> classify as POWER_RIPPLE_DEGRADED (PSU Shelf + Blade U6 replacement).
6. RACK-27 exhibits 4.6 mm/s CDU bearing cavitation -> classify for NEXT_MAINTENANCE_WINDOW replacement.`,
        toolCalls: [
          {
            id: "tc-201",
            toolName: "execute_spectral_rack_clustering",
            arguments: {
              features: ["coolantTempC", "voltageRippleMv", "vibrationMmS", "eccErrorsPerHr", "coolantFlowLpm"],
              clusterCount: 5,
            },
            observation:
              "Clustered 32 racks: 19 Healthy, 8 Transient Thermal Cascade Risk, 5 Hardware Replacement Required (RACK-11, RACK-12, RACK-19, RACK-20, RACK-27).",
            status: "SUCCESS",
            latencyMs: 186,
          },
          {
            id: "tc-202",
            toolName: "stage_nmc2_hardware_replacement_work_orders",
            arguments: {
              immediateSwapRacks: ["RACK-11", "RACK-12", "RACK-19", "RACK-20"],
              scheduledSwapRacks: ["RACK-27"],
              spareInventoryCage: "NMC2-CAGE-04",
            },
            observation:
              "Reserved 2x HGX B200 Blades (U4), 2x 48V Rectifier PSU Shelves + HGX H200 Blades (U6), and 1x Liquid CDU Pump Kit ($242,500 total CapEx).",
            status: "SUCCESS",
            latencyMs: 115,
          },
        ],
        conclusion:
          "Isolated 5 chronically degraded racks (RACK-11, 12, 19, 20, 27) for physical blade/PSU/manifold replacement while preventing unnecessary replacement of 8 healthy racks caught in the cooling cascade.",
        metricsImpact: {
          slaSavedPerHrUsd: scenario.unmitigatedSlaLossPerHr,
          racksStabilized: unstableRacks.length,
          racksFlaggedForReplacement: ["RACK-11", "RACK-12", "RACK-19", "RACK-20", "RACK-27"],
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-03-ACTUATOR",
        agentName: "Nemotron-Actuator (Autonomous ReAct Healing Engine)",
        role: "Zero-Touch Facility Control & Kubernetes/Slurm Workload Draining",
        model,
        reactPhase: "ACT_TOOL_CALL",
        thinkTrace: `[Nemotron /think Trace]
1. Time to SLA breach is under 18 minutes—cannot wait for manual ticket triage.
2. Step 1 (Act): Checkpoint and live-migrate distributed LLM jobs off RACK-11, 12, 19, 20 to Cluster Alpha & Hillsboro DR.
3. Step 2 (Act): Actuate motorized Auxiliary Isolation Valve V-204B on CRAH-02 to bypass the stuck manual valve in Mech Room M2 and restore 39.4 L/min coolant flow.
4. Step 3 (Observe): Coolant temperature across Cluster Bravo dropping -0.9°C/min; PDU-B1 active harmonic filter engaged (ripple reduced from 82mV to 18mV).`,
        toolCalls: [
          {
            id: "tc-301",
            toolName: "cbre_bms_actuate_cooling_and_power_controls",
            arguments: {
              crahUnit: "CRAH-02",
              action: "ENGAGE_AUX_VALVE_V204B_AND_CLOSE_BYPASS",
              pduUnit: "PDU-B1",
              enableActiveHarmonicFilter: true,
            },
            observation:
              "CRAH-02 secondary flow restored to 39.4 L/min; PDU-B1 harmonic distortion damped from 8.7% to 2.1% THD.",
            status: "SUCCESS",
            latencyMs: 210,
          },
          {
            id: "tc-302",
            toolName: "nvidia_nvlink_live_drain_and_migrate_workloads",
            arguments: {
              sourceRacks: ["RACK-11", "RACK-12", "RACK-19", "RACK-20"],
              targetCluster: "CLUSTER-A",
              checkpointFormat: "NVLink-CRIU-ZeroLoss",
            },
            observation:
              "48x 8-GPU training & inference shards live-migrated in 4.2s with 0 dropped tokens. Degraded racks safely cordoned for technician hot-swap.",
            status: "SUCCESS",
            latencyMs: 265,
          },
        ],
        conclusion:
          liveNemotronContent ||
          "Autonomous mitigation executed: Auxiliary cooling loop restored, harmonic ripple filtered, and workloads safely drained from the 5 replacement-bound racks with zero tenant downtime.",
        metricsImpact: {
          slaSavedPerHrUsd: scenario.unmitigatedSlaLossPerHr,
          racksStabilized: unstableRacks.length,
          racksFlaggedForReplacement: ["RACK-11", "RACK-12", "RACK-19", "RACK-20", "RACK-27"],
          cbreTargetSite: "SITE-PDX-2",
        },
      },
      {
        agentId: "AGENT-04-CBRE-STRATEGIST",
        agentName: "Nemotron-CBRE-Strategist (Real Estate & Shift Handoff Planner)",
        role: "CBRE Site Capacity Expansion + NMC² Zero-Drop Shift Briefing",
        model,
        reactPhase: "OBSERVE_SYNTHESIZE",
        thinkTrace: `[Nemotron /think Trace]
1. Evaluating long-term CBRE Real Estate & Facility physics: DFW-North is at 93.3% power capacity (44.8MW / 48.0MW) and 350 lbs/sq.ft slab limit.
2. Upgrading Cluster Charlie from Hopper H200 (85kW/rack) to next-gen Blackwell NVL72 (130kW/rack) will exceed DFW-North feeder & slab margins by 14.2MW.
3. Querying CBRE Commercial Data Center Portfolio: Hillsboro Clean-Grid AI Factory (SITE-PDX-2) offers 34MW turn-key hydro capacity, PUE 1.11, 500 lbs/sq.ft slab, and $142/kW-mo lease rate (96/100 match).
4. Compiling NMC² Zero-Drop Shift Handoff Flight Recorder so incoming Night Shift A team has exact rack bay coordinates, spare cage barcodes, and verified valve states.`,
        toolCalls: [
          {
            id: "tc-401",
            toolName: "cbre_portfolio_site_selection_optimizer",
            arguments: {
              requiredPowerMw: 18.0,
              minSlabLbsSqFt: 450,
              requireDirectToChipLiquid: true,
              compareInPlaceRetrofitVsExpansion: true,
            },
            observation:
              "Recommended CBRE Hillsboro OR (SITE-PDX-2, Score 96/100): saves $1.84M/yr in lease + PUE power costs vs. DFW substation retrofit.",
            status: "SUCCESS",
            latencyMs: 174,
          },
          {
            id: "tc-402",
            toolName: "publish_nmc2_zero_drop_shift_handoff_packet",
            arguments: {
              outgoingShift: "Swing Shift C",
              incomingShift: "Night Shift A",
              verifiedFixes: ["CRAH-02 Aux Valve Open", "RACK-11/12/19/20 Cordoned"],
              physicalTasksForIncomingTechs: [
                "Hot-swap HGX B200 Blade U4 & Manifold Seal on RACK-11, RACK-12",
                "Replace 48V Rectifier Shelf #2 & Blade U6 on RACK-19, RACK-20",
              ],
            },
            observation:
              "Shift Handoff Packet #HO-9942 cryptographically signed and pinned to Night Shift A console.",
            status: "SUCCESS",
            latencyMs: 88,
          },
        ],
        conclusion:
          "Protected $68,400/hr in CBRE Tenant SLAs, staged 5 precision rack hardware replacements for Night Shift A, and generated a CBRE Real Estate Expansion Plan to offload 18MW of next-gen Blackwell capacity to Hillsboro OR.",
        metricsImpact: {
          slaSavedPerHrUsd: scenario.unmitigatedSlaLossPerHr,
          racksStabilized: unstableRacks.length,
          racksFlaggedForReplacement: ["RACK-11", "RACK-12", "RACK-19", "RACK-20", "RACK-27"],
          cbreTargetSite: "SITE-PDX-2",
        },
      },
    ];

    return NextResponse.json({
      ok: true,
      usedLiveApi,
      modelUsed: model,
      apiErrorNote: apiErrorNote || undefined,
      liveNemotronThink: liveNemotronThink || undefined,
      liveNemotronContent: liveNemotronContent || undefined,
      scenario,
      agentSteps,
      summary: {
        slaSavedPerHrUsd: scenario.unmitigatedSlaLossPerHr,
        totalRacksAnalyzed: 32,
        racksAutoStabilized: unstableRacks.length,
        racksRequiringPhysicalReplacement: ["RACK-11", "RACK-12", "RACK-19", "RACK-20", "RACK-27"],
        replacementCapExUsd: 242500,
        cbreRecommendedSite: "CBRE Hillsboro Clean-Grid AI Factory (34MW Available, PUE 1.11)",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to run Nemotron pipeline",
      },
      { status: 500 }
    );
  }
}

