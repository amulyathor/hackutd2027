"use client";

import React, { useState } from "react";
import {
  CBRERealEstateSite,
  HandoffSignoffState,
  RackNode,
  ShiftHandoffEvent,
  SynchronizedMetrics,
} from "@/lib/datacenter-twin";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

interface Props {
  racks: RackNode[];
  sites: CBRERealEstateSite[];
  shiftEvents: ShiftHandoffEvent[];
  metrics: SynchronizedMetrics;
  selectedRackId: string;
  onSelectRack: (id: string) => void;
  handoffState: HandoffSignoffState;
  setHandoffState: (state: HandoffSignoffState) => void;
}

export default function LifecycleAndExpansionTab({
  racks,
  sites,
  shiftEvents,
  metrics,
  selectedRackId,
  onSelectRack,
  handoffState,
  setHandoffState,
}: Props) {
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>(
    "Elena Rostova (Night Shift A Lead)"
  );

  const replacementRacks = racks.filter((r) => r.replacementRecommended);
  const cascadeRacks = racks.filter(
    (r) => r.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
  );

  const advanceHandoffState = () => {
    if (handoffState === "PENDING") {
      setHandoffState("VERIFIED");
    } else if (handoffState === "VERIFIED") {
      setHandoffState("SIGNED");
    }
  };

  return (
    <div className="space-y-5">
      {/* TOP ROW: SPECTRAL CLUSTERING CHART + CBRE SITE EXPANSION COMPARISON */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* LEFT PANEL: Unsupervised Spectral Clustering */}
        <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  Spectral Rack Stability & Hardware Replacement Clustering
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Separates recoverable facility cooling drift (Amber) from intrinsic component failure requiring physical Cage 4 swap (Red).
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/35 text-rose-300 shrink-0">
                {replacementRacks.length} Racks Flagged
              </span>
            </div>

            {/* 2D Feature Space Scatter Plot (SVG) */}
            <div className="relative w-full h-64 bg-[#060a12] border border-slate-800 rounded-xl overflow-hidden p-3 my-3">
              <svg viewBox="0 0 500 220" className="w-full h-full">
                <line
                  x1="45"
                  y1="190"
                  x2="480"
                  y2="190"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />
                <line
                  x1="45"
                  y1="15"
                  x2="45"
                  y2="190"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />
                <line
                  x1="45"
                  y1="105"
                  x2="480"
                  y2="105"
                  stroke="#0f172a"
                  strokeDasharray="4 4"
                />
                <line
                  x1="260"
                  y1="15"
                  x2="260"
                  y2="190"
                  stroke="#0f172a"
                  strokeDasharray="4 4"
                />

                {/* Region 0: Healthy Fleet (Green) */}
                <ellipse
                  cx="135"
                  cy="150"
                  rx="75"
                  ry="32"
                  fill="rgba(16, 185, 129, 0.07)"
                  stroke="rgba(16, 185, 129, 0.35)"
                  strokeDasharray="4 3"
                />
                <text
                  x="72"
                  y="176"
                  fill="#34d399"
                  fontSize="9"
                  fontWeight="600"
                >
                  CLUSTER 0: Healthy Fleet ({metrics.healthyRacksCount})
                </text>

                {/* Region 1: Transient Facility Drift (Amber) */}
                <ellipse
                  cx="330"
                  cy="135"
                  rx="82"
                  ry="38"
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="rgba(245, 158, 11, 0.4)"
                  strokeDasharray="4 3"
                />
                <text
                  x="252"
                  y="166"
                  fill="#fbbf24"
                  fontSize="9"
                  fontWeight="600"
                >
                  CLUSTER 1: Transient Drift ({cascadeRacks.length})
                </text>

                {/* Region 2: Hardware Replacement Required (Red) */}
                <ellipse
                  cx="385"
                  cy="54"
                  rx="90"
                  ry="36"
                  fill="rgba(244, 63, 94, 0.12)"
                  stroke="rgba(244, 63, 94, 0.6)"
                  strokeWidth="1.5"
                />
                <text
                  x="295"
                  y="29"
                  fill="#fb7185"
                  fontSize="9.5"
                  fontWeight="700"
                >
                  CLUSTER 2: Hardware Swap Required ({replacementRacks.length})
                </text>

                <text x="200" y="212" fill="#64748b" fontSize="9.5">
                  Thermal Drift & Coolant Starvation (Coolant °C) →
                </text>
                <text
                  x="14"
                  y="168"
                  fill="#64748b"
                  fontSize="9.5"
                  transform="rotate(-90, 14, 168)"
                >
                  Electrical & Mechanical Wear (mV / ECC) →
                </text>

                {racks.map((rack) => {
                  const cx = Math.min(
                    465,
                    Math.max(60, 60 + ((rack.coolantTempC - 26) / 26) * 390)
                  );
                  const wearScore =
                    (rack.voltageRippleMv - 12) * 0.95 +
                    rack.vibrationMmS * 10 +
                    (rack.replacementRecommended ? 36 : 0);
                  const cy = Math.min(
                    178,
                    Math.max(32, 178 - (wearScore / 145) * 145)
                  );

                  const isSelected = rack.id === selectedRackId;
                  const fill = rack.replacementRecommended
                    ? "#ef4444"
                    : rack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
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
                          stroke="#f8fafc"
                          strokeWidth="2"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={rack.replacementRecommended ? 6 : 4.5}
                        fill={fill}
                        stroke="#060a12"
                        strokeWidth="1.5"
                      />
                      {(rack.replacementRecommended || isSelected) && (
                        <text
                          x={cx + 8}
                          y={cy + 3}
                          fill={isSelected ? "#f8fafc" : "#fda4af"}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/85 border border-rose-500/35 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
                Physical Swap Queue ({replacementRacks.length} Racks)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>RACK-11:</strong> U4 Manifold/Blade ·{" "}
                <strong>RACK-12:</strong> U2 TIM/U5 NVLink ·{" "}
                <strong>RACK-19, 20:</strong> U8 48V PSU + Blade ·{" "}
                <strong>RACK-27:</strong> CDU Bearing.
              </p>
            </div>

            <div className="bg-slate-950/85 border border-amber-500/35 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Recoverable Drift ({cascadeRacks.length} Racks)
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Racks in Cluster B & C experiencing CRAH-02 flow starvation have{" "}
                <strong>0 hardware faults</strong>—stabilized via auxiliary valve & drain.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CBRE Site Capacity & Expansion Comparison */}
        <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  CBRE Portfolio Capacity & Site Expansion Comparison
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compares in-place DFW facility load margin ({metrics.dfwAvailableMarginMw} MW left) against turn-key CBRE expansion sites for 18MW Blackwell clusters.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 shrink-0">
                Hillsboro 96% Fit
              </span>
            </div>

            <div className="space-y-3">
              {sites.map((site) => {
                const isRecommended = site.cbreRecommendationScore >= 90;
                return (
                  <div
                    key={site.id}
                    className={`rounded-xl p-3.5 border ${
                      isRecommended
                        ? "bg-slate-950 border-emerald-500/45"
                        : "bg-slate-950/75 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">
                            {site.name}
                          </h4>
                          {isRecommended && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                              RECOMMENDED EXPANSION
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {site.market} · {site.tier} ·{" "}
                          {site.substationRedundancy}
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

                    <div className="grid grid-cols-4 gap-2 my-2 bg-slate-900/90 rounded-lg p-2 text-[11px] border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          Avail Margin
                        </span>
                        <strong className="text-white">
                          {site.availablePowerMw} MW
                        </strong>{" "}
                        <span className="text-slate-500">
                          / {site.totalPowerMw}M
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          PUE
                        </span>
                        <strong className="text-emerald-300">
                          {site.pue}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          Slab Rating
                        </span>
                        <strong className="text-white">
                          {site.floorLoadingLbsSqFt} lbs/ft²
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          Unstable Racks
                        </span>
                        <strong
                          className={
                            site.unstableRacksCount > 0
                              ? "text-amber-400"
                              : "text-emerald-400"
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
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: ZERO-DROP SHIFT FLIGHT RECORDER WITH SINGLE UNIFIED HANDOFF DRAWER/MODAL */}
      <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              Zero-Drop Shift Handoff Flight Recorder (Swing Shift C → Night Shift A)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Synchronizes unstructured technician shift notes, cross-silo SLA alerts, and physical Cage 4 hardware swap orders into one unified sign-off protocol.
            </p>
          </div>

          {/* Single Unified Handoff State Pill & Modal Trigger (Replaces 3 disconnected buttons) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">Handoff Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  handoffState === "SIGNED"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : handoffState === "VERIFIED"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                }`}
              >
                {handoffState === "SIGNED"
                  ? "SIGNED & LOCKED"
                  : handoffState === "VERIFIED"
                  ? "VERIFIED (AWAITING SIGNATURE)"
                  : "PENDING VERIFICATION"}
              </span>
            </div>

            <button
              onClick={() => setIsHandoffModalOpen(true)}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              {handoffState === "SIGNED"
                ? "View Signed Handoff Manifest"
                : "Open Unified Shift Handoff & Sign-Off"}
            </button>
          </div>
        </div>

        {/* 3 Synchronized Shift Flight Recorder Entries (Read-Only Timeline Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {shiftEvents.map((ev, index) => (
            <div
              key={ev.id}
              className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    LOG 0{index + 1} · {ev.timestamp}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-2">
                  {ev.title}
                </h4>
                <p className="text-[11px] text-slate-300 bg-slate-900/80 rounded-lg p-2.5 border-l-2 border-slate-600 mb-2.5 leading-relaxed">
                  {ev.unstructuredNote}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {ev.correlatedSensors.map((sensor) => (
                    <span
                      key={sensor}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono"
                    >
                      {sensor}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                <strong className="text-slate-400 block mb-0.5">
                  Required Action:
                </strong>
                {ev.actionRequiredNextShift}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UNIFIED SHIFT HANDOFF MODAL / DRAWER */}
      {isHandoffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                  NMC² Unified Shift Handoff Protocol · Packet #HO-9942
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Swing Shift C → Night Shift A Operational Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Step Progress Stepper (Pending -> Verified -> Signed) */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
              <div
                className={`p-2 rounded-lg border text-center font-semibold ${
                  handoffState === "PENDING"
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                1. Pending Review
              </div>
              <div
                className={`p-2 rounded-lg border text-center font-semibold ${
                  handoffState === "VERIFIED"
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : handoffState === "SIGNED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                2. Telemetry Verified
              </div>
              <div
                className={`p-2 rounded-lg border text-center font-semibold ${
                  handoffState === "SIGNED"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                3. Cryptographically Signed
              </div>
            </div>

            {/* Synchronized Handoff Summary */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">
                  Synchronized SLA Exposure @ T+{metrics.horizonOffsetMin}m:
                </span>
                <strong className="text-white font-mono">
                  ${metrics.activeSlaExposurePerHrUsd.toLocaleString()}/hr (Breach Window: T-{metrics.remainingTimeToCascadeMin}m)
                </strong>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-slate-400">
                  Cage 4 Physical Hardware Swaps Staged:
                </span>
                <strong className="text-rose-300 font-mono">
                  {metrics.flaggedSwapRackIds.join(", ") || "All Complete"}
                </strong>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Incoming Night Shift Lead Signature:
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
              {handoffState !== "SIGNED" ? (
                <button
                  onClick={advanceHandoffState}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {handoffState === "PENDING"
                    ? "Step 1: Verify All 3 Shift Logs & Valve Telemetry"
                    : "Step 2: Sign & Lock Night Shift A Handoff"}
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
