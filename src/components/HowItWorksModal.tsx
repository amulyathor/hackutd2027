"use client";

import React from "react";
import {
  X,
  Building2,
  Cpu,
  Bot,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Wrench,
  CheckCircle2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAutoHeal: () => void;
}

export default function HowItWorksModal({
  isOpen,
  onClose,
  onTriggerAutoHeal,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1120] border border-slate-700/80 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            NexusDC · HackUTD 2026 Executive Summary
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            How NexusDC Solves the $80,000/hr Data Center Crisis
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Data centers are an invisible web of physical facilities, high-density server racks, and multi-million dollar tenant lease contracts. When one fails, a silent cascade wipes out millions.
          </p>
        </div>

        {/* The 3 Sponsor Tracks in 1 Picture */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white mb-1">
              1. CBRE: The Invisible Network
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Connects physical building silos (HVAC valves, badge door access, power substations) to tenant lease SLA penalties ($80k/hr).
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2.5">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white mb-1">
              2. NMC²: Zero-Drop Handoff
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Unsupervised ML isolates dying hardware from transient AC glitches. Automates shift handoffs so night crews never miss a warning.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-[#76B900]/20 text-[#76B900] flex items-center justify-center mb-2.5">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white mb-1">
              3. NVIDIA Nemotron AI
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              4 autonomous ReAct agents use live reasoning (`/think`) and tool calling to drain workloads, open backup valves, and heal the facility in 4.1s.
            </p>
          </div>
        </div>

        {/* 30-Second Interactive Walkthrough */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Try It Yourself in 3 Simple Steps:
          </h4>
          <div className="space-y-2 text-xs text-slate-200">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-white">Scrub the Timeline Horizon (T+0m to T+24m):</strong>{" "}
                Watch temperatures spike and tenant SLA financial penalties rise as the unmitigated cooling failure spreads across the 3D server racks.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-white">Click "Deploy Nemotron Autonomous Agents":</strong>{" "}
                Watch the 4 AI agents reason in real time, actuate the auxiliary cooling valve, drain GPU jobs, and cut SLA losses to $0/hr.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-white">Click "Swap X-Ray" & Hot-Swap a Rack:</strong>{" "}
                Inspect RACK-11, see the degraded U4 liquid manifold blade pop out in 3D, and click "Execute Hot-Swap" to stage a spare from Cage 4.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Built with Next.js 14, Three.js, & NVIDIA NIM
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition w-full sm:w-auto"
            >
              Explore Dashboard
            </button>
            <button
              onClick={() => {
                onClose();
                onTriggerAutoHeal();
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Heal Cascade with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
