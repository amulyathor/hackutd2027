// ============================================================================
// NEXUSDC — SINGLE SOURCE OF TRUTH DATA CENTER TWIN & CAUSAL STATE ENGINE
// Synchronizes SLA Exposure, Time-to-Cascade, Blade-to-Rack Aggregates,
// CBRE Cross-Silo Dependencies, and NMC² Shift Handoff State.
// ============================================================================

export type StabilityClusterType =
  | "HEALTHY_OPTIMAL"
  | "TRANSIENT_THERMAL_DRIFT"
  | "HARDWARE_SWAP_REQUIRED";

export type HandoffSignoffState = "PENDING" | "VERIFIED" | "SIGNED";

export interface BladeUnit {
  uSlot: number; // 1U to 8U
  model:
    | "NVIDIA HGX B200 (8x GPU)"
    | "NVIDIA HGX H200 (8x GPU)"
    | "NVLink Switch Tray"
    | "Rectifier PSU Shelf";
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
  gpuArchitecture:
    | "Blackwell B200 Liquid"
    | "Hopper H200 Hybrid"
    | "Grace Hopper GH200";
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
  totalEccErrorsPerHr: number;
  healthScore: number; // Derived from blades & manifold telemetry
  predictedTimeToFailureMin: number | null;
  replacementRecommended: boolean;
  replacementUrgency:
    | "IMMEDIATE_SWAP"
    | "NEXT_MAINTENANCE_WINDOW"
    | "MONITOR"
    | "NONE";
  replacementDiagnosis: string;
  estimatedReplacementCostUsd: number;
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
  category:
    | "HVAC_COOLING"
    | "UTILITY_POWER"
    | "ACCESS_CONTROL"
    | "TENANT_LEASE_SLA";
  status: "NOMINAL" | "WARNING" | "FAILING";
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
  sourceSilo:
    | "ACCESS_CONTROL"
    | "HVAC_COOLING"
    | "UTILITY_POWER"
    | "COMPUTE_RACK"
    | "TENANT_SLA";
  targetId: string;
  targetLabel: string;
  targetSilo:
    | "ACCESS_CONTROL"
    | "HVAC_COOLING"
    | "UTILITY_POWER"
    | "COMPUTE_RACK"
    | "TENANT_SLA";
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
  shift:
    | "Night Shift A (00:00-08:00)"
    | "Day Shift B (08:00-16:00)"
    | "Swing Shift C (16:00-00:00)";
  author: string;
  role: string;
  severity:
    | "CRITICAL_HANDOFF"
    | "AGENT_MITIGATED"
    | "HARDWARE_REPLACEMENT"
    | "SILO_WARNING";
  title: string;
  unstructuredNote: string;
  correlatedSensors: string[];
  cbreSiloLink: string;
  actionRequiredNextShift: string;
}

export interface DisasterScenario {
  id: string;
  name: string;
  shortName: string;
  description: string;
  rootCauseSilo: string;
  affectedClusters: string[];
  baseSlaLossPerHrUsd: number;
  baseCascadeWindowMin: number;
}

export interface SynchronizedMetrics {
  baseSlaPerHrUsd: number;
  activeSlaExposurePerHrUsd: number;
  savedSlaPerHrUsd: number;
  horizonOffsetMin: number;
  remainingTimeToCascadeMin: number;
  flaggedHardwareSwapsCount: number;
  flaggedSwapRackIds: string[];
  transientDriftRacksCount: number;
  healthyRacksCount: number;
  dfwUsedPowerMw: number;
  dfwTotalPowerMw: number;
  dfwAvailableMarginMw: number;
  dfwUtilizationPct: number;
}

export const DISASTER_SCENARIOS: DisasterScenario[] = [
  {
    id: "chiller_badge_cascade",
    name: "CRAH-02 Bypass Drift + Contractor Badge-In",
    shortName: "Cooling Loop Drift",
    description:
      "Contractor badged into Mechanical Room M2 prior to shift change and left CRAH-02 bypass valve at 38% manual override. Coolant starvation across Cluster B & C risks thermal throttling and tenant SLA breach.",
    rootCauseSilo:
      "Access Control (Badge #4491) → HVAC Loop CRAH-02 → Rack Clusters B & C → Tenant Lease #HYP-02",
    affectedClusters: ["CLUSTER-B", "CLUSTER-C"],
    baseSlaLossPerHrUsd: 68400,
    baseCascadeWindowMin: 30,
  },
  {
    id: "bms_zeroday_voltage",
    name: "BMS Telemetry Spoof + Substation Harmonic Ripple",
    shortName: "Substation Voltage Ripple",
    description:
      "Spoofed Modbus telemetry on Building Management System masks a 48V busway harmonic ripple on Feeder PDU-B1. Rectifier shelves in Cluster C & D experience capacitor fatigue and HBM3e ECC memory errors.",
    rootCauseSilo:
      "BMS Control Silo → Substation Feeder PDU-B1 → Clusters C & D PSU Shelves → Sovereign AI SLA",
    affectedClusters: ["CLUSTER-C", "CLUSTER-D"],
    baseSlaLossPerHrUsd: 94200,
    baseCascadeWindowMin: 26,
  },
  {
    id: "grid_substation_brownout",
    name: "ERCOT Transformer Sag + High-Density CapEx Overload",
    shortName: "Grid Transformer Sag",
    description:
      "Ambient grid surge drops Utility Transformer T-1 capacity by 22% while Clusters A & B run 115kW/rack pre-training. Requires immediate dynamic workload throttling and CBRE site expansion offload.",
    rootCauseSilo:
      "Utility Substation T-1 → Main Switchgear → Clusters A & B Power Cap → CBRE Site Expansion",
    affectedClusters: ["CLUSTER-A", "CLUSTER-B"],
    baseSlaLossPerHrUsd: 112000,
    baseCascadeWindowMin: 24,
  },
];

// Compute synchronized SLA & countdown metrics from scenario + horizon scrubber
export function computeSynchronizedMetrics(
  scenario: DisasterScenario,
  timeOffsetMin: number,
  nemotronMitigated: boolean,
  racks: RackNode[]
): SynchronizedMetrics {
  // Escalates linearly by 1.5% per minute of unmitigated horizon progression
  const escalatedSla = Math.round(
    scenario.baseSlaLossPerHrUsd * (1 + timeOffsetMin * 0.015)
  );
  const activeSlaExposurePerHrUsd = nemotronMitigated ? 0 : escalatedSla;
  const savedSlaPerHrUsd = nemotronMitigated ? escalatedSla : 0;

  const remainingTimeToCascadeMin = Math.max(
    2,
    scenario.baseCascadeWindowMin - timeOffsetMin
  );

  const swapRacks = racks.filter((r) => r.replacementRecommended);
  const transientRacks = racks.filter(
    (r) => r.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
  );
  const healthyRacks = racks.filter(
    (r) => r.stabilityCluster === "HEALTHY_OPTIMAL"
  );

  const dfwTotalPowerMw = 48.0;
  const dfwUsedPowerMw = nemotronMitigated ? 41.6 : 44.8;
  const dfwAvailableMarginMw = Number(
    (dfwTotalPowerMw - dfwUsedPowerMw).toFixed(1)
  );
  const dfwUtilizationPct = Number(
    ((dfwUsedPowerMw / dfwTotalPowerMw) * 100).toFixed(1)
  );

  return {
    baseSlaPerHrUsd: scenario.baseSlaLossPerHrUsd,
    activeSlaExposurePerHrUsd,
    savedSlaPerHrUsd,
    horizonOffsetMin: timeOffsetMin,
    remainingTimeToCascadeMin,
    flaggedHardwareSwapsCount: swapRacks.length,
    flaggedSwapRackIds: swapRacks.map((r) => r.id),
    transientDriftRacksCount: transientRacks.length,
    healthyRacksCount: healthyRacks.length,
    dfwUsedPowerMw,
    dfwTotalPowerMw,
    dfwAvailableMarginMw,
    dfwUtilizationPct,
  };
}

export function generateInitialDataCenterState(
  scenarioId: string = "chiller_badge_cascade",
  timeOffsetMin: number = 12,
  nemotronMitigated: boolean = false,
  swappedRacks: Record<string, boolean> = {}
): {
  scenario: DisasterScenario;
  metrics: SynchronizedMetrics;
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  sites: CBRERealEstateSite[];
  shiftEvents: ShiftHandoffEvent[];
} {
  const scenario =
    DISASTER_SCENARIOS.find((s) => s.id === scenarioId) ||
    DISASTER_SCENARIOS[0];

  const clusters = [
    {
      id: "CLUSTER-A",
      name: "Cluster Alpha (Frontier Training)",
      rowBase: 0,
      colBase: 0,
      arch: "Blackwell B200 Liquid" as const,
      crah: "CRAH-01",
      pdu: "PDU-A1",
      zone: "ZONE-SEC-1",
      lease: "LEASE-ANTH-01",
      tenant: "Frontier AI Lab (16MW Dedicated Lease)",
      workload: "Distributed Frontier Pre-Training",
    },
    {
      id: "CLUSTER-B",
      name: "Cluster Bravo (Liquid Inference Mesh)",
      rowBase: 0,
      colBase: 4,
      arch: "Blackwell B200 Liquid" as const,
      crah: "CRAH-02",
      pdu: "PDU-A2",
      zone: "ZONE-MECH-2",
      lease: "LEASE-HYP-02",
      tenant: "Hyperscale Cloud Tenant #2 (SLA Tier-0)",
      workload: "Low-Latency Multi-Modal Inference",
    },
    {
      id: "CLUSTER-C",
      name: "Cluster Charlie (H200 Hybrid Pod)",
      rowBase: 2,
      colBase: 0,
      arch: "Hopper H200 Hybrid" as const,
      crah: "CRAH-02",
      pdu: "PDU-B1",
      zone: "ZONE-MECH-2",
      lease: "LEASE-FIN-03",
      tenant: "Sovereign AI & Quant Compute Tenant",
      workload: "High-Frequency Risk & RAG Pipeline",
    },
    {
      id: "CLUSTER-D",
      name: "Cluster Delta (Simulation Pod)",
      rowBase: 2,
      colBase: 4,
      arch: "Grace Hopper GH200" as const,
      crah: "CRAH-03",
      pdu: "PDU-B2",
      zone: "ZONE-SEC-4",
      lease: "LEASE-BIO-04",
      tenant: "BioCompute & Digital Twin Consortium",
      workload: "Molecular Dynamics & Physics Twin",
    },
  ];

  const timeFactor = Math.max(0, timeOffsetMin / 30);
  const mitigationDampener = nemotronMitigated ? 0.15 : 1.0;

  // Pre-compute total synchronized SLA so per-rack SLA shares sum cleanly
  const currentTotalSlaPerHr = nemotronMitigated
    ? 0
    : Math.round(scenario.baseSlaLossPerHrUsd * (1 + timeOffsetMin * 0.015));

  const racks: RackNode[] = [];

  // Specific chronic hardware fault profiles (distinct per rack and per blade!)
  const hardwareFaultCatalog: Record<
    string,
    {
      faultySlots: Record<
        number,
        { reason: string; tempDelta: number; rippleMv: number; eccRate: number }
      >;
      urgency: "IMMEDIATE_SWAP" | "NEXT_MAINTENANCE_WINDOW";
      diagnosis: string;
      baseFlowPenalty: number;
      baseVibration: number;
    }
  > = {
    "RACK-11": {
      urgency: "IMMEDIATE_SWAP",
      baseFlowPenalty: 9.4,
      baseVibration: 3.1,
      diagnosis:
        "Quick-disconnect manifold seal occlusion on U4 + secondary cold-plate micro-channel restriction on U6. Replace manifold seal kit and HGX B200 Blade U4.",
      faultySlots: {
        4: {
          reason: "Manifold QD Seal Leak & Cold-Plate Starvation",
          tempDelta: 17.4,
          rippleMv: 44.2,
          eccRate: 38,
        },
        6: {
          reason: "HBM3e Thermal Throttling & Single-Bit ECC Surge",
          tempDelta: 12.8,
          rippleMv: 36.5,
          eccRate: 21,
        },
      },
    },
    "RACK-12": {
      urgency: "IMMEDIATE_SWAP",
      baseFlowPenalty: 8.2,
      baseVibration: 2.8,
      diagnosis:
        "Thermal interface material pump-out on HGX B200 Tray U2 + NVLink switch optical transceiver overheating on U5. Hot-swap Blade U2 & NVLink Tray U5.",
      faultySlots: {
        2: {
          reason: "GPU Die TIM Pump-Out (Hotspot ΔT +19°C)",
          tempDelta: 18.9,
          rippleMv: 39.1,
          eccRate: 31,
        },
        5: {
          reason: "NVLink Switch Optical Transceiver Lane Fault",
          tempDelta: 14.2,
          rippleMv: 41.8,
          eccRate: 17,
        },
      },
    },
    "RACK-19": {
      urgency: "IMMEDIATE_SWAP",
      baseFlowPenalty: 4.1,
      baseVibration: 3.6,
      diagnosis:
        "48V busbar rectifier shelf U8 capacitor breakdown (91mV ripple) inducing voltage droop and HBM3e ECC errors on Blade U6. Replace PSU Shelf U8 & Blade U6.",
      faultySlots: {
        6: {
          reason: "VRM Phase Droop & HBM3e Multi-Bit ECC Warning",
          tempDelta: 13.6,
          rippleMv: 76.4,
          eccRate: 46,
        },
        8: {
          reason: "48V Busbar Rectifier Capacitor Bank Failure",
          tempDelta: 16.5,
          rippleMv: 91.8,
          eccRate: 54,
        },
      },
    },
    "RACK-20": {
      urgency: "IMMEDIATE_SWAP",
      baseFlowPenalty: 3.8,
      baseVibration: 3.3,
      diagnosis:
        "Rectifier shelf U8 harmonic fatigue (84mV ripple) + PCIe Gen6 retimer lane degradation on Tray U3. Replace PSU Shelf U8 & HGX H200 Tray U3.",
      faultySlots: {
        3: {
          reason: "PCIe Gen6 Retimer Clock Jitter & ECC Spike",
          tempDelta: 11.9,
          rippleMv: 68.2,
          eccRate: 29,
        },
        8: {
          reason: "48V Rectifier Harmonic MOSFET Degradation",
          tempDelta: 15.1,
          rippleMv: 84.5,
          eccRate: 42,
        },
      },
    },
    "RACK-27": {
      urgency: "NEXT_MAINTENANCE_WINDOW",
      baseFlowPenalty: 7.5,
      baseVibration: 4.7,
      diagnosis:
        "In-rack CDU pump impeller bearing cavitation (4.7 mm/s vibration) causing localized flow oscillation on Tray U7. Schedule CDU pump & U7 cold-plate swap.",
      faultySlots: {
        7: {
          reason: "CDU Impeller Cavitation Flow Oscillation",
          tempDelta: 12.3,
          rippleMv: 34.8,
          eccRate: 14,
        },
      },
    },
  };

  clusters.forEach((cluster, cIdx) => {
    for (let i = 0; i < 8; i++) {
      const localRow = Math.floor(i / 4);
      const localCol = i % 4;
      const globalRow = cluster.rowBase + localRow;
      const globalCol = cluster.colBase + localCol;

      const x = (globalCol - 3.5) * 2.4;
      const z = (globalRow - 1.5) * 3.6;

      const rackNum = cIdx * 8 + i + 1;
      const rackId = `RACK-${String(rackNum).padStart(2, "0")}`;
      const isSwapped = Boolean(swappedRacks[rackId]);
      const faultProfile = isSwapped ? undefined : hardwareFaultCatalog[rackId];

      const isAffectedByScenario = scenario.affectedClusters.includes(
        cluster.id
      );

      // Deterministic per-rack variation
      const rackSeed = ((rackNum * 29 + 7) % 100) / 100;

      let scenarioThermalDrift = 0;
      let scenarioRippleDrift = 0;
      let scenarioFlowDrop = 0;

      if (isAffectedByScenario) {
        if (scenarioId === "chiller_badge_cascade") {
          scenarioThermalDrift =
            (9.5 + i * 1.35 + timeFactor * 11.5) * mitigationDampener;
          scenarioFlowDrop =
            (10.5 + i * 1.1 + timeFactor * 8.5) * mitigationDampener;
        } else if (scenarioId === "bms_zeroday_voltage") {
          scenarioRippleDrift =
            (38 + i * 5.2 + timeFactor * 26) * mitigationDampener;
          scenarioThermalDrift =
            (6.5 + i * 1.1 + timeFactor * 7.5) * mitigationDampener;
        } else if (scenarioId === "grid_substation_brownout") {
          scenarioThermalDrift =
            (8.2 + i * 1.25 + timeFactor * 10.2) * mitigationDampener;
          scenarioRippleDrift =
            (28 + i * 4.1 + timeFactor * 19) * mitigationDampener;
        }
      }

      const maxPowerKw = cluster.arch === "Blackwell B200 Liquid" ? 120 : 85;
      const baseRackCoolantC =
        27.8 + rackSeed * 2.4 + scenarioThermalDrift * 0.72;
      const baseRackRippleMv =
        13.5 + rackSeed * 6.5 + scenarioRippleDrift * 0.85;

      // Build 8 distinct blades with realistic vertical chassis thermal gradient & individual variance
      const blades: BladeUnit[] = Array.from({ length: 8 }, (_, bIdx) => {
        const uSlot = bIdx + 1;
        const slotFault = faultProfile?.faultySlots[uSlot];

        // Vertical heat rise + unique slot hash so NO TWO BLADES ever have identical numbers
        const slotHash = ((rackNum * 17 + uSlot * 31) % 19) - 9; // -9 to +9
        const elevationGradientC = uSlot * 0.65 + slotHash * 0.18;

        const bladeTempC = Number(
          (
            baseRackCoolantC +
            11.2 +
            elevationGradientC +
            (slotFault ? slotFault.tempDelta : 0)
          ).toFixed(1)
        );

        const nominalSlotPower =
          uSlot === 5
            ? maxPowerKw * 0.065
            : uSlot === 8
            ? maxPowerKw * 0.055
            : (maxPowerKw * 0.88) / 6;

        const throttleScale =
          nemotronMitigated && (Boolean(faultProfile) || isAffectedByScenario)
            ? 0.62
            : 0.84 + rackSeed * 0.12;

        const bladePowerKw = Number(
          (
            nominalSlotPower * throttleScale +
            slotHash * 0.11 +
            (slotFault ? 1.4 : 0)
          ).toFixed(1)
        );

        const bladeRippleMv = Number(
          (
            baseRackRippleMv +
            uSlot * 0.9 +
            slotHash * 0.45 +
            (slotFault ? slotFault.rippleMv : 0)
          ).toFixed(1)
        );

        // Realistic distinct ECC distribution per blade
        let eccErrorsPerHr = 0;
        if (slotFault) {
          eccErrorsPerHr = slotFault.eccRate;
        } else if (
          !nemotronMitigated &&
          isAffectedByScenario &&
          (uSlot === 3 || uSlot === 7) &&
          timeOffsetMin >= 12
        ) {
          eccErrorsPerHr = Math.max(1, Math.round((rackNum % 5) + uSlot - 2));
        }

        const rawBladeHealth =
          100 -
          Math.max(0, bladeTempC - 44) * 1.65 -
          Math.max(0, bladeRippleMv - 28) * 0.38 -
          eccErrorsPerHr * 0.45;

        const bladeHealth = Math.max(
          14,
          Math.min(99, Math.round(rawBladeHealth))
        );

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
          tempC: bladeTempC,
          powerKw: Math.max(2.1, bladePowerKw),
          psuRippleMv: Math.max(9.5, bladeRippleMv),
          eccErrorsPerHr,
          healthScore: bladeHealth,
          needsReplacement: Boolean(slotFault),
          failureReason: slotFault?.reason,
        };
      });

      // Derive rack aggregates directly from its 8 blades (Single Source of Truth)
      const powerDrawKw = Number(
        blades.reduce((acc, b) => acc + b.powerKw, 0).toFixed(1)
      );
      const avgBladeTempC =
        blades.reduce((acc, b) => acc + b.tempC, 0) / blades.length;
      const coolantTempC = Number((avgBladeTempC - 12.8).toFixed(1));
      const inletTempC = Number((coolantTempC - 6.2).toFixed(1));
      const voltageRippleMv = Number(
        Math.max(...blades.map((b) => b.psuRippleMv)).toFixed(1)
      );
      const totalEccErrorsPerHr = blades.reduce(
        (acc, b) => acc + b.eccErrorsPerHr,
        0
      );
      const minBladeHealth = Math.min(...blades.map((b) => b.healthScore));
      const avgBladeHealth =
        blades.reduce((acc, b) => acc + b.healthScore, 0) / blades.length;

      // Rack health weights worst blade (60%) + average blade health (40%)
      const healthScore = Math.round(minBladeHealth * 0.6 + avgBladeHealth * 0.4);

      const coolantFlowLpm = Number(
        Math.max(
          11.5,
          42.0 -
            scenarioFlowDrop -
            (faultProfile ? faultProfile.baseFlowPenalty : 0) -
            rackSeed * 1.8
        ).toFixed(1)
      );

      const vibrationMmS = Number(
        (
          0.75 +
          rackSeed * 0.55 +
          (faultProfile ? faultProfile.baseVibration : 0) +
          scenarioThermalDrift * 0.04
        ).toFixed(2)
      );

      // Strict 3-State Semantic Cluster Assignment (Green = Optimal, Amber = Transient Drift, Red = Hardware Swap Required)
      let stabilityCluster: StabilityClusterType = "HEALTHY_OPTIMAL";
      if (faultProfile) {
        stabilityCluster = "HARDWARE_SWAP_REQUIRED";
      } else if (
        !nemotronMitigated &&
        (isAffectedByScenario || coolantTempC > 36.5 || healthScore < 78)
      ) {
        stabilityCluster = "TRANSIENT_THERMAL_DRIFT";
      }

      const replacementRecommended = Boolean(faultProfile);
      const replacementUrgency: RackNode["replacementUrgency"] = faultProfile
        ? faultProfile.urgency
        : stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
        ? "MONITOR"
        : "NONE";

      const replacementDiagnosis = isSwapped
        ? "Module Hot-Swap Completed: New HGX Blade & 48V PSU Shelf Verified Nominal."
        : faultProfile
        ? faultProfile.diagnosis
        : stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
        ? "Transient facility cooling/voltage drift from upstream loop; hardware intact once loop is stabilized."
        : "All 8 server trays, manifold seals, and 48V busbars operating within nominal telemetry envelope.";

      const predictedTimeToFailureMin =
        stabilityCluster === "HARDWARE_SWAP_REQUIRED"
          ? Math.max(4, scenario.baseCascadeWindowMin - timeOffsetMin - 4)
          : stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
          ? Math.max(6, scenario.baseCascadeWindowMin - timeOffsetMin)
          : null;

      // Distribute active SLA exposure proportionally across at-risk racks
      const isAtRisk = stabilityCluster !== "HEALTHY_OPTIMAL";
      const rackSlaShareUsd =
        !isAtRisk || nemotronMitigated
          ? 0
          : Math.round(currentTotalSlaPerHr / 12);

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
        clusterConfidence: Number((0.91 + (rackNum % 8) * 0.01).toFixed(2)),
        inletTempC,
        coolantTempC,
        powerDrawKw,
        maxPowerKw,
        voltageRippleMv,
        vibrationMmS,
        coolantFlowLpm,
        utilizationPct:
          nemotronMitigated && isAtRisk
            ? 38
            : Math.min(98, Math.round(76 + rackSeed * 19)),
        totalEccErrorsPerHr,
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
        slaPenaltyPerHourUsd: rackSlaShareUsd,
        activeWorkload:
          nemotronMitigated && isAtRisk
            ? "Drained → Cluster Alpha / Hillsboro DR"
            : cluster.workload,
        blades,
      });
    }
  });

  // Compute unified metrics from the generated racks
  const metrics = computeSynchronizedMetrics(
    scenario,
    timeOffsetMin,
    nemotronMitigated,
    racks
  );

  // CBRE Facility & Invisible Network Nodes (Synchronized with `metrics`)
  const facilityNodes: CBREFacilityNode[] = [
    {
      id: "ACCESS-MECH-M2",
      name: "Badge Access Control: Mech Room M2",
      category: "ACCESS_CONTROL",
      status: nemotronMitigated ? "NOMINAL" : "WARNING",
      metricLabel: "Last Contractor Entry",
      metricValue: `Badge #4491 (T-${metrics.horizonOffsetMin + 14}m · Unverified)`,
      anomalyDetail:
        "HVAC contractor entered Mechanical Room M2 prior to shift turnover; manual bypass valve override left at 38%.",
      connectedRackClusters: ["CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: metrics.activeSlaExposurePerHrUsd,
      position3D: [-11.5, 1.2, -3.5],
    },
    {
      id: "CRAH-02",
      name: "CRAH-02 Primary Liquid Chiller Loop",
      category: "HVAC_COOLING",
      status: nemotronMitigated ? "WARNING" : "FAILING",
      metricLabel: "Loop Flow Rate",
      metricValue: nemotronMitigated
        ? "39.4 L/min (Aux Valve Open)"
        : `${Math.max(14, Number((24.2 - timeFactor * 5.5).toFixed(1)))} L/min (Starved)`,
      anomalyDetail:
        "Secondary loop starvation driving thermal drift across Cluster Bravo and Charlie manifolds.",
      connectedRackClusters: ["CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: metrics.activeSlaExposurePerHrUsd,
      position3D: [0, 1.6, -7.2],
    },
    {
      id: "PDU-B1",
      name: "Substation Feeder B1 & 48V Busway",
      category: "UTILITY_POWER",
      status: nemotronMitigated ? "NOMINAL" : "WARNING",
      metricLabel: "Harmonic Distortion",
      metricValue: nemotronMitigated
        ? "1.9% THD (Filtered)"
        : "8.7% THD / 91.8mV Peak Ripple",
      anomalyDetail:
        "Harmonic switching resonance accelerating rectifier capacitor wear in RACK-19 & RACK-20.",
      connectedRackClusters: ["CLUSTER-C", "CLUSTER-D"],
      cascadeImpactUsdPerHr: metrics.activeSlaExposurePerHrUsd,
      position3D: [11.5, 1.2, 2.5],
    },
    {
      id: "LEASE-SLA-PORTFOLIO",
      name: "CBRE Master Lease & Tenant SLA Vault",
      category: "TENANT_LEASE_SLA",
      status: nemotronMitigated ? "NOMINAL" : "FAILING",
      metricLabel: "Synchronized SLA Risk",
      metricValue: nemotronMitigated
        ? `$0/hr (Saved $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr)`
        : `$${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr Exposure`,
      anomalyDetail: `Clause 14.2 of Hyperscale Lease #HYP-02 breaches in T-${metrics.remainingTimeToCascadeMin} mins ($${metrics.baseSlaPerHrUsd.toLocaleString()}/hr base rate escalated by +${metrics.horizonOffsetMin}m drift).`,
      connectedRackClusters: ["CLUSTER-A", "CLUSTER-B", "CLUSTER-C"],
      cascadeImpactUsdPerHr: metrics.activeSlaExposurePerHrUsd,
      position3D: [0, 2.2, 7.2],
    },
  ];

  // Causal Dependency Edges (Synchronized with `metrics.activeSlaExposurePerHrUsd` & `remainingTimeToCascadeMin`)
  const dependencyEdges: InvisibleDependencyEdge[] = [
    {
      id: "EDGE-1",
      sourceId: "ACCESS-MECH-M2",
      sourceLabel: "Contractor Badge #4491 (Mech Room M2)",
      sourceSilo: "ACCESS_CONTROL",
      targetId: "CRAH-02",
      targetLabel: "CRAH-02 Chiller Bypass Valve",
      targetSilo: "HVAC_COOLING",
      causalMechanism:
        "Unclosed 38% manual test bypass after physical room entry prior to shift turnover",
      propagationLagMin: 4,
      activeInCascade: !nemotronMitigated,
      severity: "CRITICAL",
    },
    {
      id: "EDGE-2",
      sourceId: "CRAH-02",
      sourceLabel: "CRAH-02 Chiller Loop Starvation",
      sourceSilo: "HVAC_COOLING",
      targetId: "CLUSTER-B",
      targetLabel: `Cluster Bravo (${metrics.transientDriftRacksCount} Transient Drift Racks)`,
      targetSilo: "COMPUTE_RACK",
      causalMechanism:
        "Manifold flow drop below 24 L/min triggers GPU cold-plate thermal drift (recoverable via auxiliary valve & drain)",
      propagationLagMin: 8,
      activeInCascade: !nemotronMitigated,
      severity: "HIGH",
    },
    {
      id: "EDGE-3",
      sourceId: "PDU-B1",
      sourceLabel: "Substation Feeder PDU-B1 Harmonic Ripple",
      sourceSilo: "UTILITY_POWER",
      targetId: "CLUSTER-C",
      targetLabel: `Hardware Swap Queue (${metrics.flaggedSwapRackIds.join(", ") || "All Swapped"})`,
      targetSilo: "COMPUTE_RACK",
      causalMechanism:
        "91.8mV DC ripple & manifold wear require physical PSU shelf / HGX blade hot-swap from Cage 4",
      propagationLagMin: 10,
      activeInCascade: metrics.flaggedHardwareSwapsCount > 0,
      severity: "CRITICAL",
    },
    {
      id: "EDGE-4",
      sourceId: "CLUSTER-B",
      sourceLabel: "Unmitigated Cluster Instability",
      sourceSilo: "COMPUTE_RACK",
      targetId: "LEASE-SLA-PORTFOLIO",
      targetLabel: "CBRE Hyperscale Tenant SLA #HYP-02",
      targetSilo: "TENANT_SLA",
      causalMechanism: nemotronMitigated
        ? `Cascade severed: $0/hr active exposure ($${metrics.savedSlaPerHrUsd.toLocaleString()}/hr SLA penalty avoided)`
        : `Breach in T-${metrics.remainingTimeToCascadeMin} mins at T+${metrics.horizonOffsetMin}m horizon: $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr active SLA exposure (Base: $${metrics.baseSlaPerHrUsd.toLocaleString()}/hr)`,
      propagationLagMin: metrics.remainingTimeToCascadeMin,
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
      availablePowerMw: metrics.dfwAvailableMarginMw,
      totalPowerMw: metrics.dfwTotalPowerMw,
      pue: 1.24,
      floorLoadingLbsSqFt: 350,
      liquidCoolingReady: true,
      leaseRatePerKwMonthUsd: 168,
      substationRedundancy: "2N Dual ERCOT 138kV Feeders",
      cbreRecommendationScore: 71,
      expansionFitReason: `${metrics.dfwUtilizationPct}% power load (${metrics.dfwUsedPowerMw}/${metrics.dfwTotalPowerMw} MW) leaves only ${metrics.dfwAvailableMarginMw} MW margin. ${metrics.flaggedHardwareSwapsCount} racks flagged for in-place blade/PSU swap; net-new 18MW Blackwell expansion must offload to Hillsboro.`,
      activeClustersCount: 4,
      unstableRacksCount:
        metrics.flaggedHardwareSwapsCount + metrics.transientDriftRacksCount,
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
        "Optimal CBRE expansion match: 34.0 MW turn-key hydro capacity, 15% lower $/kW lease rate, and 500 lbs/sq.ft slab engineered for high-density NVIDIA GB200 NVL72 clusters.",
      activeClustersCount: 2,
      unstableRacksCount: 0,
    },
    {
      id: "SITE-IAD-3",
      name: "CBRE Ashburn Sovereign Cloud Annex (Target #2)",
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
        "Sub-2ms fiber peering to East Coast financial tenants; ideal secondary DR failover site for Cluster Charlie Sovereign AI workloads.",
      activeClustersCount: 6,
      unstableRacksCount: 1,
    },
  ];

  // NorthMark Compute & Cloud (NMC²) Zero-Drop Shift Handoff Log (Synchronized with `metrics`)
  const shiftEvents: ShiftHandoffEvent[] = [
    {
      id: "SHIFT-EV-1",
      timestamp: `T-${metrics.horizonOffsetMin + 14}m (Outgoing Swing Shift C)`,
      shift: "Swing Shift C (16:00-00:00)",
      author: "Marcus Vance (Facilities Tech II)",
      role: "Mechanical Operations",
      severity: "SILO_WARNING",
      title: "Unstructured Shift Note: 'CRAH-02 Bypass Left on Test Override'",
      unstructuredNote:
        '"Vendor from Apex Mechanical badged into Room M2 to bleed air from CRAH-02 secondary manifold. Left bypass valve at ~38% while waiting for pressure gauge to settle. Incoming Night Shift A must verify valve closure before Cluster B ramps."',
      correlatedSensors: [
        "ACCESS-MECH-M2 (Badge #4491)",
        "CRAH-02 Flow Drop",
        "RACK-11 & RACK-12 Manifold ΔT",
      ],
      cbreSiloLink:
        "Access Control Log + Unstructured Note + Tenant Lease #HYP-02",
      actionRequiredNextShift:
        "Close CRAH-02 manual bypass valve in Mech Room M2 and verify secondary loop flow ≥39 L/min.",
    },
    {
      id: "SHIFT-EV-2",
      timestamp: `T+${metrics.horizonOffsetMin}m Horizon (Active Countdown: T-${metrics.remainingTimeToCascadeMin}m)`,
      shift: "Night Shift A (00:00-08:00)",
      author: "Nemotron Autonomous Sentinel",
      role: "Multi-Agent ReAct Orchestrator",
      severity: nemotronMitigated ? "AGENT_MITIGATED" : "CRITICAL_HANDOFF",
      title: nemotronMitigated
        ? `Cascade Severed: Saved $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr SLA Exposure`
        : `Cross-Silo Cascade Alert: T-${metrics.remainingTimeToCascadeMin} Mins to $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr SLA Breach`,
      unstructuredNote: `Correlated Swing Shift C's valve note with thermal drift across ${metrics.transientDriftRacksCount} recoverable racks and intrinsic hardware wear on ${metrics.flaggedHardwareSwapsCount} swap-bound racks (${metrics.flaggedSwapRackIds.join(", ") || "None"}).`,
      correlatedSensors: [
        `Active SLA Risk: $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr`,
        `Countdown: T-${metrics.remainingTimeToCascadeMin}m`,
        "CBRE Lease Clause 14.2",
      ],
      cbreSiloLink:
        "4-Silo Causal Graph (Access → HVAC → Rack Cluster → Tenant Lease)",
      actionRequiredNextShift:
        "Confirm Nemotron autonomous workload drain on swap-bound racks and actuate auxiliary valve V-204B.",
    },
    {
      id: "SHIFT-EV-3",
      timestamp: "Night Shift A Maintenance Queue",
      shift: "Night Shift A (00:00-08:00)",
      author: "NMC² Spectral Fleet Clustering",
      role: "Hardware Lifecycle Engine",
      severity: "HARDWARE_REPLACEMENT",
      title: `${metrics.flaggedHardwareSwapsCount} Racks Staged for Physical Cage 4 Hot-Swap`,
      unstructuredNote:
        "Spectral clustering separated transient cooling drift victims from racks with physical hardware degradation: RACK-11 (U4 Manifold/Blade), RACK-12 (U2 Blade/U5 NVLink), RACK-19 & RACK-20 (U8 48V PSU Shelf + Blade), and RACK-27 (CDU Pump Bearing).",
      correlatedSensors: [
        "RACK-11 U4 (38 ECC/h)",
        "RACK-12 U2 (31 ECC/h)",
        "RACK-19 U8 (91.8mV / 54 ECC/h)",
        "RACK-20 U8 (84.5mV / 42 ECC/h)",
      ],
      cbreSiloLink:
        "In-Place Swap ($242.5K CapEx) vs. CBRE Hillsboro OR 34MW Expansion",
      actionRequiredNextShift:
        "Pull pre-staged HGX blades and 48V PSU shelves from Cage 4 and sign unified shift handoff.",
    },
  ];

  return {
    scenario,
    metrics,
    racks,
    facilityNodes,
    dependencyEdges,
    sites,
    shiftEvents,
  };
}
