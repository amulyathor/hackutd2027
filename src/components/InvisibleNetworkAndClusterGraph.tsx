"use client";

import React from "react";
import {
  CBREFacilityNode,
  InvisibleDependencyEdge,
  RackNode,
} from "@/lib/datacenter-twin";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Cpu,
  ShieldAlert,
  Wrench,
  Zap,
} from "lucide-react";

interface Props {
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  selectedRackId: string;
  onSelectRack: (id: string) => void;
  nemotronMitigated: boolean;
}

export default function InvisibleNetworkAndClusterGraph({
  racks,
  facilityNodes,
  dependencyEdges,
  selectedRackId,
  onSelectRack,
  nemotronMitigated,
}: Props) {
  const replacementRacks = racks.filter((r) => r.replacementRecommended);
  const cascadeRacks = racks.filter(
    (r) => !r.replacementRecommended && r.healthScore < 76
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* LEFT PANEL: NMC² Unsupervised Spectral Clustering (Transient Cascade vs. Hardware Replacement) */}
      <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                NMC² Fleet Analytics · Unsupervised Spectral Clustering
              </span>
              <h3 className="text-base font-bold text-white">
                Rack Stability & Hardware Replacement Cluster Space
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-300">
              {replacementRacks.length} Racks Flagged for Swap
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Separates racks suffering from{" "}
            <strong className="text-amber-300">
              external facility cooling cascades
            </strong>{" "}
            (recoverable without CapEx) from racks with{" "}
            <strong className="text-rose-400">
              intrinsic hardware degradation
            </strong>{" "}
            (PSU ripple, manifold micro-leaks, HBM3e ECC spikes) requiring physical replacement.
          </p>

          {/* 2D Feature Space Scatter Plot (SVG) */}
          <div className="relative w-full h-60 bg-[#060a15] border border-slate-800/90 rounded-xl overflow-hidden p-3">
            <svg viewBox="0 0 500 220" className="w-full h-full">
              {/* Grid lines */}
              <line x1="45" y1="190" x2="480" y2="190" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="45" y1="15" x2="45" y2="190" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="45" y1="105" x2="480" y2="105" stroke="#0f172a" strokeDasharray="4 4" />
              <line x1="260" y1="15" x2="260" y2="190" stroke="#0f172a" strokeDasharray="4 4" />

              {/* Cluster Decision Regions */}
              {/* Region 1: Healthy Cluster */}
              <ellipse
                cx="135"
                cy="150"
                rx="75"
                ry="32"
                fill="rgba(16, 185, 129, 0.08)"
                stroke="rgba(16, 185, 129, 0.35)"
                strokeDasharray="4 3"
              />
              <text x="72" y="176" fill="#34d399" fontSize="9" fontWeight="600">
                CLUSTER 0: Healthy Fleet
              </text>

              {/* Region 2: Facility Cooling Cascade (Recoverable) */}
              <ellipse
                cx="330"
                cy="135"
                rx="82"
                ry="38"
                fill="rgba(245, 158, 11, 0.09)"
                stroke="rgba(245, 158, 11, 0.45)"
                strokeDasharray="4 3"
              />
              <text x="256" y="166" fill="#fbbf24" fontSize="9" fontWeight="600">
                CLUSTER 1: Facility Cascade (Drain/Cool)
              </text>

              {/* Region 3: Hardware Replacement Required */}
              <ellipse
                cx="385"
                cy="54"
                rx="90"
                ry="36"
                fill="rgba(244, 63, 94, 0.13)"
                stroke="rgba(244, 63, 94, 0.65)"
                strokeWidth="1.5"
              />
              <text x="302" y="29" fill="#fb7185" fontSize="9.5" fontWeight="700">
                CLUSTER 2: Hardware Replacement Needed
              </text>

              {/* Axis Labels */}
              <text x="210" y="212" fill="#64748b" fontSize="9.5">
                Thermal Drift & Coolant Starvation (Coolant °C / Flow Drop) →
              </text>
              <text
                x="14"
                y="165"
                fill="#64748b"
                fontSize="9.5"
                transform="rotate(-90, 14, 165)"
              >
                Electrical & Mechanical Wear (mV / ECC) →
              </text>

              {/* Plot all 32 Racks */}
              {racks.map((rack) => {
                // Map coolantTempC (26..56) to X (65..460)
                const cx = Math.min(
                  465,
                  Math.max(60, 60 + ((rack.coolantTempC - 26) / 28) * 390)
                );
                // Map voltageRippleMv + vibration + replacement to Y (175..35)
                const wearScore =
                  (rack.voltageRippleMv - 12) * 1.1 +
                  rack.vibrationMmS * 12 +
                  (rack.replacementRecommended ? 32 : 0);
                const cy = Math.min(
                  178,
                  Math.max(32, 178 - (wearScore / 135) * 145)
                );

                const isSelected = rack.id === selectedRackId;
                const fill = rack.replacementRecommended
                  ? "#f43f5e"
                  : rack.healthScore < 75
                  ? "#f59e0b"
                  : "#10b981";

                return (
                  <g
                    key={rack.id}
                    className="cursor-pointer"
                    onClick={() => onSelectRack(rack.id)}
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="10"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={rack.replacementRecommended ? 6 : 4.5}
                      fill={fill}
                      stroke="#050811"
                      strokeWidth="1.5"
                    />
                    {(rack.replacementRecommended || isSelected) && (
                      <text
                        x={cx + 8}
                        y={cy + 3}
                        fill={isSelected ? "#38bdf8" : "#fda4af"}
                        fontSize="8.5"
                        fontWeight="700"
                      >
                        {rack.id.replace("RACK-", "R")}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Bottom Replacement Action Cards */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-rose-950/35 border border-rose-500/35 rounded-xl p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
              Physical Replacement Queue ({replacementRacks.length} Racks)
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>RACK-11, 12:</strong> Manifold seal + HGX B200 Blade U4.{" "}
              <strong>RACK-19, 20:</strong> 48V Rectifier PSU + Blade U6.{" "}
              <strong>RACK-27:</strong> CDU Pump Bearing.
            </p>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/35 rounded-xl p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Cascade Victims Saved ({cascadeRacks.length} Racks)
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Racks in Cluster B & C experiencing CRAH-02 flow starvation have{" "}
              <strong>0 hardware faults</strong>—saved via Nemotron workload drain & aux valve actuation.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CBRE "The Invisible Network" Cross-Silo Causal Dependency Graph */}
      <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                CBRE Challenge · The Invisible Network
              </span>
              <h3 className="text-base font-bold text-white">
                Cross-Silo Causal Dependency & Cascade Propagation Graph
              </h3>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                nemotronMitigated
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-300"
              }`}
            >
              {nemotronMitigated ? "Cascade Severed by Nemotron" : "Active 4-Silo Cascade"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Connects fragmented commercial property silos—
            <strong className="text-slate-200">
              Physical Access Control, HVAC Cooling Loops, Utility Substations, GPU Compute Clusters, and Tenant SLA Lease Contracts
            </strong>
            —to expose hidden failure cascades before catastrophe strikes.
          </p>

          {/* 4-Silo Causal Chain Cards */}
          <div className="space-y-2.5">
            {dependencyEdges.map((edge, idx) => (
              <div
                key={edge.id}
                className={`rounded-xl p-3 border transition ${
                  edge.activeInCascade
                    ? "bg-slate-950/90 border-rose-500/45 shadow-md"
                    : "bg-slate-950/60 border-emerald-500/35"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 text-[10px]">
                      STEP {idx + 1} ({edge.sourceSilo})
                    </span>
                    <span>{edge.sourceLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-amber-300">{edge.targetLabel}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      edge.activeInCascade
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {edge.activeInCascade
                      ? `Propagates in +${edge.propagationLagMin}m`
                      : "Isolated / Mitigated"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{edge.causalMechanism}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CBRE Facility Silo Telemetry Strip */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase truncate">
                    {node.category.replace("_", " ")}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
                <div className="font-bold text-white text-[11px] truncate mb-0.5">
                  {node.name}
                </div>
                <div
                  className={`text-[10px] font-semibold truncate ${
                    node.status === "FAILING" || node.status === "COMPROMISED"
                      ? "text-rose-400"
                      : node.status === "WARNING"
                      ? "text-amber-300"
                      : "text-emerald-400"
                  }`}
                >
                  {node.metricValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

