"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  DISASTER_SCENARIOS,
  generateInitialDataCenterState,
  HandoffSignoffState,
  RackNode,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import LifecycleAndExpansionTab from "@/components/InvisibleNetworkAndClusterGraph";
import NemotronMultiAgentOpsTab from "@/components/NemotronAndSponsorPanels";
import {
  Activity,
  AlertOctagon,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wrench,
} from "lucide-react";

const DataHall3DCanvas = dynamic(
  () => import("@/components/DataHall3DCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[510px] rounded-2xl border border-slate-800 bg-[#060a12] flex items-center justify-center text-sm text-slate-400">
        Initializing 3D Spatial Data Hall & GPU Rack Cluster Twin...
      </div>
    ),
  }
);

type ActiveTabId = "COMMAND_3D" | "NEMOTRON_OPS" | "LIFECYCLE_CBRE";

export default function NexusDCMissionControl() {
  const [activeTab, setActiveTab] = useState<ActiveTabId>("COMMAND_3D");
  const [scenarioId, setScenarioId] = useState<string>("chiller_badge_cascade");
  const [timeOffsetMin, setTimeOffsetMin] = useState<number>(12);
  const [nemotronMitigated, setNemotronMitigated] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<
    "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP"
  >("CLUSTER_STABILITY");
  const [showInvisibleNetwork, setShowInvisibleNetwork] =
    useState<boolean>(true);
  const [selectedRackId, setSelectedRackId] = useState<string>("RACK-11");
  const [swappedRacks, setSwappedRacks] = useState<Record<string, boolean>>({});
  const [handoffState, setHandoffState] =
    useState<HandoffSignoffState>("PENDING");

  // Nemotron Multi-Agent State
  const [apiKey, setApiKey] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [agentSteps, setAgentSteps] = useState<AgentStepOutput[]>([]);
  const [isRunningAgents, setIsRunningAgents] = useState<boolean>(false);
  const [usedLiveApi, setUsedLiveApi] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<string>(
    "nvidia/llama-3.1-nemotron-70b-instruct"
  );

  // Single Source of Truth Digital Twin State
  const twinState = useMemo(() => {
    return generateInitialDataCenterState(
      scenarioId,
      timeOffsetMin,
      nemotronMitigated,
      swappedRacks
    );
  }, [scenarioId, timeOffsetMin, nemotronMitigated, swappedRacks]);

  const { metrics } = twinState;

  const selectedRack: RackNode = useMemo(
    () =>
      twinState.racks.find((r) => r.id === selectedRackId) ||
      twinState.racks[10] ||
      twinState.racks[0],
    [twinState.racks, selectedRackId]
  );

  const runNemotronPipeline = useCallback(
    async (mode: string = "autonomous_mitigation") => {
      setIsRunningAgents(true);
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
        if (data.ok && Array.isArray(data.agentSteps)) {
          setAgentSteps(data.agentSteps);
          setUsedLiveApi(Boolean(data.usedLiveApi));
          if (data.modelUsed) setModelUsed(data.modelUsed);
          if (mode === "autonomous_mitigation") {
            setNemotronMitigated(true);
            setHandoffState((prev) =>
              prev === "PENDING" ? "VERIFIED" : prev
            );
          }
        }
      } catch {
        // Silent graceful fallback
      } finally {
        setIsRunningAgents(false);
      }
    },
    [scenarioId, timeOffsetMin, customPrompt, apiKey]
  );

  // Keep agent traces synchronized when scenario or time horizon changes
  useEffect(() => {
    runNemotronPipeline("sync_load");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, timeOffsetMin]);

  const handleHotSwapRack = (rackId: string) => {
    setSwappedRacks((prev) => ({ ...prev, [rackId]: true }));
  };

  const handleResetSimulation = () => {
    setNemotronMitigated(false);
    setSwappedRacks({});
    setTimeOffsetMin(12);
    setHandoffState("PENDING");
  };

  return (
    <div className="min-h-screen bg-[#040710] text-slate-100 pb-12">
      {/* PERSISTENT TOP NAVBAR WITH SUBTLE SPONSOR PILLS & TAB NAVIGATION */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#040710]/95 border-b border-slate-800/90 px-4 lg:px-8 pt-3">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3">
            {/* Brand + Subtle Once-Only Sponsor Track Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base tracking-tight text-white">
                      NexusDC
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      Digital Twin v3.0
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                  CBRE · Invisible Network
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                  NMC² · Fleet Operations
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                  NVIDIA Nemotron · Multi-Agent
                </span>
              </div>
            </div>

            {/* Primary Action Control */}
            <div className="flex flex-wrap items-center gap-2">
              {!nemotronMitigated ? (
                <button
                  onClick={() => runNemotronPipeline("autonomous_mitigation")}
                  disabled={isRunningAgents}
                  className="px-4 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  {isRunningAgents
                    ? "Running Multi-Agent Mitigation..."
                    : "Auto-Intercept Cascade with Nemotron"}
                </button>
              ) : (
                <button
                  onClick={handleResetSimulation}
                  className="px-3.5 py-1.5 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Cascade Simulation
                </button>
              )}
            </div>
          </div>

          {/* 3-TAB NAVIGATION BAR */}
          <nav className="flex items-center gap-2 overflow-x-auto">
            {(
              [
                {
                  id: "COMMAND_3D",
                  label: "1. Command Center & 3D Twin",
                  badge: `${metrics.flaggedHardwareSwapsCount} Swaps`,
                },
                {
                  id: "NEMOTRON_OPS",
                  label: "2. Nemotron Multi-Agent Ops",
                  badge: "4 ReAct Agents",
                },
                {
                  id: "LIFECYCLE_CBRE",
                  label: "3. Lifecycle & Expansion (CBRE × NMC²)",
                  badge:
                    handoffState === "SIGNED"
                      ? "Handoff Signed"
                      : `Handoff ${handoffState}`,
                },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "border-emerald-400 text-white bg-slate-900/60 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isActive
                        ? "bg-slate-800 text-emerald-300"
                        : "bg-slate-900 text-slate-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-5 space-y-5">
        {/* 4 SYNCHRONIZED PRIMARY KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* KPI 1: Active SLA Exposure */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Active SLA Exposure
              </span>
              <div
                className={`text-2xl font-black mt-0.5 ${
                  nemotronMitigated ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {nemotronMitigated
                  ? "$0 / hr"
                  : `$${metrics.activeSlaExposurePerHrUsd.toLocaleString()} / hr`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {nemotronMitigated
                  ? `Protected (Saved $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr)`
                  : `Base $${metrics.baseSlaPerHrUsd.toLocaleString()}/hr @ T+${metrics.horizonOffsetMin}m`}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                nemotronMitigated
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {nemotronMitigated ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertOctagon className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* KPI 2: Time to Cascade (Synchronized with Scrubber & Handoff) */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Time to Cascade
              </span>
              <div
                className={`text-2xl font-black mt-0.5 ${
                  nemotronMitigated ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {nemotronMitigated
                  ? "Stabilized"
                  : `T-${metrics.remainingTimeToCascadeMin} mins`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Horizon: T+{metrics.horizonOffsetMin}m of{" "}
                {twinState.scenario.baseCascadeWindowMin}m window
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 3: Flagged Hardware Swaps */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Flagged Hardware Swaps
              </span>
              <div className="text-2xl font-black text-white mt-0.5">
                {metrics.flaggedHardwareSwapsCount} Racks{" "}
                <span className="text-xs font-semibold text-amber-400">
                  (+{metrics.transientDriftRacksCount} Drift)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metrics.flaggedSwapRackIds.join(", ") || "All Swaps Complete"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* KPI 4: DFW Site Load Margin */}
          <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                DFW Site Load Margin
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                {metrics.dfwAvailableMarginMw} MW Avail{" "}
                <span className="text-xs font-semibold text-slate-300">
                  ({metrics.dfwUtilizationPct}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metrics.dfwUsedPowerMw}/{metrics.dfwTotalPowerMw} MW · 18MW → Hillsboro OR
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: COMMAND CENTER & 3D TWIN                                   */}
        {/* ================================================================= */}
        {activeTab === "COMMAND_3D" && (
          <div className="space-y-5">
            {/* Control Strip: Scenario Selector + Synchronized Time Scrubber + 3D Lens */}
            <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                {/* Scenario Selector (5 cols) */}
                <div className="xl:col-span-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Active Cascade Scenario
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {DISASTER_SCENARIOS.map((scen) => {
                      const isSel = scenarioId === scen.id;
                      const currentScenarioSla = Math.round(
                        scen.baseSlaLossPerHrUsd * (1 + timeOffsetMin * 0.015)
                      );
                      return (
                        <button
                          key={scen.id}
                          onClick={() => {
                            setScenarioId(scen.id);
                            setNemotronMitigated(false);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            isSel
                              ? "bg-slate-800 border-slate-600 text-white"
                              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <div className="text-xs font-bold leading-tight truncate">
                            {scen.shortName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            ${(currentScenarioSla / 1000).toFixed(1)}k/hr @ T+
                            {timeOffsetMin}m
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Synchronized Time-Travel Horizon Scrubber (4 cols) */}
                <div className="xl:col-span-4 bg-slate-950/90 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      Cascade Horizon Scrubber
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      T+{metrics.horizonOffsetMin}m · Breach in T-
                      {metrics.remainingTimeToCascadeMin}m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={2}
                    value={timeOffsetMin}
                    onChange={(e) => setTimeOffsetMin(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>T+0m (Onset)</span>
                    <span>T+12m (Drift)</span>
                    <span>T+24m (Critical)</span>
                  </div>
                </div>

                {/* 3D Lens Switcher (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setVisualMode("CLUSTER_STABILITY")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "CLUSTER_STABILITY"
                          ? "bg-slate-800 border-slate-600 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Clusters
                    </button>
                    <button
                      onClick={() => setVisualMode("REPLACEMENT_XRAY")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "REPLACEMENT_XRAY"
                          ? "bg-slate-800 border-slate-600 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-rose-400" />
                      Swap X-Ray
                    </button>
                    <button
                      onClick={() => setVisualMode("THERMAL_HEATMAP")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "THERMAL_HEATMAP"
                          ? "bg-slate-800 border-slate-600 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Thermal
                    </button>
                  </div>
                  <button
                    onClick={() => setShowInvisibleNetwork((v) => !v)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-slate-950 border-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {showInvisibleNetwork
                      ? "3D Causal Dependency Beams: ON"
                      : "3D Causal Dependency Beams: OFF"}
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Canvas (8 Cols) + Synchronized Rack & Blade Inspector (4 Cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
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

                {/* Priority Rack Quick-Select Pills */}
                <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
                      Inspect Rack:
                    </span>
                    {[
                      "RACK-11",
                      "RACK-12",
                      "RACK-19",
                      "RACK-20",
                      "RACK-27",
                      "RACK-09",
                      "RACK-01",
                    ].map((rId) => {
                      const rObj = twinState.racks.find((x) => x.id === rId);
                      if (!rObj) return null;
                      const isSel = selectedRack.id === rId;
                      return (
                        <button
                          key={rId}
                          onClick={() => setSelectedRackId(rId)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                            isSel
                              ? "bg-white text-slate-950 border-white"
                              : rObj.replacementRecommended
                              ? "bg-rose-950/50 border-rose-500/40 text-rose-300"
                              : rObj.stabilityCluster ===
                                "TRANSIENT_THERMAL_DRIFT"
                              ? "bg-amber-950/50 border-amber-500/40 text-amber-300"
                              : "bg-slate-950 border-slate-800 text-emerald-300"
                          }`}
                        >
                          {rId} ({rObj.healthScore}%)
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Drag to orbit · Scroll to zoom · Click any rack
                  </span>
                </div>
              </div>

              {/* Right Panel: Selected Rack 8U Blade Inspector */}
              <div className="xl:col-span-4 bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        {selectedRack.clusterName}
                      </span>
                      <h3 className="text-lg font-black text-white">
                        {selectedRack.label}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {selectedRack.gpuArchitecture}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                          selectedRack.replacementRecommended
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                            : selectedRack.stabilityCluster ===
                              "TRANSIENT_THERMAL_DRIFT"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        }`}
                      >
                        Health {selectedRack.healthScore}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        {selectedRack.stabilityCluster.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>

                  {/* Derived Rack Aggregates */}
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                      <span className="text-[10px] text-slate-400 block">
                        Coolant
                      </span>
                      <strong
                        className={`text-xs ${
                          selectedRack.coolantTempC >= 40
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        {selectedRack.coolantTempC}°C
                      </strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                      <span className="text-[10px] text-slate-400 block">
                        Peak Ripple
                      </span>
                      <strong
                        className={`text-xs ${
                          selectedRack.voltageRippleMv >= 50
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        {selectedRack.voltageRippleMv}mV
                      </strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                      <span className="text-[10px] text-slate-400 block">
                        Flow
                      </span>
                      <strong
                        className={`text-xs ${
                          selectedRack.coolantFlowLpm < 28
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {selectedRack.coolantFlowLpm}L/m
                      </strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
                      <span className="text-[10px] text-slate-400 block">
                        Total ECC
                      </span>
                      <strong
                        className={`text-xs ${
                          selectedRack.totalEccErrorsPerHr > 10
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {selectedRack.totalEccErrorsPerHr}/hr
                      </strong>
                    </div>
                  </div>

                  {/* Cross-Silo Links */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 mb-3 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Facility Feeders:</span>
                      <span className="font-mono text-slate-200">
                        {selectedRack.crahUnitId} · {selectedRack.pduFeedId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tenant Contract:</span>
                      <span className="font-semibold text-slate-200">
                        {selectedRack.tenantName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rack SLA Share:</span>
                      <span
                        className={`font-bold font-mono ${
                          selectedRack.slaPenaltyPerHourUsd > 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        ${selectedRack.slaPenaltyPerHourUsd.toLocaleString()}/hr
                      </span>
                    </div>
                  </div>

                  {/* 8U Blade Telemetry (Realistic Per-Slot Variance) */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5">
                      <span>8U Blade Telemetry (U1–U8)</span>
                      <span className="text-[10px] text-slate-400">
                        Power: {selectedRack.powerDrawKw} kW
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {selectedRack.blades.map((blade) => (
                        <div
                          key={blade.uSlot}
                          className={`rounded-lg px-2.5 py-1.5 border text-[11px] flex items-center justify-between ${
                            blade.needsReplacement
                              ? "bg-rose-950/45 border-rose-500/50 text-rose-100"
                              : "bg-slate-950 border-slate-800 text-slate-300"
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
                                  {blade.failureReason}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[10px] shrink-0">
                            <div>
                              {blade.tempC}°C · {blade.psuRippleMv}mV
                            </div>
                            <div
                              className={
                                blade.eccErrorsPerHr > 10
                                  ? "text-rose-400 font-bold"
                                  : blade.eccErrorsPerHr > 0
                                  ? "text-amber-400"
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

                {/* Bottom Diagnosis & Hot-Swap Trigger */}
                <div className="pt-2 border-t border-slate-800">
                  <div
                    className={`rounded-xl p-2.5 text-xs mb-2 border ${
                      selectedRack.replacementRecommended
                        ? "bg-rose-950/35 border-rose-500/35 text-rose-200"
                        : selectedRack.stabilityCluster ===
                          "TRANSIENT_THERMAL_DRIFT"
                        ? "bg-amber-950/30 border-amber-500/35 text-amber-200"
                        : "bg-emerald-950/25 border-emerald-500/30 text-emerald-200"
                    }`}
                  >
                    <span className="text-[11px] leading-relaxed block">
                      {selectedRack.replacementDiagnosis}
                    </span>
                  </div>

                  {selectedRack.replacementRecommended ? (
                    <button
                      onClick={() => handleHotSwapRack(selectedRack.id)}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-400 text-slate-950 transition flex items-center justify-center gap-2"
                    >
                      <Wrench className="w-4 h-4" />
                      Execute Cage 4 Hot-Swap on {selectedRack.id} ($48.5K)
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl text-center text-xs font-semibold bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedRack.id} Hardware Nominal
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: NEMOTRON MULTI-AGENT OPS                                   */}
        {/* ================================================================= */}
        {activeTab === "NEMOTRON_OPS" && (
          <NemotronMultiAgentOpsTab
            agentSteps={agentSteps}
            isRunningAgents={isRunningAgents}
            usedLiveApi={usedLiveApi}
            modelUsed={modelUsed}
            apiKey={apiKey}
            setApiKey={setApiKey}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            onRunNemotron={runNemotronPipeline}
            facilityNodes={twinState.facilityNodes}
            dependencyEdges={twinState.dependencyEdges}
            metrics={metrics}
            nemotronMitigated={nemotronMitigated}
          />
        )}

        {/* ================================================================= */}
        {/* TAB 3: LIFECYCLE & EXPANSION (CBRE × NMC²)                        */}
        {/* ================================================================= */}
        {activeTab === "LIFECYCLE_CBRE" && (
          <LifecycleAndExpansionTab
            racks={twinState.racks}
            sites={twinState.sites}
            shiftEvents={twinState.shiftEvents}
            metrics={metrics}
            selectedRackId={selectedRack.id}
            onSelectRack={(id) => {
              setSelectedRackId(id);
            }}
            handoffState={handoffState}
            setHandoffState={setHandoffState}
          />
        )}
      </main>
    </div>
  );
}
