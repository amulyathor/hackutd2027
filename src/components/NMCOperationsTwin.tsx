"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  CBREFacilityNode,
  DisasterScenario,
  HandoffSignoffState,
  InvisibleDependencyEdge,
  RackNode,
  ShiftHandoffEvent,
  SynchronizedMetrics,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Cpu,
  FileCheck2,
  Flame,
  KeyRound,
  Play,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Wrench,
  X,
  Zap,
} from "lucide-react";

const DataHall3DCanvas = dynamic(
  () => import("@/components/DataHall3DCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[510px] rounded-3xl border border-slate-800 bg-[#060913] flex items-center justify-center text-sm text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading 3D Autonomous Twin & Hardware Clusters...</span>
        </div>
      </div>
    ),
  }
);

interface Props {
  metrics: SynchronizedMetrics;
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  shiftEvents: ShiftHandoffEvent[];
  scenario: DisasterScenario;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  timeOffsetMin: number;
  setTimeOffsetMin: (val: number) => void;
  nemotronMitigated: boolean;
  selectedRack: RackNode;
  selectedRackId: string;
  setSelectedRackId: (id: string) => void;
  onHotSwapRack: (id: string) => void;
  visualMode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP";
  setVisualMode: (mode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP") => void;
  showInvisibleNetwork: boolean;
  setShowInvisibleNetwork: React.Dispatch<React.SetStateAction<boolean>>;
  agentSteps: AgentStepOutput[];
  isRunningAgents: boolean;
  usedLiveApi: boolean;
  modelUsed: string;
  apiKey: string;
  setApiKey: (val: string) => void;
  customPrompt: string;
  setCustomPrompt: (val: string) => void;
  onRunNemotron: (mode?: string) => void;
  handoffState: HandoffSignoffState;
  setHandoffState: React.Dispatch<React.SetStateAction<HandoffSignoffState>>;
}

export default function NMCOperationsTwin({
  metrics,
  racks,
  facilityNodes,
  dependencyEdges,
  shiftEvents,
  scenario,
  scenarioId,
  setScenarioId,
  timeOffsetMin,
  setTimeOffsetMin,
  nemotronMitigated,
  selectedRack,
  selectedRackId,
  setSelectedRackId,
  onHotSwapRack,
  visualMode,
  setVisualMode,
  showInvisibleNetwork,
  setShowInvisibleNetwork,
  agentSteps,
  isRunningAgents,
  usedLiveApi,
  modelUsed,
  apiKey,
  setApiKey,
  customPrompt,
  setCustomPrompt,
  onRunNemotron,
  handoffState,
  setHandoffState,
}: Props) {
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>("Elena Rostova (Night Shift Lead)");

  const toggleAgentTrace = (agentId: string) => {
    setExpandedAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  };

  const advanceHandoff = () => {
    if (handoffState === "PENDING") {
      setHandoffState("VERIFIED");
    } else if (handoffState === "VERIFIED") {
      setHandoffState("SIGNED");
    }
  };

  return (
    <div className="space-y-6">
      {/* CONTROL & HORIZON BAR */}
      <div className="glass-panel rounded-3xl p-5 border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
          {/* Cascade Scenario Selector (5 cols) */}
          <div className="xl:col-span-5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Cascade Failure Scenario
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "chiller_badge_cascade", name: "CRAH-02 Loop Drift" },
                { id: "bms_zeroday_voltage", name: "Substation Ripple" },
                { id: "grid_substation_brownout", name: "ERCOT Grid Sag" },
              ].map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => setScenarioId(scen.id)}
                  className={`p-2.5 rounded-2xl border text-left text-xs font-bold transition ${
                    scenarioId === scen.id
                      ? "bg-slate-800 border-sky-400 text-white shadow-lg shadow-sky-500/10"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="truncate">{scen.name}</div>
                  <div className="text-[10px] text-sky-400 font-normal mt-0.5">
                    T-{metrics.remainingTimeToCascadeMin}m breach
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time-Travel Horizon Scrubber (4 cols) */}
          <div className="xl:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Physical Cascade Horizon
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
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>T+0m (Onset)</span>
              <span>T+12m (Thermal Drift)</span>
              <span>T+24m (Critical Breach)</span>
            </div>
          </div>

          {/* 3D Visual Lenses (3 cols) */}
          <div className="xl:col-span-3 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              3D Diagnostic Mode
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setVisualMode("CLUSTER_STABILITY")}
                className={`py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  visualMode === "CLUSTER_STABILITY"
                    ? "bg-slate-800 border-slate-600 text-white"
                    : "bg-slate-950/80 border-slate-800 text-slate-400"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Clusters
              </button>
              <button
                onClick={() => setVisualMode("REPLACEMENT_XRAY")}
                className={`py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  visualMode === "REPLACEMENT_XRAY"
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                    : "bg-slate-950/80 border-slate-800 text-slate-400"
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
                Swap X-Ray
              </button>
              <button
                onClick={() => setVisualMode("THERMAL_HEATMAP")}
                className={`py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  visualMode === "THERMAL_HEATMAP"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "bg-slate-950/80 border-slate-800 text-slate-400"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Thermal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D TWIN CANVAS (8 COLS) + RACK TELEMETRY INSPECTOR (4 COLS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: 3D Twin Canvas */}
        <div className="xl:col-span-8 space-y-3">
          <DataHall3DCanvas
            racks={racks}
            facilityNodes={facilityNodes}
            dependencyEdges={dependencyEdges}
            selectedRackId={selectedRack.id}
            onSelectRack={setSelectedRackId}
            visualMode={visualMode}
            showInvisibleNetwork={showInvisibleNetwork}
            nemotronMitigated={nemotronMitigated}
          />

          {/* Quick Select Rack Bar */}
          <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1.5">
                Select Rack:
              </span>
              {[
                { id: "RACK-11", label: "R-11 (Manifold Leak)" },
                { id: "RACK-12", label: "R-12 (TIM Pumpout)" },
                { id: "RACK-19", label: "R-19 (PSU Ripple)" },
                { id: "RACK-20", label: "R-20 (Harmonics)" },
                { id: "RACK-27", label: "R-27 (CDU Bearing)" },
                { id: "RACK-09", label: "R-09 (Cooling Drift)" },
                { id: "RACK-01", label: "R-01 (Nominal)" },
              ].map((item) => {
                const rObj = racks.find((x) => x.id === item.id);
                if (!rObj) return null;
                const isSel = selectedRack.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedRackId(item.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                      isSel
                        ? "bg-white text-slate-950 border-white shadow-md"
                        : rObj.replacementRecommended
                        ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                        : rObj.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                        ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    {item.label} ({rObj.healthScore}%)
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-400">
              Click any rack in 3D to inspect
            </span>
          </div>
        </div>

        {/* Right: Selected Rack Telemetry Inspector Drawer */}
        <div className="xl:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between border-slate-800 shadow-2xl">
          <div>
            {/* Header */}
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
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${
                    selectedRack.replacementRecommended
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                      : selectedRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  }`}
                >
                  Health {selectedRack.healthScore}%
                </span>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  {selectedRack.replacementRecommended
                    ? "SWAP REQUIRED"
                    : selectedRack.stabilityCluster.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
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
                <span className="text-[10px] text-slate-400 block">Ripple</span>
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
                <span className="text-[10px] text-slate-400 block">ECC Errors</span>
                <strong
                  className={`text-sm ${
                    selectedRack.totalEccErrorsPerHr > 10 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {selectedRack.totalEccErrorsPerHr}/h
                </strong>
              </div>
            </div>

            {/* Realistic 8U Blade Bay Variance */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
                <span>Chassis Blade Trays (U1–U8)</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Load: {selectedRack.powerDrawKw} kW
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {selectedRack.blades.map((blade) => (
                  <div
                    key={blade.uSlot}
                    className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between transition ${
                      blade.needsReplacement
                        ? "bg-rose-950/50 border-rose-500/60 text-rose-100"
                        : "bg-slate-950/70 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        U{blade.uSlot}
                      </span>
                      <div>
                        <div className="font-semibold text-white text-[11px] leading-tight">
                          {blade.model}
                        </div>
                        {blade.failureReason && (
                          <div className="text-[10px] text-rose-300 font-medium">
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

          {/* Action Button: Stage Cage 4 Hot-Swap */}
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
                  ? "Physical Degradation Diagnosed:"
                  : "Diagnostic Status:"}
              </strong>
              <span className="text-[11px] leading-relaxed block text-slate-200">
                {selectedRack.replacementDiagnosis}
              </span>
            </div>

            {selectedRack.replacementRecommended ? (
              <button
                onClick={() => onHotSwapRack(selectedRack.id)}
                className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-rose-500 hover:bg-rose-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30"
              >
                <Wrench className="w-4 h-4" />
                Stage Cage 4 Hot-Swap ({selectedRack.id})
              </button>
            ) : (
              <div className="w-full py-2.5 rounded-2xl text-center text-xs font-bold bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {selectedRack.id} Hardware Verified Nominal
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEMOTRON 4-AGENT REACT COMMAND FEED */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#76B900]" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Nemotron 4-Agent Autonomous Defense Command Center
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              4 specialized ReAct agents collaborating in real time to isolate faults, suppress electrical noise, and auto-heal the facility.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-900 border border-slate-800 text-slate-300">
            {modelUsed}
          </span>
        </div>

        {/* 4 Agent Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentSteps.map((agent, index) => {
            const isExpanded = Boolean(expandedAgents[agent.agentId]);
            return (
              <div
                key={agent.agentId}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        0{index + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">
                        {agent.agentName}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {agent.role}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-2.5 text-xs text-slate-200 leading-relaxed font-medium">
                    {agent.summaryAction}
                  </div>

                  <div className="text-xs text-emerald-300 flex items-start gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{agent.conclusion}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => toggleAgentTrace(agent.agentId)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      View Agent Reasoning & Tool Execution
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {agent.toolCalls.length} calls
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 pt-2 border-t border-slate-900">
                      <div className="bg-[#060913] border border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-300 whitespace-pre-line leading-relaxed">
                        {agent.thinkTrace}
                      </div>

                      {agent.toolCalls.map((tc) => (
                        <div
                          key={tc.id}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px]"
                        >
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="text-emerald-400 font-bold">
                              {tc.toolName}()
                            </span>
                            <span className="text-slate-500">{tc.latencyMs}ms</span>
                          </div>
                          <div className="font-mono text-slate-400 break-all mb-1 bg-slate-950 p-1.5 rounded">
                            {JSON.stringify(tc.arguments)}
                          </div>
                          <div className="text-slate-200 bg-slate-950 px-2 py-1 rounded border-l-2 border-emerald-500">
                            {tc.observation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ZERO-DROP SHIFT FLIGHT RECORDER */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                NMC² Zero-Drop Shift Flight Recorder (Swing C → Night Shift A)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified digital handoff ensuring night shift engineers never inherit uncommunicated cooling drifts or broken valves.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                handoffState === "SIGNED"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : handoffState === "VERIFIED"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {handoffState === "SIGNED"
                ? "✓ SIGNED & LOCKED"
                : handoffState === "VERIFIED"
                ? "VERIFIED (AWAITING SIGNATURE)"
                : "PENDING VERIFICATION"}
            </span>

            <button
              onClick={() => setIsHandoffModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <FileCheck2 className="w-4 h-4" />
              {handoffState === "SIGNED"
                ? "View Signed Handoff"
                : "Verify & Sign Handoff"}
            </button>
          </div>
        </div>

        {/* 3 Read-Only Timeline Entries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {shiftEvents.map((ev, i) => (
            <div
              key={ev.id}
              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between text-xs"
            >
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-bold block w-fit mb-2">
                  Entry 0{i + 1} · {ev.timestamp}
                </span>
                <h4 className="font-bold text-white mb-1.5">{ev.title}</h4>
                <p className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border-l-2 border-slate-700 mb-2 leading-relaxed">
                  {ev.unstructuredNote}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <strong className="text-slate-300">Action:</strong>{" "}
                {ev.actionRequiredNextShift}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UNIFIED SHIFT SIGN-OFF MODAL */}
      {isHandoffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  NMC² Operational Flight Recorder · Packet #HO-9942
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Swing Shift C → Night Shift A Handoff Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex justify-between">
                <span className="text-slate-400">Active SLA Exposure:</span>
                <strong className="text-white font-mono">
                  ${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr (Breach in T-{metrics.remainingTimeToCascadeMin}m)
                </strong>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex justify-between">
                <span className="text-slate-400">Cage 4 Hot-Swaps Staged:</span>
                <strong className="text-rose-400 font-mono">
                  {metrics.flaggedSwapRackIds.join(", ") || "All Swapped"}
                </strong>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Incoming Night Shift Lead Signature:
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
              {handoffState !== "SIGNED" ? (
                <button
                  onClick={advanceHandoff}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {handoffState === "PENDING"
                    ? "Step 1: Verify Logs & Telemetry"
                    : "Step 2: Sign & Lock Shift Handoff"}
                </button>
              ) : (
                <div className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Signed by {operatorName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
