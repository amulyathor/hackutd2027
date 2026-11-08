"use client";

import React, { useState } from "react";
import {
  CBRERealEstateSite,
  SynchronizedMetrics,
  TenantLeaseContract,
} from "@/lib/datacenter-twin";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Globe,
  HelpCircle,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

interface Props {
  metrics: SynchronizedMetrics;
  sites: CBRERealEstateSite[];
  tenantContracts: TenantLeaseContract[];
  nemotronMitigated: boolean;
  onSwitchToNMC: () => void;
  onRunNemotron: () => void;
  isRunningAgents: boolean;
}

export default function CBREPortfolioPortal({
  metrics,
  sites,
  tenantContracts,
  nemotronMitigated,
  onSwitchToNMC,
  onRunNemotron,
  isRunningAgents,
}: Props) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("SITE-PDX-2");

  return (
    <div className="space-y-6">
      {/* EXECUTIVE SUMMARY & AI BRIEFING HERO CARD */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                CBRE Asset & Portfolio Advisory · Powered by NVIDIA Nemotron
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Executive Portfolio Briefing: DFW-North Lease Risk & Expansion Strategy
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {nemotronMitigated
                ? "Autonomous mitigation has stabilized the cooling loop in DFW-North, preserving $80,712/hr in lease revenues. However, local grid headroom is at 93.3% capacity (only 3.2 MW margin). Recommend immediately greenlighting the 18 MW high-density Blackwell expansion pipeline to Hillsboro, OR."
                : "Facility drift in DFW will trigger a lease covenant breach within 18 minutes on Hyperscale Lease #HYP-02 ($80,712/hr penalty). NMC² facility agents are staging cooling remediation. Local grid headroom is near capacity (3.2 MW available). Recommend approving capacity offload to Hillsboro, OR."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            {!nemotronMitigated ? (
              <button
                onClick={onRunNemotron}
                disabled={isRunningAgents}
                className="px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                {isRunningAgents ? "Agent Mitigating..." : "Approve AI Mitigation"}
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Lease Revenue Protected
              </div>
            )}
            <button
              onClick={onSwitchToNMC}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              View NMC² Engineering Twin
            </button>
          </div>
        </div>
      </div>

      {/* 4 EXECUTIVE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Portfolio SLA Exposure */}
        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Portfolio SLA Exposure
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              nemotronMitigated ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {nemotronMitigated
              ? "$0 / hr"
              : `$${metrics.activeSlaExposurePerHrUsd.toLocaleString()} / hr`}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {nemotronMitigated
              ? `Saved $${metrics.savedSlaPerHrUsd.toLocaleString()}/hr`
              : `Breach countdown timer: ${metrics.remainingTimeToCascadeMin}m`}
          </p>
        </div>

        {/* Card 2: Active Tenant Leases at Risk */}
        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Tenant Leases at Risk
            </span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white tracking-tight truncate mt-1">
            {nemotronMitigated
              ? "0 Leases at Risk (Nominal)"
              : "Hyperscale Tenant #2"}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {nemotronMitigated
              ? "All SLA covenants within compliance"
              : "Cluster B & C ($38.4M Annual Contract)"}
          </p>
        </div>

        {/* Card 3: DFW Metro Site Capacity */}
        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              DFW Metro Site Capacity
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {metrics.dfwUsedPowerMw} / {metrics.dfwTotalPowerMw} MW
          </div>
          <p className="text-xs text-amber-300 mt-1">
            {metrics.dfwUtilizationPct}% Utilized ·{" "}
            <strong>{metrics.dfwAvailableMarginMw} MW Headroom</strong>
          </p>
        </div>

        {/* Card 4: Recommended Expansion Target */}
        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Expansion Target
            </span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 tracking-tight truncate mt-1">
            Hillsboro, OR Clean-Grid
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <strong>96% Feasibility Match</strong> · 34 MW Hydro Ready
          </p>
        </div>
      </div>

      {/* TENANT LEASE & COVENANT RISK MATRIX */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Tenant Lease & SLA Covenant Risk Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tracking of commercial property lease covenants, SLA penalty triggers, and contract exposure.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300">
            4 Enterprise Leases Active ($105.7M/yr ARR)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tenant & Contract</th>
                <th className="py-3 px-3">SLA Tier</th>
                <th className="py-3 px-3">Allocated Power</th>
                <th className="py-3 px-4">Enforceable Covenant Clause</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Projected Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {tenantContracts.map((tenant) => {
                const isBreach =
                  tenant.currentStatus === "BREACH_IMMINENT" ||
                  tenant.currentStatus === "AT_RISK";
                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div>{tenant.tenantName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">
                        {tenant.id} · {tenant.clusterName}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[10px]">
                        {tenant.slaTier}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-200">
                      {tenant.allocatedPowerMw} MW
                    </td>
                    <td className="py-3.5 px-4 max-w-sm text-slate-300 text-[11px] leading-relaxed">
                      {tenant.leaseClause}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          nemotronMitigated
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                            : isBreach
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/40"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {nemotronMitigated
                          ? "COMPLIANT"
                          : tenant.currentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          !nemotronMitigated && tenant.hourlyPenaltyUsd > 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {nemotronMitigated || tenant.hourlyPenaltyUsd === 0
                          ? "$0 / hr"
                          : `$${tenant.hourlyPenaltyUsd.toLocaleString()} / hr`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SITE EXPANSION DECISION MATRIX (18 MW PIPELINE OFFLOAD) */}
      <div className="glass-panel rounded-3xl p-6 border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Site Expansion Decision Matrix: 18 MW Pipeline Offload
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluating prospective data center sites to absorb high-density Blackwell AI clusters without exceeding substation thermal ceilings.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
            Recommended Action: Offload 18 MW to Hillsboro, OR
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Site 1: Dallas (DFW) */}
          <div className="bg-slate-950/80 border border-rose-500/35 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Current Facility
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
                  HIGH RISK · FULL
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Dallas (DFW) Metro Campus
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Dallas-Fort Worth, TX · ERCOT Grid · Tier IV
              </p>

              <div className="space-y-2 text-xs border-y border-slate-800/80 py-3 my-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Headroom:</span>
                  <strong className="text-rose-400 font-mono">
                    3.2 MW (Constrained)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Power Utilization:</span>
                  <strong className="text-slate-200 font-mono">
                    93.3% (44.8 / 48 MW)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PUE Efficiency:</span>
                  <strong className="text-slate-300 font-mono">1.24 PUE</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Floor Loading:</span>
                  <strong className="text-slate-300 font-mono">
                    350 lbs/sq.ft (Maxed)
                  </strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
              <strong>Assessment:</strong> In-place expansion is physically impossible without a $14M substation rebuild. 5 racks require maintenance.
            </p>
          </div>

          {/* Site 2: Hillsboro, OR (Winner) */}
          <div className="bg-slate-950/90 border border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-xl shadow-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Target #1: Prime Candidate
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                  96% FIT SCORE
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Hillsboro, OR Clean-Grid AI Factory
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Portland Metro, OR · WECC Hydro Grid · Tier III+
              </p>

              <div className="space-y-2 text-xs border-y border-slate-800/80 py-3 my-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Immediate Headroom:</span>
                  <strong className="text-emerald-400 font-mono">
                    34.0 MW Available
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">18 MW Feasibility:</span>
                  <strong className="text-emerald-300 font-mono">
                    100% Ready (Immediate)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PUE Efficiency:</span>
                  <strong className="text-emerald-300 font-mono">
                    1.11 PUE (15% Savings)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Floor Loading:</span>
                  <strong className="text-slate-200 font-mono">
                    500 lbs/sq.ft (Blackwell Ready)
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] text-emerald-300/90 leading-relaxed mb-3">
                <strong>Assessment:</strong> Turn-key direct-to-chip liquid cooling with 100% renewable hydro power. Saves $1.84M/yr in operational lease costs vs DFW.
              </p>
              <button className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Select Hillsboro for 18 MW Pipeline
              </button>
            </div>
          </div>

          {/* Site 3: Columbus, OH */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target #2: Pipeline
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                  78% FIT · GRID QUEUE
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Columbus, OH HyperScale Park
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Columbus, OH · PJM AEP Grid · Tier IV
              </p>

              <div className="space-y-2 text-xs border-y border-slate-800/80 py-3 my-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Headroom:</span>
                  <strong className="text-amber-400 font-mono">
                    0.0 MW (Pending Queue)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grid Availability:</span>
                  <strong className="text-slate-300 font-mono">
                    Q4 2027 (AEP Substation)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PUE Efficiency:</span>
                  <strong className="text-slate-300 font-mono">1.25 PUE</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Floor Loading:</span>
                  <strong className="text-slate-300 font-mono">
                    400 lbs/sq.ft
                  </strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
              <strong>Assessment:</strong> High potential campus, but 18-month transmission interconnection delay prevents solving the immediate 18 MW capacity crunch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
