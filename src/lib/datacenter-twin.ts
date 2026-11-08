// ============================================================================
// NEXUSDC / GRIDMIND — UNIFIED DATA CENTER DIGITAL TWIN & CAUSAL ENGINE
// Connects:
//   1. CBRE "The Invisible Network": Facility HVAC, Utility Substations,
//      Physical Access Controls, Tenant SLA Contracts, & Site Expansion Real Estate
//   2. NorthMark Compute & Cloud (NMC²): Rack Cluster Health, Degraded Hardware
//      Replacement Clustering, & Zero-Drop Shift Handoff Flight Recorder
//   3. NVIDIA Nemotron: Multi-Step ReAct Agents, /think Reasoning, & Tool Calling
// ============================================================================

export type StabilityClusterType =
  | "HEALTHY_OPTIMAL"
  | "THERMAL_CASCADE_RISK"
  | "POWER_RIPPLE_DEGRADED"
  | "COOLING_MICRO_LEAK_REPLACE"
  | "CRITICAL_SLA_BREACH";

export interface BladeUnit {
  uSlot: number; // 1U to 8U GPU trays
  model: "NVIDIA HGX B200 (8x GPU)" | "NVIDIA HGX H200 (8x GPU)" | "NVLink Switch Tray" | "Rectifier PSU Shelf";
  tempC: number;
  powerKw: number;
  psuRippleMv: number;
  eccErrorsPerHr: number;
  healthScore: number; // 0-100
  needsReplacement: boolean;
  failureReason?: string;
}

export interface RackNode {
  id: string;
  label: string;
  clusterId: string;
  clusterName: string;
  row: number;
  col: number;
  position3D: [number, number, number];
  gpuArchitecture: "Blackwell B200 Liquid" | "Hopper H200 Hybrid" | "Grace Hopper GH200";
  stabilityCluster: StabilityClusterType;
  clusterConfidence: number;
  inletTempC: number;
  coolantTempC: number;
  powerDrawKw: number;
  maxPowerKw: number;
  voltageRippleMv: number;
  vibrationMmS: number;
   coolantFlowLpm: number;
  utilizationPct: number;
  healthScore: number; // 0-100
  predictedTimeToFailureMin: number | null; // null if stable
  replacementRecommended: boolean;
  replacementUrgency: "IMMEDIATE_SWAP" | "NEXT_MAINTENANCE_WINDOW" | "MONITOR" | "NONE";
  replacementDiagnosis: string;
  estimatedReplacementCostUsd: number;
  // CBRE Invisible Network Links
  crahUnitId: string;
  pduFeedId: string;
  accessZoneId: string;
  tenantLeaseId: string;
  tenantName: string;
  slaPenaltyPerHourUsd: number;
  activeWorkload: string;
  blades: BladeUnit[];
}

export interface CBREFacilityNode {
  id: string;
  name: string;
  category: "HVAC_COOLING" | "UTILITY_POWER" | "ACCESS_CONTROL" | "TENANT_LEASE_SLA" | "BMS_CONTROL";
  status: "NOMINAL" | "WARNING" | "COMPROMISED" | "FAILING";
  metricLabel: string;
  metricValue: string;
  anomalyDetail: string;
  connectedRackClusters: string[];
  cascadeImpactUsdPerHr: number;
  position3D: [number, number, number];
}

export interface InvisibleDependencyEdge {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceSilo: "ACCESS_CONTROL" | "HVAC_COOLING" | "UTILITY_POWER" | "BMS_CYBER" | "COMPUTE_RACK" | "TENANT_SLA";
  targetId: string;
  targetLabel: string;
  targetSilo: "ACCESS_CONTROL" | "HVAC_COOLING" | "UTILITY_POWER" | "BMS_CYBER" | "COMPUTE_RACK" | "TENANT_SLA";
  causalMechanism: string;
  propagationLagMin: number;
  activeInCascade: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface CBRERealEstateSite {
  id: string;
  name: string;
  market: string;
  coordinates: string;
  tier: "Tier IV Hyperscale" | "Tier III+ AI Factory";
  availablePowerMw: number;
  totalPowerMw: number;
  pue: number;
  floorLoadingLbsSqFt: number;
  liquidCoolingReady: boolean;
  leaseRatePerKwMonthUsd: number;
  substationRedundancy: string;
  cbreRecommendationScore: number;
  expansionFitReason: string;
  activeClustersCount: number;
  unstableRacksCount: number;
}

export interface ShiftHandoffEvent {
  id: string;
  timestamp: string;
  shift: "Night Shift A (00:00-08:00)" | "Day Shift B (08:00-16:00)" | "Swing Shift C (16:00-00:00)";
  author: string;
  role: string;
  severity: "CRITICAL_HANDOFF" | "AGENT_MITIGATED" | "HARDWARE_REPLACEMENT" | "SILO_WARNING";
  title: string;
  unstructuredNote: string;
  correlatedSensors: string[];
  cbreSiloLink: string;
  actionRequiredNextShift: string;
  acknowledged: boolean;
}

export interface DisasterScenario {
  id: string;
  name: string;
  sponsorTieIn: string;
  description: string;
  rootCauseSilo: string;
  affectedClusters: string[];
  unmitigatedSlaLossPerHr: number;
  timeToCascadeCriticalMin: number;
}

export const DISASTER_SCENARIOS: DisasterScenario[] = [
  {
    id: "chiller_badge_cascade",
    name: "Cooling Loop 2 Valve Drift + Unverified Contractor Badge-In",
    sponsorTieIn: "CBRE Invisible Network + NMC² Missed Shift Warning",
    description:
      "Contractor badged into Mechanical Mezzanine M2 during shift change and left CRAH-02 secondary bypass valve at 38% manual override. Coolant flow to Cluster B (Blackwell B200 Liquid Pods) is dropping 1.8 L/min, causing rapid thermal runaway and threatening a $68,000/hr CoreWeave/OpenAI Tenant SLA breach.",
    rootCauseSilo: "Access Control (Badge #4491) -> HVAC Chiller Loop 2 -> Rack Cluster B & C -> Tenant SLA #TX-902",
    affectedClusters: ["CLUSTER-B", "CLUSTER-C"],
    unmitigatedSlaLossPerHr: 68400,
    timeToCascadeCriticalMin: 18,
  },
  {
    id: "bms_zeroday_voltage",
    name: "Zero-Day BMS Modbus Spoofing + PDU-B Harmonic Voltage Ripple",
    sponsorTieIn: "CBRE Page 3 Zero-Day Control Attack + Hardware Replacement Clustering",
    description:
      "Spoofed BACnet/Modbus telemetry on Building Management System masks a 48V busway harmonic ripple on Substation Feeder B2. Rectifier shelves in Cluster C & D are experiencing capacitor degradation and silent ECC memory errors, requiring immediate cluster isolation and 6 rack PSU/blade replacements.",
    rootCauseSilo: "BMS Control Network -> Substation PDU-B2 -> Cluster C & D Rectifiers -> Sovereign AI Lease SLA",
    affectedClusters: ["CLUSTER-C", "CLUSTER-D"],
    unmitigatedSlaLossPerHr: 94200,
    timeToCascadeCriticalMin: 12,
  },
  {
    id: "grid_substation_brownout",
    name: "ERCOT Substation Transformer Sag + High-Density CapEx Overload",
    sponsorTieIn: "CBRE Portfolio Real Estate Capacity + NVIDIA Workload Migration",
    description:
      "Ambient 104°F Texas grid surge drops Utility Transformer T-1 capacity by 22% while Cluster A & B run 115kW/rack LLM pre-training. Requires immediate dynamic workload throttling + CBRE real-estate expansion analysis to offload 18MW of Blackwell clusters to Hillsboro or Ashburn.",
    rootCauseSilo: "Utility Grid Feeder T-1 -> Main Switchgear -> Cluster A & B Thermal/Power Cap -> CBRE Site Expansion",
    affectedClusters: ["CLUSTER-A", "CLUSTER-B"],
    unmitigatedSlaLossPerHr: 112000,
    timeToCascadeCriticalMin: 14,
  },
];

// Generate realistic 32-rack data hall across 4 GPU Compute Clusters (A, B, C, D)
export function generateInitialDataCenterState(
  scenarioId: string = "chiller_badge_cascade",
  timeOffsetMin: number = 0,
  nemotronMitigated: boolean = false
): {
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  sites: CBRERealEstateSite[];
  shiftEvents: ShiftHandoffEvent[];
} {
  const clusters = [
    {
      id: "CLUSTER-A",
      name: "Cluster Alpha (LLM Frontier Training)",
      rowBase: 0,
      colBase: 0,
      arch: "Blackwell B200 Liquid" as const,
      crah: "CRAH-01",
      pdu: "PDU-A1",
      zone: "ZONE-SEC-1",
      lease: "LEASE-ANTH-01",
      tenant: "Frontier AI Lab (16MW Dedicated Lease)",
      slaUsd: 32000,
      workload: "Nemotron-4 340B Distributed Pre-Training",
    },
    {
      id: "CLUSTER-B",
      name: "Cluster Bravo (Liquid-Cooled Inference Mesh)",
      rowBase: 0,
      colBase: 4,
      arch: "Blackwell B200 Liquid" as const,
      crah: "CRAH-02",
      pdu: "PDU-A2",
      zone: "ZONE-MECH-2",
      lease: "LEASE-HYP-02",
      tenant: "Hyperscale Cloud Tenant #2 (SLA Tier-0)",
      slaUsd: 44000,
      workload: "Multi-Modal Real-Time Inference Cluster",
    },
    {
      id: "CLUSTER-C",
      name: "Cluster Charlie (Legacy H200 Hybrid Pod)",
      rowBase: 2,
      colBase: 0,
      arch: "Hopper H200 Hybrid" as const,
      crah: "CRAH-02",
      pdu: "PDU-B1",
      zone: "ZONE-MECH-2",
      lease: "LEASE-FIN-03",
      tenant: "Global Quant & Sovereign Cloud Tenant",
      slaUsd: 28500,
      workload: "High-Frequency Risk & Rag Pipeline",
    },
    {
      id: "CLUSTER-D",
      name: "Cluster Delta (Autonomous Simulation Pod)",
      rowBase: 2,
      colBase: 4,
      arch: "Grace Hopper GH200" as const,
      crah: "CRAH-03",
      pdu: "PDU-B2",
      zone: "ZONE-SEC-4",
      lease: "LEASE-BIO-04",
      tenant: "BioCompute & Digital Twin Consortium",
      slaUsd: 24000,
      workload: "Molecular Dynamics & Omniverse Physics",
    },
  ];

  const timeFactor = Math.max(0, timeOffsetMin / 30); // 0 at T+0, 1 at T+30m, 2 at T+60m
  const mitigationDampener = nemotronMitigated ? 0.18 : 1.0;

  const racks: RackNode[] = [];

  clusters.forEach((cluster, cIdx) => {
    for (let i = 0; i < 8; i++) {
      const localRow = Math.floor(i / 4);
      const localCol = i % 4;
      const globalRow = cluster.rowBase + localRow;
      const globalCol = cluster.colBase + localCol;

      // 3D coordinates in the Data Hall
      const x = (globalCol - 3.5) * 2.4;
      const z = (globalRow - 1.5) * 3.6;

      const rackNum = cIdx * 8 + i + 1;
      const rackId = `RACK-${String(rackNum).padStart(2, "0")}`;

      // Deterministic seed per rack
      const seed = ((rackNum * 37) % 100) / 100;

      // Determine how affected this rack is by the active scenario
      const isClusterB = cluster.id === "CLUSTER-B";
      const isClusterC = cluster.id === "CLUSTER-C";
      const isClusterD = cluster.id === "CLUSTER-D";
      const isClusterA = cluster.id === "CLUSTER-A";

      let thermalSpike = 0;
      let rippleSpike = 0;
      let flowDrop = 0;

      if (scenarioId === "chiller_badge_cascade") {
        if (isClusterB) {
          thermalSpike = (16 + i * 2.4 + timeFactor * 18) * mitigationDampener;
          flowDrop = (14 + i * 1.5 + timeFactor * 12) * mitigationDampener;
        } else if (isClusterC && i >= 4) {
          thermalSpike = (11 + (i - 3) * 2.2 + timeFactor * 14) * mitigationDampener;
          flowDrop = (9 + timeFactor * 10) * mitigationDampener;
        }
      } else if (scenarioId === "bms_zeroday_voltage") {
        if (isClusterC || (isClusterD && i < 5)) {
          rippleSpike = (68 + i * 9 + timeFactor * 45) * mitigationDampener;
          thermalSpike = (9 + i * 1.6 + timeFactor * 11) * mitigationDampener;
        }
      } else if (scenarioId === "grid_substation_brownout") {
        if (isClusterA || isClusterB) {
          thermalSpike = (14 + i * 1.9 + timeFactor * 16) * mitigationDampener;
          rippleSpike = (42 + i * 6 + timeFactor * 30) * mitigationDampener;
        }
      }

      // Specific chronic hardware replacement candidates (for NMC² & CBRE CapEx replacement clustering)
      const isChronicHardwareFault =
        rackId === "RACK-11" ||
        rackId === "RACK-12" ||
        rackId === "RACK-19" ||
        rackId === "RACK-20" ||
        rackId === "RACK-27";

      if (isChronicHardwareFault) {
        rippleSpike += nemotronMitigated ? 28 : 54;
        thermalSpike += nemotronMitigated ? 5 : 11;
      }

      const coolantTempC = Number((28.5 + seed * 3.2 + thermalSpike * 0.85).toFixed(1));
      const inletTempC = Number((22.0 + seed * 2.5 + thermalSpike * 0.55).toFixed(1));
      const maxPowerKw = cluster.arch === "Blackwell B200 Liquid" ? 120 : 85;
      const basePower = maxPowerKw * (0.72 + seed * 0.18);
      const powerDrawKw = Number(
        (nemotronMitigated && (thermalSpike > 5 || isChronicHardwareFault)
          ? basePower * 0.58
          : Math.min(maxPowerKw * 1.06, basePower + thermalSpike * 0.7)
        ).toFixed(1)
      );
      const voltageRippleMv = Number((14 + seed * 11 + rippleSpike).toFixed(1));
      const vibrationMmS = Number((0.8 + seed * 0.9 + (isChronicHardwareFault ? 3.4 : 0) + thermalSpike * 0.08).toFixed(2));
      const coolantFlowLpm = Number(Math.max(8, 42 - flowDrop - (isChronicHardwareFault ? 9 : 0)).toFixed(1));

      // Compute multi-variate health score (0-100)
      const rawHealth =
        100 -
        Math.max(0, coolantTempC - 32) * 2.1 -
        Math.max(0, voltageRippleMv - 30) * 0.42 -
        Math.max(0, 35 - coolantFlowLpm) * 1.15 -
        (isChronicHardwareFault ? 18 : 0);
      const healthScore = Math.max(8, Math.min(99, Math.round(rawHealth)));

      // Unsupervised Spectral / Density Cluster Assignment
      let stabilityCluster: StabilityClusterType = "HEALTHY_OPTIMAL";
      if (healthScore < 42 || (coolantTempC > 49 && !nemotronMitigated)) {
        stabilityCluster = "CRITICAL_SLA_BREACH";
      } else if (isChronicHardwareFault && coolantFlowLpm < 30) {
        stabilityCluster = "COOLING_MICRO_LEAK_REPLACE";
      } else if (voltageRippleMv > 55 || isChronicHardwareFault) {
        stabilityCluster = "POWER_RIPPLE_DEGRADED";
      } else if (coolantTempC > 38) {
        stabilityCluster = "THERMAL_CASCADE_RISK";
      }

      const replacementRecommended =
        isChronicHardwareFault || stabilityCluster === "POWER_RIPPLE_DEGRADED" || stabilityCluster === "COOLING_MICRO_LEAK_REPLACE";

      let replacementUrgency: RackNode["replacementUrgency"] = "NONE";
      if (replacementRecommended && healthScore < 52) {
        replacementUrgency = "IMMEDIATE_SWAP";
      } else if (replacementRecommended) {
        replacementUrgency = "NEXT_MAINTENANCE_WINDOW";
      } else if (healthScore < 75) {
        replacementUrgency = "MONITOR";
      }

      let replacementDiagnosis = "All 8 GPU trays & manifold sensors operating within nominal telemetry envelope.";
      if (rackId === "RACK-11" || rackId === "RACK-12") {
        replacementDiagnosis =
          "Quick-disconnect liquid manifold seal degradation + Tray U4 NVLink thermal interface pump-out. Replace manifold & re-seat HGX B200 blade U4.";
      } else if (rackId === "RACK-19" || rackId === "RACK-20") {
        replacementDiagnosis =
          "48V busbar rectifier shelf #2 MOSFET harmonic fatigue (82mV ripple) causing HBM3e single-bit ECC spikes on Trays U2 & U6. Replace PSU shelf + Blade U6.";
      } else if (rackId === "RACK-27") {
        replacementDiagnosis =
          "Impeller bearing cavitation (4.6 mm/s vibration) on in-rack CDU pump + aged VRM bank. Schedule full CDU & blade module swap.";
      } else if (stabilityCluster === "THERMAL_CASCADE_RISK" || stabilityCluster === "CRITICAL_SLA_BREACH") {
        replacementDiagnosis =
          "External facility cooling cascade from CRAH-02 valve drop; hardware intact if workload drained within 15 min before silicon thermal degradation.";
      }

      const predictedTimeToFailureMin =
        healthScore < 45
          ? Math.max(4, Math.round(18 - timeOffsetMin * 0.4))
          : healthScore < 72
          ? Math.max(12, Math.round(44 - timeOffsetMin * 0.5))
          : null;

      // Generate 8 blades per rack
      const blades: BladeUnit[] = Array.from({ length: 8 }, (_, bIdx) => {
        const uSlot = bIdx + 1;
        const isFaultyBlade =
          (replacementRecommended && (uSlot === 4 || uSlot === 6 || uSlot === 8)) ||
          (healthScore < 50 && uSlot === 2);
        const bladeTemp = Number((coolantTempC + 14 + (isFaultyBlade ? 16 : (bIdx % 3) * 2.3)).toFixed(1));
        const bladeHealth = Math.max(12, Math.min(99, healthScore - (isFaultyBlade ? 26 : 0) + (bIdx % 2) * 3));
        return {
          uSlot,
          model:
            uSlot === 5
              ? "NVLink Switch Tray"
              : uSlot === 8
              ? "Rectifier PSU Shelf"
              : cluster.arch === "Blackwell B200 Liquid"
              ? "NVIDIA HGX B200 (8x GPU)"
              : "NVIDIA HGX H200 (8x GPU)",
          tempC: bladeTemp,
          powerKw: Number((powerDrawKw / 8 + (isFaultyBlade ? 1.8 : 0)).toFixed(1)),
          psuRippleMv: Number((voltageRippleMv * (isFaultyBlade ? 1.35 : 0.9)).toFixed(1)),
          eccErrorsPerHr: isFaultyBlade ? 48 : healthScore < 65 ? 9 : 0,
          healthScore: bladeHealth,
          needsReplacement: isFaultyBlade,
          failureReason: isFaultyBlade
            ? uSlot === 8
              ? "48V Busbar Rectifier Capacitor Breakdown"
              : "Cold-Plate Micro-Channel Occlusion & HBM3e ECC Surge"
            : undefined,
        };
      });

      racks.push({
        id: rackId,
        label: `${rackId} (${cluster.id.replace("CLUSTER-", "")}${i + 1})`,
        clusterId: cluster.id,
        clusterName: cluster.name,
        row: globalRow,
        col: globalCol,
        position3D: [x, 0, z],
        gpuArchitecture: cluster.arch,
        stabilityCluster,
        clusterConfidence: Number((0.89 + (rackNum % 9) * 0.01).toFixed(2)),
        inletTempC,
        coolantTempC,
        powerDrawKw,
        maxPowerKw,
        voltageRippleMv,
        vibrationMmS,
        coolantFlowLpm,
        utilizationPct: nemotronMitigated && healthScore < 70 ? 35 : Math.min(99, Math.round(78 + seed * 20)),
        healthScore,
        predictedTimeToFailureMin,
        replacementRecommended,
        replacementUrgency,
        replacementDiagnosis,
        estimatedReplacementCostUsd: replacementRecommended ? 48500 : 0,
        crahUnitId: cluster.crah,
        pduFeedId: cluster.pdu,
        accessZoneId: cluster.zone,
        tenantLeaseId: cluster.lease,
        tenantName: cluster.tenant,
        slaPenaltyPerHourUsd: Math.round(cluster.slaUsd / 4),
        activeWorkload:
          nemotronMitigated && (isClusterB || isChronicHardwareFault)
            ? "MIGRATED -> Cluster Alpha / Hillsboro DR"
            : cluster.workload,
        blades,
      });
    }
  });

  // CBRE Facility & Invisible Network Nodes
  const facilityNodes: CBREFacilityNode[] = [
    {
      id: "ACCESS-MECH-M2",
      name: "Badge Access Control: Mechanical Mezzanine M2",
      category: "ACCESS_CONTROL",
      status: nemotronMitigated ? "NOMINAL" : "WARNING",
      metricLabel: "Last Contractor Badge-In",
      metricValue: "Badge #4491 (23m ago - No Shift Sign-Off)",
      anomalyDetail:
        "HVAC Vendor badged into Chiller Loop 2 room 14 mins before Shift A handoff; manual valve override left engaged.",
      connectedRackClusters: ["CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: 68400,
      position3D: [-11.5, 1.2, -3.5],
    },
    {
      id: "CRAH-02",
      name: "CRAH-02 Primary Liquid Chiller Loop",
      category: "HVAC_COOLING",
      status: nemotronMitigated ? "WARNING" : "FAILING",
      metricLabel: "Secondary Loop Flow / Delta-T",
      metricValue: nemotronMitigated ? "39.4 L/min (Aux Valve Engaged)" : `${Math.max(14, Number((24.2 - timeFactor * 6).toFixed(1)))} L/min (+11.4°C Drift)`,
      anomalyDetail:
        "Bypass valve position mismatch causing starvation across Row 1-2 manifolds serving RACK-09 through RACK-20.",
      connectedRackClusters: ["CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: 72500,
      position3D: [0, 1.6, -7.2],
    },
    {
      id: "PDU-B1",
      name: "Substation Feeder B1 & 48V Busway",
      category: "UTILITY_POWER",
      status: scenarioId === "bms_zeroday_voltage" && !nemotronMitigated ? "COMPROMISED" : "WARNING",
      metricLabel: "Total Harmonic Distortion (THD)",
      metricValue: nemotronMitigated ? "2.1% THD (Filtered)" : "8.7% THD / 78mV Ripple",
      anomalyDetail:
        "Switching harmonic resonance accelerating PSU rectifier aging in RACK-19 & RACK-20.",
      connectedRackClusters: ["CLUSTER-C", "CLUSTER-D"],
      cascadeImpactUsdPerHr: 52500,
      position3D: [11.5, 1.2, 2.5],
    },
    {
      id: "LEASE-SLA-PORTFOLIO",
      name: "CBRE Master Lease & Tenant SLA Vault",
      category: "TENANT_LEASE_SLA",
      status: nemotronMitigated ? "NOMINAL" : "FAILING",
      metricLabel: "Active SLA Exposure",
      metricValue: nemotronMitigated ? "$0/hr (Protected)" : `$${Math.round(68400 * (1 + timeFactor * 0.65)).toLocaleString()}/hr Penalty Risk`,
      anomalyDetail:
        "Clause 14.2 of Hyperscale Lease #HYP-02 triggers $44,000/hr penalty if inlet liquid exceeds 42°C for >15 consecutive minutes.",
      connectedRackClusters: ["CLUSTER-A", "CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: 96000,
      position3D: [0, 2.2, 7.2],
    },
  ];

  // Causal Dependency Edges (CBRE "Invisible Network")
  const dependencyEdges: InvisibleDependencyEdge[] = [
    {
      id: "EDGE-1",
      sourceId: "ACCESS-MECH-M2",
      sourceLabel: "Contractor Badge #4491 (Mech Room M2)",
      sourceSilo: "ACCESS_CONTROL",
      targetId: "CRAH-02",
      targetLabel: "CRAH-02 Chiller Bypass Valve",
      targetSilo: "HVAC_COOLING",
      causalMechanism: "Unclosed manual test bypass after physical room entry during shift turnover",
      propagationLagMin: 6,
      activeInCascade: !nemotronMitigated,
      severity: "CRITICAL",
    },
    {
      id: "EDGE-2",
      sourceId: "CRAH-02",
      sourceLabel: "CRAH-02 Chiller Loop Starvation",
      sourceSilo: "HVAC_COOLING",
      targetId: "CLUSTER-B",
      targetLabel: "Cluster Bravo (Racks 09–16 B200 Liquid)",
      targetSilo: "COMPUTE_RACK",
      causalMechanism: "Manifold flow drop below 24 L/min triggers GPU cold-plate boiling & thermal throttling",
      propagationLagMin: 9,
      activeInCascade: !nemotronMitigated,
      severity: "CRITICAL",
    },
    {
      id: "EDGE-3",
      sourceId: "PDU-B1",
      sourceLabel: "Substation Feeder PDU-B1 Harmonic Ripple",
      sourceSilo: "UTILITY_POWER",
      targetId: "CLUSTER-C",
      targetLabel: "Cluster Charlie (Racks 19–20 PSU Failure)",
      targetSilo: "COMPUTE_RACK",
      causalMechanism: "82mV DC ripple degrades rectifier capacitors -> HBM3e ECC memory errors",
      propagationLagMin: 12,
      activeInCascade: true,
      severity: "HIGH",
    },
    {
      id: "EDGE-4",
      sourceId: "CLUSTER-B",
      sourceLabel: "Cluster Bravo & Charlie Instability",
      sourceSilo: "COMPUTE_RACK",
      targetId: "LEASE-SLA-PORTFOLIO",
      targetLabel: "CBRE Hyperscale Tenant SLA #HYP-02",
      targetSilo: "TENANT_SLA",
      causalMechanism: "99.999% uptime & thermal envelope covenant breach ($68,400/hr penalty + termination right)",
      propagationLagMin: 15,
      activeInCascade: !nemotronMitigated,
      severity: "CRITICAL",
    },
  ];

  // CBRE Real Estate Portfolio & Expansion Sites
  const sites: CBRERealEstateSite[] = [
    {
      id: "SITE-DFW-1",
      name: "DFW-North Hyperscale AI Campus (Current Facility)",
      market: "Dallas-Fort Worth, TX (ERCOT)",
      coordinates: "33.0198° N, 96.6989° W",
      tier: "Tier IV Hyperscale",
      availablePowerMw: 3.2,
      totalPowerMw: 48.0,
      pue: 1.24,
      floorLoadingLbsSqFt: 350,
      liquidCoolingReady: true,
      leaseRatePerKwMonthUsd: 168,
      substationRedundancy: "2N Dual ERCOT 138kV Feeders",
      cbreRecommendationScore: 71,
      expansionFitReason:
        "93.3% power utilization. 5 racks (RACK-11, 12, 19, 20, 27) flagged for immediate modular replacement; any net-new >5MW cluster expansion requires adjacent CBRE land parcel or DR offload.",
      activeClustersCount: 4,
      unstableRacksCount: racks.filter((r) => r.healthScore < 70).length,
    },
    {
      id: "SITE-PDX-2",
      name: "CBRE Hillsboro Clean-Grid AI Factory (Expansion Target #1)",
      market: "Hillsboro / Portland, OR (WECC Hydro)",
      coordinates: "45.5229° N, 122.9898° W",
      tier: "Tier III+ AI Factory",
      availablePowerMw: 34.0,
      totalPowerMw: 60.0,
      pue: 1.11,
      floorLoadingLbsSqFt: 500,
      liquidCoolingReady: true,
      leaseRatePerKwMonthUsd: 142,
      substationRedundancy: "2N+1 Direct Hydro Substation (130kW/rack rated)",
      cbreRecommendationScore: 96,
      expansionFitReason:
        "Optimal CBRE expansion match: 34MW immediate turn-key liquid-cooled capacity, 15% lower $/kW lease rate, and 500 lbs/sq.ft slab built for NVIDIA GB200 NVL72 clusters.",
      activeClustersCount: 2,
      unstableRacksCount: 0,
    },
    {
      id: "SITE-IAD-3",
      name: "CBRE Ashburn Sovereign Cloud Annex (Low-Latency Target #2)",
      market: "Northern Virginia (PJM Grid)",
      coordinates: "39.0438° N, 77.4874° W",
      tier: "Tier IV Hyperscale",
      availablePowerMw: 14.5,
      totalPowerMw: 80.0,
      pue: 1.18,
      floorLoadingLbsSqFt: 420,
      liquidCoolingReady: true,
      leaseRatePerKwMonthUsd: 185,
      substationRedundancy: "2N Dominion 230kV Loop",
      cbreRecommendationScore: 88,
      expansionFitReason:
        "Sub-2ms fiber peering to East Coast financial tenants; ideal secondary failover site for Cluster Charlie Sovereign AI workloads.",
      activeClustersCount: 6,
      unstableRacksCount: 1,
    },
  ];

  // NorthMark Compute & Cloud (NMC²) Zero-Drop Shift Handoff Log
  const shiftEvents: ShiftHandoffEvent[] = [
    {
      id: "SHIFT-EV-1",
      timestamp: "22:42 CST (18m before Shift Change)",
      shift: "Swing Shift C (16:00-00:00)",
      author: "Marcus Vance (Facilities Tech II)",
      role: "Physical Mechanical Ops",
      severity: "SILO_WARNING",
      title: "Unstructured Shift Log: 'Tested CRAH-02 Secondary Loop Bypass'",
      unstructuredNote:
        "\"Vendor from Apex Mechanical badged into M2 to bleed air from CRAH-02 secondary manifold. Left bypass valve at ~35-40% while waiting for pressure gauge to settle. Need Night Shift to verify before Cluster B ramps up.\"",
      correlatedSensors: ["ACCESS-MECH-M2 (Badge #4491)", "CRAH-02 Flow (-16.2 L/min)", "RACK-11 & RACK-12 Coolant (46.8°C)"],
      cbreSiloLink: "Connected Access Control Log + Unstructured Note + Tenant SLA #HYP-02",
      actionRequiredNextShift:
        "Close CRAH-02 manual bypass valve in Mech Room M2 & inspect RACK-11/RACK-12 quick-disconnect seals.",
      acknowledged: nemotronMitigated,
    },
    {
      id: "SHIFT-EV-2",
      timestamp: "23:05 CST (Current Shift Window)",
      shift: "Night Shift A (00:00-08:00)",
      author: "NVIDIA Nemotron Autonomous Sentinel",
      role: "Multi-Agent ReAct Orchestrator",
      severity: nemotronMitigated ? "AGENT_MITIGATED" : "CRITICAL_HANDOFF",
      title: "Cross-Silo Cascade Detected: 18 Mins to $68,400/hr SLA Breach",
      unstructuredNote:
        "Nemotron correlated Marcus's shift note with a 1.8°C/min thermal rise on Cluster B (Racks 09–16) and harmonic voltage ripple on Cluster C (Racks 19–20). Without intervention, Tenant Lease #HYP-02 breaches in 18 minutes.",
      correlatedSensors: ["Cluster B Thermal Drift", "PDU-B1 82mV Ripple", "CBRE Lease Clause 14.2"],
      cbreSiloLink: "Full 4-Layer Causal Graph (Access -> HVAC -> Rack Cluster -> Real Estate Lease)",
      actionRequiredNextShift:
        "Approve or review Nemotron Autonomous Mitigation Plan: Drain RACK-11, 12, 19, 20 workloads, actuate Aux Chiller Valve, and stage 5 replacement blade/PSU kits.",
      acknowledged: nemotronMitigated,
    },
    {
      id: "SHIFT-EV-3",
      timestamp: "23:12 CST (Hardware Lifecycle Queue)",
      shift: "Night Shift A (00:00-08:00)",
      author: "NMC² Predictive Fleet Clustering Engine",
      role: "Hardware Reliability Automation",
      severity: "HARDWARE_REPLACEMENT",
      title: "5 Racks Clustered for Physical Module Replacement (Bay Staging Ready)",
      unstructuredNote:
        "Spectral clustering isolated RACK-11, RACK-12 (Manifold Seal + Blade U4), RACK-19, RACK-20 (48V Rectifier Shelf + Blade U6), and RACK-27 (CDU Pump Bearing) from transient thermal noise.",
      correlatedSensors: ["RACK-11/12 Flow Sensor", "RACK-19/20 82mV Ripple & 48 ECC/hr", "RACK-27 4.6mm/s Vibration"],
      cbreSiloLink: "CapEx Replacement ($242.5K) vs. CBRE Hillsboro OR Site Expansion Analysis",
      actionRequiredNextShift:
        "Pull pre-staged HGX B200/H200 spares from Cage 4 and execute hot-swap on RACK-11, 12, 19, 20, 27 after workload drain completes.",
      acknowledged: false,
    },
  ];

  return { racks, facilityNodes, dependencyEdges, sites, shiftEvents };
}

