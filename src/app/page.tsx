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
import HowItWorksModal from "@/components/HowItWorksModal";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileCheck2,
  Flame,
  HelpCircle,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
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
      <div className="w-full h-[530px] rounded-3xl border border-slate-800 bg-[#060913] flex items-center justify-center text-sm text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing 3D Spatial Data Hall & GPU Rack Cluster Twin...</span>
        </div>
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
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

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
    <div className="min-h-screen bg-[#050811] text-slate-100 pb-16">
      {/* 30-Second Judge Tour Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onTriggerAutoHeal={() => runNemotronPipeline("autonomous_mitigation")}
      />

      {/* TOP HEADER & NAVBAR */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#060913]/90 border-b border-slate-800/80 px-4 lg:px-8 pt-3 shadow-2xl">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3">
            {/* Brand Logo & Sponsor Track Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-[#76B900] p-[1.5px] shadow-lg shadow-emerald-500/20">
                  <div className="w-full h-full bg-[#060913] rounded-[14px] flex items-center justify-center">
                    <Layers className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg tracking-tight text-white">
                      NexusDC
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                      Autonomous Twin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    Physical Real Estate · AI Compute Operations · Autonomous Agent Defense
                  </p>
                </div>
              </div>

              {/* Sponsor Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] ml-0 sm:ml-2">
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" /> CBRE
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" /> NMC²
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#76B900]" /> NVIDIA Nemotron
                </span>
              </div>
            </div>

            {/* Quick Actions & 30-Sec Tour */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>How It Works (30s Tour)</span>
              </button>

              {!nemotronMitigated ? (
                <button
                  onClick={() => runNemotronPipeline("autonomous_mitigation")}
                  disabled={isRunningAgents}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-[#76B900] hover:opacity-95 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  {isRunningAgents
                    ? "Executing Multi-Agent Loop..."
                    : "⚡ Deploy Nemotron Auto-Heal"}
                </button>
              ) : (
                <button
                  onClick={handleResetSimulation}
                  className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Incident Simulation
                </button>
              )}
            </div>
          </div>

          {/* 3-TAB NAVIGATION */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto border-t border-slate-800/60 pt-1">
            {(
              [
                {
                  id: "COMMAND_3D",
                  label: "1. 3D Twin & Hardware Console",
                  badge: `${metrics.flaggedHardwareSwapsCount} Cage 4 Swaps`,
                },
                {
                  id: "NEMOTRON_OPS",
                  label: "2. Nemotron Multi-Agent Ops",
                  badge: "4 ReAct Agents",
                },
                {
                  id: "LIFECYCLE_CBRE",
                  label: "3. Lifecycle & Site Expansion",
                  badge:
                    handoffState === "SIGNED"
                      ? "Handoff Signed"
                      : "Pending Verification",
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
                      ? "border-emerald-400 text-white bg-slate-900/70 rounded-t-xl"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-900 text-slate-500 border border-slate-800"
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

      {/* MAIN CONTAINER */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-5 space-y-5">
        {/* ================================================================= */}
        {/* HERO LIVE INCIDENT STORY BAR (Answers "What is happening?")       */}
        {/* ================================================================= */}
        <div
          className={`rounded-3xl p-5 border transition-all duration-300 shadow-2xl relative overflow-hidden ${
            nemotronMitigated
              ? "bg-emerald-950/20 border-emerald-500/40 glow-emerald"
              : "bg-slate-950/80 border-rose-500/40 glow-rose"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-4xl">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    nemotronMitigated
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  }`}
                >
                  {nemotronMitigated
                    ? "✓ Facility Stabilized & Secured"
                    : "🚨 Critical Incident In Progress"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Scenario: {twinState.scenario.name}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {nemotronMitigated
                  ? "Incident Neutralized: Auxiliary Valve Open, Workloads Migrated, SLA Protected"
                  : `Thermal & Voltage Cascade Threatens $${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr SLA Breach in ${metrics.remainingTimeToCascadeMin} Minutes`}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {nemotronMitigated
                  ? `NVIDIA Nemotron correlated badge logs with chiller flow in 4.1s. Auxiliary valve V-204B opened (+39.4 L/min restored), 48 GPU workloads live-migrated with 0 token loss, saving $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr in Hyperscale tenant penalties. 5 hardware modules staged in Cage 4 for physical hot-swap.`
                  : twinState.scenario.description}
              </p>
            </div>

            {/* Quick Action Button in Banner */}
            <div className="shrink-0">
              {!nemotronMitigated ? (
                <button
                  onClick={() => runNemotronPipeline("autonomous_mitigation")}
                  disabled={isRunningAgents}
                  className="w-full lg:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-400 via-emerald-500 to-[#76B900] hover:brightness-110 text-slate-950 transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  {isRunningAgents ? "Executing AI Agents..." : "Auto-Heal with Nemotron"}
                </button>
              ) : (
                <button
                  onClick={handleResetSimulation}
                  className="w-full lg:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Simulation
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 PRIMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: SLA Financial Risk */}
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-slate-800 hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CBRE Tenant SLA Risk
              </span>
              <div
                className={`text-2xl font-black mt-0.5 tracking-tight ${
                  nemotronMitigated ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {nemotronMitigated
                  ? "$0 / hr"
                  : `$${metrics.activeSlaExposurePerHrUsd.toLocaleString()} / hr`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {nemotronMitigated
                  ? `Protected · Saved $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr`
                  : `Lease #HYP-02 Clause 14.2 penalty`}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                nemotronMitigated
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {nemotronMitigated ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              )}
            </div>
          </div>

          {/* Card 2: Time to Cascade Outage */}
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-slate-800 hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Time to Cascade Outage
              </span>
              <div
                className={`text-2xl font-black mt-0.5 tracking-tight ${
                  nemotronMitigated ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {nemotronMitigated
                  ? "Stabilized"
                  : `${metrics.remainingTimeToCascadeMin} Minutes`}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {nemotronMitigated
                  ? "Loop pressure & temps normalized"
                  : `At current T+${metrics.horizonOffsetMin}m drift rate`}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Flagged Hardware Swaps */}
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-slate-800 hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Hardware Swap Queue
              </span>
              <div className="text-2xl font-black text-white mt-0.5 tracking-tight">
                {metrics.flaggedHardwareSwapsCount} Racks{" "}
                <span className="text-xs font-semibold text-amber-400">
                  (+{metrics.transientDriftRacksCount} cooling drift)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                RACK-11, 12, 19, 20, 27 staged in Cage 4
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 text-rose-400 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: DFW Site Power Margin */}
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-slate-800 hover:border-slate-700 transition">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Site Power & Expansion
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5 tracking-tight">
                {metrics.dfwAvailableMarginMw} MW Avail{" "}
                <span className="text-xs font-semibold text-slate-300">
                  ({metrics.dfwUtilizationPct}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                18MW expansion → CBRE Hillsboro OR (96% fit)
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: 3D TWIN & HARDWARE CONSOLE                                 */}
        {/* ================================================================= */}
        {activeTab === "COMMAND_3D" && (
          <div className="space-y-5">
            {/* Control Strip: Scenario Cards + Horizon Scrubber + 3D View Toggles */}
            <div className="glass-panel rounded-3xl p-5 border-slate-800">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
                {/* 3 Scenario Cards (5 cols) */}
                <div className="xl:col-span-5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Select Cascade Failure Scenario:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DISASTER_SCENARIOS.map((scen) => {
                      const isSel = scenarioId === scen.id;
                      const scenSla = Math.round(
                        scen.baseSlaLossPerHrUsd * (1 + timeOffsetMin * 0.015)
                      );
                      return (
                        <button
                          key={scen.id}
                          onClick={() => {
                            setScenarioId(scen.id);
                            setNemotronMitigated(false);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSel
                              ? "bg-slate-800/90 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/10"
                              : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold leading-tight truncate">
                            {scen.shortName}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono mt-1">
                            ${(scenSla / 1000).toFixed(1)}k/hr risk
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Time-Travel Horizon Scrubber (4 cols) */}
                <div className="xl:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      Time-Travel Cascade Horizon
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      T+{metrics.horizonOffsetMin}m (Breach in T-{metrics.remainingTimeToCascadeMin}m)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={2}
                    value={timeOffsetMin}
                    onChange={(e) => setTimeOffsetMin(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                    <span>T+0m (Onset)</span>
                    <span>T+12m (Thermal Drift)</span>
                    <span>T+24m (Critical Breach)</span>
                  </div>
                </div>

                {/* 3D Visual Modes (3 cols) */}
                <div className="xl:col-span-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    3D Diagnostic Lens:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setVisualMode("CLUSTER_STABILITY")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "CLUSTER_STABILITY"
                          ? "bg-slate-800 border-slate-600 text-white"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Clusters
                    </button>
                    <button
                      onClick={() => setVisualMode("REPLACEMENT_XRAY")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "REPLACEMENT_XRAY"
                          ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-rose-400" />
                      Swap X-Ray
                    </button>
                    <button
                      onClick={() => setVisualMode("THERMAL_HEATMAP")}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center gap-1 ${
                        visualMode === "THERMAL_HEATMAP"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Thermal
                    </button>
                  </div>
                  <button
                    onClick={() => setShowInvisibleNetwork((v) => !v)}
                    className="w-full px-3 py-1.5 rounded-xl text-[11px] font-semibold border bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {showInvisibleNetwork
                      ? "3D Dependency Beams: ON"
                      : "3D Dependency Beams: OFF"}
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Canvas (8 Cols) + Tesla-grade Hardware Diagnostic Terminal (4 Cols) */}
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

                {/* Priority Rack Navigation Bar */}
                <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 mr-1.5">
                      Quick Inspect:
                    </span>
                    {[
                      { id: "RACK-11", label: "R-11 (Manifold Leak)" },
                      { id: "RACK-12", label: "R-12 (TIM Pumpout)" },
                      { id: "RACK-19", label: "R-19 (PSU Ripple)" },
                      { id: "RACK-20", label: "R-20 (PSU Harmonics)" },
                      { id: "RACK-27", label: "R-27 (CDU Bearing)" },
                      { id: "RACK-09", label: "R-09 (Cooling Drift)" },
                      { id: "RACK-01", label: "R-01 (Optimal)" },
                    ].map((item) => {
                      const rObj = twinState.racks.find((x) => x.id === item.id);
                      if (!rObj) return null;
                      const isSel = selectedRack.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedRackId(item.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                            isSel
                              ? "bg-white text-slate-950 border-white shadow-lg"
                              : rObj.replacementRecommended
                              ? "bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/60"
                              : rObj.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                              ? "bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                          }`}
                        >
                          {item.label} ({rObj.healthScore}%)
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click any rack to inspect
                  </span>
                </div>
              </div>

              {/* RIGHT PANEL: Tesla-Grade Hardware Diagnostic Terminal */}
              <div className="xl:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between border-slate-800 shadow-2xl">
                <div>
                  {/* Rack Header */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        {selectedRack.clusterName}
                      </span>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {selectedRack.label}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {selectedRack.gpuArchitecture}
                      </span>
                    </div>

                    {/* Bold Health Score Badge */}
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                          selectedRack.replacementRecommended
                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                            : selectedRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                            : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedRack.replacementRecommended
                              ? "bg-rose-500"
                              : selectedRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        Health {selectedRack.healthScore}%
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        {selectedRack.replacementRecommended
                          ? "SWAP REQUIRED"
                          : selectedRack.stabilityCluster.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>

                  {/* 4 Clean Metric Tiles */}
                  <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Coolant</span>
                      <strong
                        className={`text-sm ${
                          selectedRack.coolantTempC >= 40 ? "text-rose-400" : "text-white"
                        }`}
                      >
                        {selectedRack.coolantTempC}°C
                      </strong>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Peak Ripple</span>
                      <strong
                        className={`text-sm ${
                          selectedRack.voltageRippleMv >= 50 ? "text-rose-400" : "text-white"
                        }`}
                      >
                        {selectedRack.voltageRippleMv}mV
                      </strong>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Flow Rate</span>
                      <strong
                        className={`text-sm ${
                          selectedRack.coolantFlowLpm < 28 ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {selectedRack.coolantFlowLpm}L/m
                      </strong>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Total ECC</span>
                      <strong
                        className={`text-sm ${
                          selectedRack.totalEccErrorsPerHr > 10 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {selectedRack.totalEccErrorsPerHr}/h
                      </strong>
                    </div>
                  </div>

                  {/* Cross-Silo Passport */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-3 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Facility Loop / PDU:</span>
                      <span className="font-mono text-slate-200">
                        {selectedRack.crahUnitId} · {selectedRack.pduFeedId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tenant Lease:</span>
                      <span className="font-semibold text-slate-200">
                        {selectedRack.tenantName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rack SLA Share:</span>
                      <span
                        className={`font-bold font-mono ${
                          selectedRack.slaPenaltyPerHourUsd > 0 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        ${selectedRack.slaPenaltyPerHourUsd.toLocaleString()}/hr
                      </span>
                    </div>
                  </div>

                  {/* 8U Server Tray Chassis Breakdown */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
                      <span>Chassis Blade Trays (U1–U8)</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Power: {selectedRack.powerDrawKw} kW
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {selectedRack.blades.map((blade) => (
                        <div
                          key={blade.uSlot}
                          className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between transition ${
                            blade.needsReplacement
                              ? "bg-rose-950/50 border-rose-500/60 text-rose-100"
                              : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              U{blade.uSlot}
                            </span>
                            <div>
                              <div className="font-semibold text-white text-[11px] leading-tight">
                                {blade.model}
                              </div>
                              {blade.failureReason && (
                                <div className="text-[10px] text-rose-300 font-medium mt-0.5">
                                  ⚠️ {blade.failureReason}
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

                {/* Bottom Diagnosis & 1-Click Cage 4 Hot-Swap */}
                <div className="pt-2 border-t border-slate-800">
                  <div
                    className={`rounded-2xl p-3 text-xs mb-2.5 border ${
                      selectedRack.replacementRecommended
                        ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
                        : selectedRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                        ? "bg-amber-950/35 border-amber-500/40 text-amber-200"
                        : "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    }`}
                  >
                    <strong className="block mb-0.5 font-bold">
                      {selectedRack.replacementRecommended
                        ? `Cage 4 Hardware Swap Required (${selectedRack.replacementUrgency}):`
                        : "Diagnostic Status:"}
                    </strong>
                    <span className="text-[11px] leading-relaxed block text-slate-200">
                      {selectedRack.replacementDiagnosis}
                    </span>
                  </div>

                  {selectedRack.replacementRecommended ? (
                    <button
                      onClick={() => handleHotSwapRack(selectedRack.id)}
                      className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-rose-500 hover:bg-rose-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-xl shadow-rose-500/30"
                    >
                      <Wrench className="w-4 h-4" />
                      Execute Cage 4 Hot-Swap on {selectedRack.id} ($48.5K)
                    </button>
                  ) : (
                    <div className="w-full py-2.5 rounded-2xl text-center text-xs font-bold bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {selectedRack.id} Hardware Verified Nominal
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
        {/* TAB 3: LIFECYCLE & SITE EXPANSION (CBRE × NMC²)                   */}
        {/* ================================================================= */}
        {activeTab === "LIFECYCLE_CBRE" && (
          <LifecycleAndExpansionTab
            racks={twinState.racks}
            sites={twinState.sites}
            shiftEvents={twinState.shiftEvents}
            metrics={metrics}
            selectedRackId={selectedRack.id}
            onSelectRack={(id) => setSelectedRackId(id)}
            handoffState={handoffState}
            setHandoffState={setHandoffState}
          />
        )}
      </main>
    </div>
  );
}
