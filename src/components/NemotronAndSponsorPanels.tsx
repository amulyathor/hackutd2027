"use client";

import React, { useState } from "react";
import {
  CBREFacilityNode,
  InvisibleDependencyEdge,
  SynchronizedMetrics,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  KeyRound,
  Play,
  ShieldAlert,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

interface Props {
  agentSteps: AgentStepOutput[];
  isRunningAgents: boolean;
  usedLiveApi: boolean;
  modelUsed: string;
  apiKey: string;
  setApiKey: (val: string) => void;
  customPrompt: string;
  setCustomPrompt: (val: string) => void;
  onRunNemotron: (mode?: string) => void;
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  metrics: SynchronizedMetrics;
  nemotronMitigated: boolean;
}

export default function NemotronMultiAgentOpsTab({
  agentSteps,
  isRunningAgents,
  usedLiveApi,
  modelUsed,
  apiKey,
  setApiKey,
  customPrompt,
  setCustomPrompt,
  onRunNemotron,
  facilityNodes,
  dependencyEdges,
  metrics,
  nemotronMitigated,
}: Props) {
  // Default all agent reasoning & tool payload accordions to COLLAPSED
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>(
    {}
  );

  const toggleAgentAccordion = (agentId: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: 4-AGENT REACT ORCHESTRATOR */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#76B900]/20 text-[#76B900] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                NVIDIA Nemotron 4-Agent ReAct Loop (Reason → Act → Observe)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                {modelUsed}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  usedLiveApi
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                {usedLiveApi ? "✓ Live NIM API Active" : "Deterministic Engine Active"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous multi-agent system executing live tool calling to diagnose and heal cross-silo data center failures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional nvapi-... key"
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 w-52 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={() => onRunNemotron("autonomous_mitigation")}
              disabled={isRunningAgents}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningAgents
                ? "Running 4-Agent Pipeline..."
                : nemotronMitigated
                ? "Re-Run ReAct Pipeline"
                : "Execute Autonomous Mitigation"}
            </button>
          </div>
        </div>

        {/* Custom Operator Mission Directive Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Terminal className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Give the 4 agents an instruction (e.g. 'Isolate PSU ripple racks, drain Cluster B, and compare Hillsboro expansion')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <button
            onClick={() => onRunNemotron("custom_query")}
            disabled={isRunningAgents}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Dispatch to Agents
          </button>
        </div>

        {/* 4 Agent Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agentSteps.map((step, index) => {
            const isExpanded = Boolean(expandedAgents[step.agentId]);
            return (
              <div
                key={step.agentId}
                className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  {/* Agent Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center">
                        0{index + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {step.agentName}
                        </h4>
                        <p className="text-[11px] text-slate-400">{step.role}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                      {step.reactPhase}
                    </span>
                  </div>

                  {/* Summary Action */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 mb-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Action Taken
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {step.summaryAction}
                    </p>
                  </div>

                  {/* Agent Synthesis Conclusion */}
                  <div className="text-xs text-emerald-300 flex items-start gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{step.conclusion}</span>
                  </div>
                </div>

                {/* Collapsible Accordion for /think reasoning & tool execution */}
                <div className="border-t border-slate-800/80 pt-2.5">
                  <button
                    onClick={() => toggleAgentAccordion(step.agentId)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      View /think Reasoning & Tool Payloads ({step.toolCalls.length} calls)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {step.toolCalls.reduce((a, b) => a + b.latencyMs, 0)}ms
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 space-y-2.5 pt-2 border-t border-slate-900">
                      <div className="bg-[#060913] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">
                        {step.thinkTrace}
                      </div>

                      {step.toolCalls.map((tc) => (
                        <div
                          key={tc.id}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-mono text-xs mb-1">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5" />
                              {tc.toolName}()
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {tc.status} · {tc.latencyMs}ms
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono break-all mb-1.5 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                            args: {JSON.stringify(tc.arguments)}
                          </div>
                          <div className="text-[11px] text-slate-200 bg-slate-950/70 rounded-lg px-2.5 py-1.5 border-l-2 border-emerald-500">
                            <strong className="text-slate-400">Observation:</strong>{" "}
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

      {/* SECTION 2: CROSS-SILO CAUSAL DAG GRAPH */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              CBRE "The Invisible Network": Cross-Silo Causal Cascade Graph
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How a physical door badge entry triggers a cooling loop failure, leading to server overheating and tenant lease breach.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              nemotronMitigated
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/15 border-amber-500/40 text-amber-300"
            }`}
          >
            {nemotronMitigated
              ? "✓ Cascade Severed by AI"
              : `Breach Countdown: T-${metrics.remainingTimeToCascadeMin} mins`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {dependencyEdges.map((edge, idx) => (
            <div
              key={edge.id}
              className={`rounded-2xl p-4 border transition ${
                edge.activeInCascade
                  ? edge.severity === "CRITICAL"
                    ? "bg-slate-950/90 border-rose-500/50 shadow-lg shadow-rose-500/5"
                    : "bg-slate-950/90 border-amber-500/50"
                  : "bg-slate-950/60 border-emerald-500/35"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                    STEP 0{idx + 1}
                  </span>
                  <span>{edge.sourceLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-200">{edge.targetLabel}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    edge.activeInCascade
                      ? edge.severity === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {edge.activeInCascade
                    ? `T-${edge.propagationLagMin}m lag`
                    : "Isolated"}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {edge.causalMechanism}
              </p>
            </div>
          ))}
        </div>

        {/* 4 Facility Silo Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {facilityNodes.map((node) => {
            const Icon =
              node.category === "ACCESS_CONTROL"
                ? ShieldAlert
                : node.category === "HVAC_COOLING"
                ? Cpu
                : node.category === "UTILITY_POWER"
                ? Zap
                : Building2;
            return (
              <div
                key={node.id}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {node.category.replace(/_/g, " ")}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                <div className="font-bold text-white text-xs truncate mb-1">
                  {node.name}
                </div>
                <div
                  className={`text-xs font-bold mb-1 ${
                    node.status === "FAILING"
                      ? "text-rose-400"
                      : node.status === "WARNING"
                      ? "text-amber-300"
                      : "text-emerald-400"
                  }`}
                >
                  {node.metricValue}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {node.anomalyDetail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
