"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  DISASTER_SCENARIOS,
  generateInitialDataCenterState,
  RackNode,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import InvisibleNetworkAndClusterGraph from "@/components/InvisibleNetworkAndClusterGraph";
import NemotronAndSponsorPanels from "@/components/NemotronAndSponsorPanels";
import {
  Activity,
  AlertOctagon,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  Flame,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

const DataHall3DCanvas = dynamic(
  () => import("@/components/DataHall3DCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl border border-slate-800 bg-[#050811] flex items-center justify-center text-sm text-slate-400">
        Initializing 3D Spatial Data Hall & GPU Rack Cluster Twin...
      </div>
    ),
  }
);

export default function NexusDCMissionControl() {
  const [scenarioId, setScenarioId] = useState<string>("chiller_badge_cascade");
  const [timeOffsetMin, setTimeOffsetMin] = useState<number>(12);
  const [nemotronMitigated, setNemotronMitigated] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<
    "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP"
  >("CLUSTER_STABILITY");
  const [showInvisibleNetwork, setShowInvisibleNetwork] = useState<boolean>(true);
  const [selectedRackId, setSelectedRackId] = useState<string>("RACK-11");
  const [swappedRacks, setSwappedRacks] = useState<Record<string, boolean>>({});

  // Nemotron Multi-Agent State
  const [apiKey, setApiKey] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [agentSteps, setAgentSteps] = useState<AgentStepOutput[]>([]);
  const [isRunningAgents, setIsRunningAgents] = useState<boolean>(false);
  const [usedLiveApi, setUsedLiveApi] = useState<boolean>(false);
  const [apiErrorNote, setApiErrorNote] = useState<string | undefined>(undefined);
  const [ackShiftIds, setAckShiftIds] = useState<Record<string, boolean>>({});

  // Compute current Digital Twin state from scenario + time scrubber + mitigation
  const twinState = useMemo(() => {
    const base = generateInitialDataCenterState(
      scenarioId,
      timeOffsetMin,
      nemotronMitigated
    );

    // Apply any technician blade hot-swaps performed in the UI
    const updatedRacks = base.racks.map((r) => {
      if (swappedRacks[r.id]) {
        return {
          ...r,
          stabilityCluster: "HEALTHY_OPTIMAL" as const,
          healthScore: 96,
          voltageRippleMv: 16.2,
          vibrationMmS: 0.9,
          coolantTempC: 29.4,
          replacementRecommended: false,
          replacementUrgency: "NONE" as const,
          replacementDiagnosis:
            "Module Hot-Swap Completed by Night Shift A: New HGX Blade & 48V PSU Shelf Verified.",
          blades: r.blades.map((b) => ({
            ...b,
            needsReplacement: false,
            healthScore: 98,
            tempC: 41.2,
            eccErrorsPerHr: 0,
          })),
        };
      }
      return r;
    });

    const updatedShiftEvents = base.shiftEvents.map((ev) => ({
      ...ev,
      acknowledged: ev.acknowledged || Boolean(ackShiftIds[ev.id]),
    }));

    return {
      ...base,
      racks: updatedRacks,
      shiftEvents: updatedShiftEvents,
    };
  }, [scenarioId, timeOffsetMin, nemotronMitigated, swappedRacks, ackShiftIds]);

  const activeScenario = useMemo(
    () =>
      DISASTER_SCENARIOS.find((s) => s.id === scenarioId) ||
      DISASTER_SCENARIOS[0],
    [scenarioId]
  );

  const selectedRack: RackNode = useMemo(
    () =>
      twinState.racks.find((r) => r.id === selectedRackId) ||
      twinState.racks[10] ||
      twinState.racks[0],
    [twinState.racks, selectedRackId]
  );

  const unstableRacksCount = useMemo(
    () => twinState.racks.filter((r) => r.healthScore < 75).length,
    [twinState.racks]
  );

  const replacementRacks = useMemo(
    () => twinState.racks.filter((r) => r.replacementRecommended),
    [twinState.racks]
  );

  const runNemotronPipeline = useCallback(
    async (mode: string = "autonomous_mitigation") => {
      setIsRunningAgents(true);
      setApiErrorNote(undefined);
      try {
        const res = await fetch("/api/nemotron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId,
            timeOffsetMin,
            userPrompt: customPrompt,
            apiKey,
            mode,
          }),
        });
        const data = await res.json();
        if (data.ok && data.agentSteps) {
          setAgentSteps(data.agentSteps);
          setUsedLiveApi(Boolean(data.usedLiveApi));
          setApiErrorNote(data.apiErrorNote);
          if (mode === "autonomous_mitigation") {
            setNemotronMitigated(true);
          }
        }
      } catch (err: unknown) {
        setApiErrorNote(
          err instanceof Error ? err.message : "Failed to execute pipeline"
        );
      } finally {
        setIsRunningAgents(false);
      }
    },
    [scenarioId, timeOffsetMin, customPrompt, apiKey]
  );

  // Load initial multi-agent analysis on mount or scenario change
  useEffect(() => {
    runNemotronPipeline("initial_load");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const handleHotSwapRack = (rackId: string) => {
    setSwappedRacks((prev) => ({ ...prev, [rackId]: true }));
  };

  const handleResetSimulation = () => {
    setNemotronMitigated(false);
    setSwappedRacks({});
    setTimeOffsetMin(15);
  };

  return (
    <div className="min-h-screen bg-[#040710] text-slate-100 pb-14">
      {/* TOP COMMAND HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#040710]/90 border-b border-slate-800/90 px-4 lg:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand & 3 Sponsor Track Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-[#76B900] p-[1.5px]">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Layers className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-tight text-white">
                    NexusDC
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Spatial Digital Twin v2.6
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Autonomous Rack Clustering, Cross-Silo Cascade Predictor & Real Estate Command Engine
                </p>
              </div>
            </div>

            {/* Sponsor Track Pills */}
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                CBRE: The Invisible Network
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-950/90 border border-sky-500/40 text-sky-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                NMC²: Keep the World Running
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#76B900]/20 border border-[#76B900]/50 text-[#9be61d] flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                NVIDIA Nemotron Multi-Agent
              </span>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!nemotronMitigated ? (
              <button
                onClick={() => runNemotronPipeline("autonomous_mitigation")}
                disabled={isRunningAgents}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#76B900] to-emerald-500 text-slate-950 hover:opacity-95 transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                {isRunningAgents
                  ? "Nemotron ReAct Agents Running..."
                  : "Auto-Intercept Cascade with Nemotron"}
              </button>
            ) : (
              <button
                onClick={handleResetSimulation}
                className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Cascade Disaster
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-5 space-y-5">
        {/* TOP KPI STRIP (Connects CBRE SLA + NMC² Rack Clusters + Time-to-Failure + Real Estate Capacity) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* KPI 1: CBRE Tenant SLA Financial Risk */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CBRE Tenant SLA Exposure
              </span>
              <div
                className={`text-2xl font-black mt-0.5 ${
                  nemotronMitigated ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {nemotronMitigated
                  ? "$0 / hr (Protected)"
                  : `$${Math.round(
                      activeScenario.unmitigatedSlaLossPerHr *
                        (1 + timeOffsetMin / 45)
                    ).toLocaleString()} / hr`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {nemotronMitigated
                  ? `Saved $${activeScenario.unmitigatedSlaLossPerHr.toLocaleString()}/hr on Lease #HYP-02`
                  : "Hyperscale Lease Clause 14.2 Breach Imminent"}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                nemotronMitigated
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-400"
              }`}
            >
              {nemotronMitigated ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              )}
            </div>
          </div>

          {/* KPI 2: NMC² Unstable vs. Hardware Replacement Racks */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                NMC² Fleet Stability & Replacement
              </span>
              <div className="text-2xl font-black text-white mt-0.5">
                {replacementRacks.length} Swap{" "}
                <span className="text-sm font-semibold text-amber-300">
                  / {unstableRacksCount} Unstable Racks
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Racks 11, 12, 19, 20, 27 isolated for blade/PSU swap
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3: Cascade Time-to-Criticality */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Time to Cascading Outage
              </span>
              <div
                className={`text-2xl font-black mt-0.5 ${
                  nemotronMitigated ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {nemotronMitigated
                  ? "Stabilized (∞)"
                  : `T-${Math.max(
                      3,
                      activeScenario.timeToCascadeCriticalMin -
                        Math.round(timeOffsetMin * 0.35)
                    )} mins`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeScenario.rootCauseSilo.slice(0, 48)}...
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 4: CBRE Real Estate Portfolio Capacity */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CBRE Site Capacity & Expansion
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                93.3% Full{" "}
                <span className="text-xs font-semibold text-slate-300">
                  (Hillsboro 96% Fit)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                DFW-North 44.8/48MW · Offload 18MW to CBRE Hillsboro
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CONTROL BAR: SCENARIO INJECTOR + TIME-TRAVEL CASCADE SCRUBBER + 3D VISUAL MODE */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
            {/* Disaster Scenario Selector (5 cols) */}
            <div className="xl:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                1. Inject Cross-Silo Facility / Cyber Cascade Scenario:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {DISASTER_SCENARIOS.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setScenarioId(scen.id);
                      setNemotronMitigated(false);
                    }}
                    className={`p-2 rounded-xl border text-left transition ${
                      scenarioId === scen.id
                        ? "bg-sky-500/15 border-sky-400 text-white"
                        : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight line-clamp-2">
                      {scen.name}
                    </div>
                    <div className="text-[9px] text-sky-400 font-semibold mt-1 truncate">
                      ${(scen.unmitigatedSlaLossPerHr / 1000).toFixed(1)}k/hr SLA Risk
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time-Travel Cascade Scrubber (4 cols) */}
            <div className="xl:col-span-4 bg-slate-950/90 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  2. Time-Travel Cascade Horizon:
                </span>
                <span className="font-mono font-bold text-amber-400">
                  T + {timeOffsetMin} mins
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={3}
                value={timeOffsetMin}
                onChange={(e) => setTimeOffsetMin(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>T+0m (Anomaly)</span>
                <span>T+15m (Thermal Drift)</span>
                <span>T+30m (SLA Breach)</span>
                <span>T+60m (Cascade)</span>
              </div>
            </div>

            {/* 3D Visualization Mode & Overlay Toggles (3 cols) */}
            <div className="xl:col-span-3 flex flex-col gap-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                3. 3D Cluster & Hardware Lens:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setVisualMode("CLUSTER_STABILITY")}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                    visualMode === "CLUSTER_STABILITY"
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Clusters
                </button>
                <button
                  onClick={() => setVisualMode("REPLACEMENT_XRAY")}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                    visualMode === "REPLACEMENT_XRAY"
                      ? "bg-rose-500/20 border-rose-400 text-rose-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Swap X-Ray
                </button>
                <button
                  onClick={() => setVisualMode("THERMAL_HEATMAP")}
                  className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                    visualMode === "THERMAL_HEATMAP"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Thermal
                </button>
              </div>
              <button
                onClick={() => setShowInvisibleNetwork((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition flex items-center justify-center gap-1.5 ${
                  showInvisibleNetwork
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {showInvisibleNetwork
                  ? "CBRE 3D Dependency Beams: ON"
                  : "CBRE 3D Dependency Beams: OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* CENTERPIECE: 3D SPATIAL DATA HALL (8 COLS) + RACK & BLADE DEEP-DIVE INSPECTOR (4 COLS) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* 3D Data Hall & Quick Rack Selector (8 cols) */}
          <div className="xl:col-span-8 space-y-3">
            <DataHall3DCanvas
              racks={twinState.racks}
              facilityNodes={twinState.facilityNodes}
              dependencyEdges={twinState.dependencyEdges}
              selectedRackId={selectedRack.id}
              onSelectRack={setSelectedRackId}
              visualMode={visualMode}
              showInvisibleNetwork={showInvisibleNetwork}
              nemotronMitigated={nemotronMitigated}
            />

            {/* Quick-Jump Priority Rack Pills */}
            <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">
                  Priority Racks (Click to Inspect):
                </span>
                {["RACK-11", "RACK-12", "RACK-19", "RACK-20", "RACK-27", "RACK-09", "RACK-01"].map(
                  (rId) => {
                    const rObj = twinState.racks.find((x) => x.id === rId);
                    if (!rObj) return null;
                    const isSel = selectedRack.id === rId;
                    return (
                      <button
                        key={rId}
                        onClick={() => setSelectedRackId(rId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                          isSel
                            ? "bg-sky-500 text-slate-950 border-sky-400"
                            : rObj.replacementRecommended
                            ? "bg-rose-950/70 border-rose-500/50 text-rose-300 hover:bg-rose-900/60"
                            : rObj.healthScore < 75
                            ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                            : "bg-slate-950 border-slate-800 text-emerald-300"
                        }`}
                      >
                        {rId} ({rObj.healthScore}%)
                      </button>
                    );
                  }
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Drag to orbit 3D · Scroll to zoom · Click any rack
              </span>
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED RACK 8U BLADE INSPECTOR & CBRE SILO PASSPORT (4 cols) */}
          <div className="xl:col-span-4 bg-slate-900/85 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
            <div>
              {/* Rack Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block">
                    {selectedRack.clusterName}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {selectedRack.label}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {selectedRack.gpuArchitecture} · {selectedRack.activeWorkload}
                  </span>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                      selectedRack.healthScore < 55
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                        : selectedRack.healthScore < 75
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    Health {selectedRack.healthScore}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    Cluster: {selectedRack.stabilityCluster}
                  </div>
                </div>
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                  <span className="text-[10px] text-slate-400 block">Coolant Temp</span>
                  <strong
                    className={`text-sm ${
                      selectedRack.coolantTempC > 40 ? "text-rose-400" : "text-white"
                    }`}
                  >
                    {selectedRack.coolantTempC}°C
                  </strong>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                  <span className="text-[10px] text-slate-400 block">48V PSU Ripple</span>
                  <strong
                    className={`text-sm ${
                      selectedRack.voltageRippleMv > 50 ? "text-purple-400" : "text-white"
                    }`}
                  >
                    {selectedRack.voltageRippleMv} mV
                  </strong>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                  <span className="text-[10px] text-slate-400 block">Coolant Flow</span>
                  <strong
                    className={`text-sm ${
                      selectedRack.coolantFlowLpm < 28 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {selectedRack.coolantFlowLpm} L/m
                  </strong>
                </div>
              </div>

              {/* CBRE Invisible Network Links for this Rack */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 mb-3 text-[11px] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  CBRE Cross-Silo Dependency Links
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cooling Loop / PDU:</span>
                  <span className="font-mono text-white">
                    {selectedRack.crahUnitId} · {selectedRack.pduFeedId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tenant Lease Contract:</span>
                  <span className="font-semibold text-amber-300">
                    {selectedRack.tenantName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rack SLA Penalty Risk:</span>
                  <span className="font-bold text-rose-400">
                    ${selectedRack.slaPenaltyPerHourUsd.toLocaleString()}/hr
                  </span>
                </div>
              </div>

              {/* 8U Individual Blade Chassis Breakdown */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5">
                  <span>8U Server Tray / Blade Telemetry</span>
                  <span className="text-[10px] text-rose-400">
                    Red = Flagged for Physical Swap
                  </span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {selectedRack.blades.map((blade) => (
                    <div
                      key={blade.uSlot}
                      className={`rounded-lg px-2.5 py-1.5 border text-[11px] flex items-center justify-between ${
                        blade.needsReplacement
                          ? "bg-rose-950/60 border-rose-500/60 text-rose-100"
                          : "bg-slate-950/75 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                          U{blade.uSlot}
                        </span>
                        <div>
                          <div className="font-semibold text-white text-[11px] leading-tight">
                            {blade.model}
                          </div>
                          {blade.failureReason && (
                            <div className="text-[10px] text-rose-300 font-medium">
                              ⚠ {blade.failureReason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10px] shrink-0">
                        <div>{blade.tempC}°C</div>
                        <div
                          className={
                            blade.eccErrorsPerHr > 0
                              ? "text-rose-400 font-bold"
                              : "text-emerald-400"
                          }
                        >
                          {blade.eccErrorsPerHr} ECC/h
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Replacement Diagnosis & 1-Click Technician Hot-Swap */}
            <div className="pt-2 border-t border-slate-800">
              <div
                className={`rounded-xl p-2.5 text-xs mb-2 ${
                  selectedRack.replacementRecommended
                    ? "bg-rose-950/50 border border-rose-500/40 text-rose-200"
                    : "bg-emerald-950/30 border border-emerald-500/30 text-emerald-200"
                }`}
              >
                <strong className="block mb-0.5">
                  {selectedRack.replacementRecommended
                    ? `Hardware Swap Required (${selectedRack.replacementUrgency}):`
                    : "Diagnostic Status:"}
                </strong>
                <span className="text-[11px] leading-relaxed">
                  {selectedRack.replacementDiagnosis}
                </span>
              </div>

              {selectedRack.replacementRecommended ? (
                <button
                  onClick={() => handleHotSwapRack(selectedRack.id)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  <Wrench className="w-4 h-4" />
                  Execute Cage 4 Blade/PSU Hot-Swap on {selectedRack.id} ($48.5K)
                </button>
              ) : (
                <div className="w-full py-2 rounded-xl text-center text-xs font-semibold bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedRack.id} Hardware Integrity Verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: NMC² SPECTRAL CLUSTERING PLOT + CBRE INVISIBLE NETWORK CAUSAL GRAPH */}
        <InvisibleNetworkAndClusterGraph
          racks={twinState.racks}
          facilityNodes={twinState.facilityNodes}
          dependencyEdges={twinState.dependencyEdges}
          selectedRackId={selectedRack.id}
          onSelectRack={setSelectedRackId}
          nemotronMitigated={nemotronMitigated}
        />

        {/* ROW 4: NVIDIA NEMOTRON 4-AGENT WAR ROOM + CBRE REAL ESTATE EXPANSION + NMC² SHIFT HANDOFF */}
        <NemotronAndSponsorPanels
          agentSteps={agentSteps}
          isRunningAgents={isRunningAgents}
          usedLiveApi={usedLiveApi}
          apiErrorNote={apiErrorNote}
          apiKey={apiKey}
          setApiKey={setApiKey}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          onRunNemotron={runNemotronPipeline}
          sites={twinState.sites}
          shiftEvents={twinState.shiftEvents}
          onAcknowledgeShift={(id) =>
            setAckShiftIds((prev) => ({ ...prev, [id]: true }))
          }
          nemotronMitigated={nemotronMitigated}
        />
      </main>
    </div>
  );
}

