"use client";

import React from "react";
import {
  CBRERealEstateSite,
  ShiftHandoffEvent,
} from "@/lib/datacenter-twin";
import { AgentStepOutput } from "@/app/api/nemotron/route";
import {
  Bot,
  Building,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Cpu,
  KeyRound,
  Play,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";

interface Props {
  agentSteps: AgentStepOutput[];
  isRunningAgents: boolean;
  usedLiveApi: boolean;
  apiErrorNote?: string;
  apiKey: string;
  setApiKey: (val: string) => void;
  customPrompt: string;
  setCustomPrompt: (val: string) => void;
  onRunNemotron: (mode?: string) => void;
  sites: CBRERealEstateSite[];
  shiftEvents: ShiftHandoffEvent[];
  onAcknowledgeShift: (id: string) => void;
  nemotronMitigated: boolean;
}

export default function NemotronAndSponsorPanels({
  agentSteps,
  isRunningAgents,
  usedLiveApi,
  apiErrorNote,
  apiKey,
  setApiKey,
  customPrompt,
  setCustomPrompt,
  onRunNemotron,
  sites,
  shiftEvents,
  onAcknowledgeShift,
  nemotronMitigated,
}: Props) {
  return (
    <div className="space-y-5">
      {/* SECTION 1: NVIDIA NEMOTRON MULTI-AGENT REACT & TOOL-CALLING WAR ROOM */}
      <div className="bg-slate-900/80 border border-[#76B900]/45 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#76B900]/20 text-[#9be61d] border border-[#76B900]/40">
                NVIDIA Nemotron Track · Beyond a Chatbot
              </span>
              <span className="text-xs text-slate-400 font-mono">
                model: nvidia/nvidia-nemotron-nano-9b-v2 (/think enabled)
              </span>
              {usedLiveApi && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LIVE NVIDIA NIM API CONNECTED
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#76B900]" />
              Autonomous 4-Agent ReAct Orchestrator (Reason → Act → Observe + Tool Calling)
            </h2>
          </div>

          {/* NVIDIA API Key Input + Trigger Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional: nvapi-... key (build.nvidia.com)"
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 w-64 focus:outline-none focus:border-[#76B900]"
              />
            </div>

            <button
              onClick={() => onRunNemotron("autonomous_mitigation")}
              disabled={isRunningAgents}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#76B900] hover:bg-[#86d100] text-slate-950 transition shadow-lg shadow-[#76B900]/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningAgents
                ? "Executing Multi-Agent ReAct Loop..."
                : nemotronMitigated
                ? "Re-Run Nemotron Multi-Agent Pipeline"
                : "Execute Nemotron Autonomous Mitigation"}
            </button>
          </div>
        </div>

        {/* Custom Operator Mission Directive Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Terminal className="w-4 h-4 text-[#76B900] absolute left-3 top-2.5" />
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Give Nemotron a multi-step engineering directive (e.g., 'Isolate racks needing PSU replacement, drain Cluster B, and compare CBRE Hillsboro vs DFW expansion')..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#76B900]"
            />
          </div>
          <button
            onClick={() => onRunNemotron("custom_query")}
            disabled={isRunningAgents}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#76B900]" />
            Dispatch Directive to Agents
          </button>
        </div>

        {apiErrorNote && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
            <strong>Note:</strong> {apiErrorNote} — Running deterministic local ReAct & tool-calling engine fallback.
          </div>
        )}

        {/* 4 Specialized Agent Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agentSteps.map((step, index) => (
            <div
              key={step.agentId}
              className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#76B900]/20 border border-[#76B900]/50 text-[#9be61d] font-bold text-xs flex items-center justify-center">
                      0{index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{step.agentName}</h4>
                      <p className="text-[10px] text-slate-400">{step.role}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 border border-slate-700 text-sky-300">
                    {step.reactPhase}
                  </span>
                </div>

                {/* Nemotron /think Reasoning Trace */}
                <div className="bg-[#050811] border border-slate-800/80 rounded-lg p-2.5 mb-2.5 font-mono text-[11px] text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                  {step.thinkTrace}
                </div>

                {/* Tool Calls Executed */}
                <div className="space-y-1.5 mb-2.5">
                  {step.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[11px]"
                    >
                      <div className="flex items-center justify-between font-mono text-xs mb-1">
                        <span className="text-[#9be61d] font-semibold flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5" />
                          {tc.toolName}()
                        </span>
                        <span className="text-[10px] text-emerald-400">
                          {tc.status} · {tc.latencyMs}ms
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mb-1">
                        args: {JSON.stringify(tc.arguments)}
                      </div>
                      <div className="text-[11px] text-slate-200 bg-slate-950/70 rounded px-2 py-1 border-l-2 border-[#76B900]">
                        <strong className="text-slate-400">Observe:</strong> {tc.observation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Synthesis Conclusion */}
              <div className="pt-2 border-t border-slate-800/80 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{step.conclusion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: CBRE REAL ESTATE PORTFOLIO EXPANSION & NMC² ZERO-DROP SHIFT HANDOFF */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* CBRE Real Estate Capacity, CapEx vs. Lease Expansion Optimizer */}
        <div className="bg-slate-900/80 border border-emerald-500/35 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                CBRE Commercial Real Estate · Site Capacity & Expansion Engine
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                <Building className="w-4 h-4 text-emerald-400" />
                In-Place Rack Replacement vs. Hyperscale Real Estate Expansion
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
              18MW Expansion Needed
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Evaluates physical building constraints (substation MW ceiling, slab floor-loading lbs/sq.ft, PUE, liquid cooling loops) across CBRE’s data center real estate portfolio when unstable clusters require upgrading to high-density NVIDIA Blackwell racks.
          </p>

          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className={`rounded-xl p-3.5 border transition ${
                  site.cbreRecommendationScore >= 90
                    ? "bg-emerald-950/25 border-emerald-500/50 shadow-lg"
                    : "bg-slate-950/80 border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{site.name}</h4>
                      {site.cbreRecommendationScore >= 90 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                          CBRE #1 RECOMMENDED TARGET
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {site.market} · {site.tier} · {site.substationRedundancy}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">
                      {site.cbreRecommendationScore}/100 Fit
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ${site.leaseRatePerKwMonthUsd}/kW-mo
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 my-2 bg-slate-900/90 rounded-lg p-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Avail Power</span>
                    <strong className="text-white">
                      {site.availablePowerMw} MW
                    </strong>{" "}
                    <span className="text-slate-500">/ {site.totalPowerMw}M</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PUE Efficiency</span>
                    <strong className="text-emerald-300">{site.pue} PUE</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Slab Load</span>
                    <strong className="text-white">{site.floorLoadingLbsSqFt} lbs/ft²</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Unstable Racks</span>
                    <strong
                      className={
                        site.unstableRacksCount > 0 ? "text-rose-400" : "text-emerald-400"
                      }
                    >
                      {site.unstableRacksCount} Racks
                    </strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {site.expansionFitReason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* NorthMark Compute & Cloud (NMC²) Zero-Drop Shift Handoff Flight Recorder */}
        <div className="bg-slate-900/80 border border-sky-500/35 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  NorthMark Compute & Cloud (NMC²) · Keep the World Running
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <ClipboardCheck className="w-4 h-4 text-sky-400" />
                  Zero-Drop Shift Handoff & Hardware Replacement Flight Recorder
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-500/40 text-sky-300">
                Swing C → Night Shift A
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Eliminates missed warnings and unclear shift handoffs by automatically correlating unstructured technician notes with live rack telemetry and staging exact physical replacement work orders.
            </p>

            <div className="space-y-3">
              {shiftEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`rounded-xl p-3.5 border ${
                    ev.acknowledged
                      ? "bg-slate-950/60 border-emerald-500/35"
                      : "bg-slate-950/90 border-amber-500/45"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{ev.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {ev.timestamp} · {ev.author}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-200/90 italic bg-slate-900/90 rounded-lg p-2 border-l-2 border-amber-400 mb-2">
                    {ev.unstructuredNote}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ev.correlatedSensors.map((sensor) => (
                      <span
                        key={sensor}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-sky-300 font-mono"
                      >
                        {sensor}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] text-slate-200">
                      <strong className="text-sky-400">Incoming Shift Action:</strong>{" "}
                      {ev.actionRequiredNextShift}
                    </div>
                    <button
                      onClick={() => onAcknowledgeShift(ev.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition ${
                        ev.acknowledged
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-sky-500 hover:bg-sky-400 text-slate-950"
                      }`}
                    >
                      {ev.acknowledged ? "✓ Handoff Verified" : "Verify & Sign Handoff"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware Replacement Cage Summary */}
          <div className="mt-3 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="text-xs">
                <strong className="text-white block">
                  NMC² Cage 4 Spare Dispatch Ready: 5 Racks Flagged
                </strong>
                <span className="text-slate-400 text-[11px]">
                  RACK-11, 12 (Manifold + B200 U4) · RACK-19, 20 (PSU + H200 U6) · RACK-27 (CDU Pump)
                </span>
              </div>
            </div>
            <Cpu className="w-5 h-5 text-slate-500 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

