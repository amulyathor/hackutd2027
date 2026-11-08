"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DISASTER_SCENARIOS,
  generateInitialDataCenterState,
  HandoffSignoffState,
  RackNode,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import CBREPortfolioPortal from "@/components/CBREPortfolioPortal";
import NMCOperationsTwin from "@/components/NMCOperationsTwin";
import HowItWorksModal from "@/components/HowItWorksModal";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  HelpCircle,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

type PersonaId = "CBRE" | "NMC";

export default function NexusDCMissionControl() {
  const [activePersona, setActivePersona] = useState<PersonaId>("CBRE");
  const [scenarioId, setScenarioId] = useState<string>("chiller_badge_cascade");
  const [timeOffsetMin, setTimeOffsetMin] = useState<number>(12);
  const [nemotronMitigated, setNemotronMitigated] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<
    "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP"
  >("CLUSTER_STABILITY");
  const [showInvisibleNetwork, setShowInvisibleNetwork] = useState<boolean>(true);
  const [selectedRackId, setSelectedRackId] = useState<string>("RACK-11");
  const [swappedRacks, setSwappedRacks] = useState<Record<string, boolean>>({});
  const [handoffState, setHandoffState] = useState<HandoffSignoffState>("PENDING");
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
      {/* 30-Second Guide Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onTriggerAutoHeal={() => runNemotronPipeline("autonomous_mitigation")}
      />

      {/* TOP COMMAND HEADER WITH PERSONA SWITCHER */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#060913]/90 border-b border-slate-800/80 px-4 lg:px-8 py-3 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Persona Switcher */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-[#76B900] p-[1.5px] shadow-md shadow-emerald-500/20">
                <div className="w-full h-full bg-[#060913] rounded-[10px] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <span className="font-black text-base tracking-tight text-white">
                NexusDC
              </span>
            </div>

            {/* PERSONA SWITCHER (CBRE vs NMC2) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-1 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setActivePersona("CBRE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activePersona === "CBRE"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                🏢 CBRE: Asset & Portfolio Portal
              </button>
              <button
                onClick={() => setActivePersona("NMC")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activePersona === "NMC"
                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                ⚡ NMC²: Autonomous Digital Twin
              </button>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>30s Tour</span>
            </button>

            {!nemotronMitigated ? (
              <button
                onClick={() => runNemotronPipeline("autonomous_mitigation")}
                disabled={isRunningAgents}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                {isRunningAgents ? "Mitigating..." : "Auto-Heal"}
              </button>
            ) : (
              <button
                onClick={handleResetSimulation}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SHARED HEADER ALERT BANNER (Active Scenario & View Toggle) */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-4">
        <div
          className={`rounded-2xl p-3.5 sm:px-5 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            nemotronMitigated
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-slate-950/90 border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                nemotronMitigated
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400 animate-pulse"
              }`}
            >
              {nemotronMitigated ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>
                  {nemotronMitigated
                    ? "✓ Facility Stabilized: Saved $80,712/hr SLA Exposure"
                    : `Active Incident: ${twinState.scenario.name}`}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-normal">
                  (Horizon: T+{metrics.horizonOffsetMin}m · Countdown: {metrics.remainingTimeToCascadeMin}m)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {activePersona === "CBRE"
                  ? "Currently viewing financial lease impact & site expansion options."
                  : "Currently viewing 3D hardware twin, telemetry, and autonomous ReAct agents."}
              </p>
            </div>
          </div>

          {/* Quick toggle to view the other side of the incident */}
          <button
            onClick={() =>
              setActivePersona((prev) => (prev === "CBRE" ? "NMC" : "CBRE"))
            }
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {activePersona === "CBRE" ? (
              <>
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch to NMC² Hardware View</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch to CBRE Asset & Lease View</span>
              </>
            )}
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* DASHBOARDS CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-5">
        {activePersona === "CBRE" ? (
          <CBREPortfolioPortal
            metrics={metrics}
            sites={twinState.sites}
            tenantContracts={twinState.tenantContracts}
            nemotronMitigated={nemotronMitigated}
            onSwitchToNMC={() => setActivePersona("NMC")}
            onRunNemotron={() => runNemotronPipeline("autonomous_mitigation")}
            isRunningAgents={isRunningAgents}
          />
        ) : (
          <NMCOperationsTwin
            metrics={metrics}
            racks={twinState.racks}
            facilityNodes={twinState.facilityNodes}
            dependencyEdges={twinState.dependencyEdges}
            shiftEvents={twinState.shiftEvents}
            scenario={twinState.scenario}
            scenarioId={scenarioId}
            setScenarioId={setScenarioId}
            timeOffsetMin={timeOffsetMin}
            setTimeOffsetMin={setTimeOffsetMin}
            nemotronMitigated={nemotronMitigated}
            selectedRack={selectedRack}
            selectedRackId={selectedRackId}
            setSelectedRackId={setSelectedRackId}
            onHotSwapRack={handleHotSwapRack}
            visualMode={visualMode}
            setVisualMode={setVisualMode}
            showInvisibleNetwork={showInvisibleNetwork}
            setShowInvisibleNetwork={setShowInvisibleNetwork}
            agentSteps={agentSteps}
            isRunningAgents={isRunningAgents}
            usedLiveApi={usedLiveApi}
            modelUsed={modelUsed}
            apiKey={apiKey}
            setApiKey={setApiKey}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            onRunNemotron={runNemotronPipeline}
            handoffState={handoffState}
            setHandoffState={setHandoffState}
          />
        )}
      </main>
    </div>
  );
}
