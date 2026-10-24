"use client";

import React from "react";
import type { MLRiskAccount } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { SimBadge } from "@/components/ui/SimBadge";

interface MLRiskScorePanelProps {
  accounts: MLRiskAccount[];
  className?: string;
}

export function MLRiskScorePanel({ accounts, className }: MLRiskScorePanelProps) {
  const scoreBuckets = [
    { range: "0-20", count: accounts.filter((a) => a.risk_score <= 20).length },
    { range: "21-40", count: accounts.filter((a) => a.risk_score > 20 && a.risk_score <= 40).length },
    { range: "41-60", count: accounts.filter((a) => a.risk_score > 40 && a.risk_score <= 60).length },
    { range: "61-80", count: accounts.filter((a) => a.risk_score > 60 && a.risk_score <= 80).length },
    { range: "81-100", count: accounts.filter((a) => a.risk_score > 80).length },
  ];

  return (
    <GlassCard className={cn("overflow-hidden p-0", className)}>
      {/* Header */}
      <div className="space-y-3.5 border-b border-glass-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-brand-500/30 bg-brand-500/10 text-brand-400">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-text">
                Advisory ML risk score
              </h3>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                Suspicious account surveillance
              </p>
            </div>
          </div>
          <span className="rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] text-text-dim">
            tree_ensemble_v3.pkl
          </span>
        </div>

        <div
          role="note"
          className="flex items-start gap-2.5 rounded-panel border border-brand-500/30 bg-brand-500/10 p-3 text-[11px] leading-relaxed text-text-muted"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
          <span>
            <strong className="font-semibold text-warning">Advisory only.</strong> Trained on
            simulated data. Does not block trades or move money. Intended for surveillance
            forensics and operator inspection.
          </span>
        </div>
      </div>

      {/* Histogram */}
      <div className="grid grid-cols-1 gap-4 border-b border-glass-border p-5 md:grid-cols-4">
        <div className="space-y-1">
          <span className="data-label block">Distribution</span>
          <p className="font-display text-[13px] font-semibold tracking-tight text-text">
            Risk histogram
          </p>
          <span className="block text-[10.5px] leading-relaxed text-text-muted">
            Evaluated across all active bots
          </span>
        </div>

        <div className="flex h-20 items-end justify-between gap-3 font-mono md:col-span-3">
          {scoreBuckets.map((b) => (
            <div
              key={b.range}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-[9px] tabular-nums text-text-dim">{b.count}</span>
              <div className={cn(
                  "w-full rounded-t-[3px] transition-all duration-500",
                  b.range === "81-100"
                    ? "bg-sell shadow-[0_0_8px_rgba(224,64,94,0.45)]"
                    : b.range === "61-80"
                    ? "bg-ward shadow-[0_0_8px_rgba(245,181,68,0.35)]"
                    : "bg-mint shadow-[0_0_8px_rgba(25,203,176,0.25)]"
                )}
                style={{
                  height:
                    b.count === 0
                      ? 0
                      : `${Math.max(12, (b.count / (accounts.length || 1)) * 100)}%`,
                }}
              />
              <span className="text-[8.5px] text-text-muted">{b.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="no-scrollbar overflow-x-auto">
        <table className="data-table w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-glass-border bg-white/[0.015]">
              <th className="px-4 py-2.5">Score</th>
              <th className="px-4 py-2.5">Account</th>
              <th className="px-4 py-2.5">Cancel ratio</th>
              <th className="px-4 py-2.5">Orders / min</th>
              <th className="px-4 py-2.5">Supply share</th>
              <th className="px-4 py-2.5">Ceiling probes</th>
              <th className="px-4 py-2.5">Forensic observation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {accounts.map((acc) => (
              <tr key={acc.account_id} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                      acc.risk_score >= 80
                        ? "border-sell/40 bg-sell-tint text-sell"
                        : acc.risk_score >= 50
                        ? "border-ward/40 bg-ward-tint text-ward"
                        : "border-mint/40 bg-mint-tint text-buy"
                    )}
                  >
                    {acc.risk_score} / 100
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[11px] font-medium text-text">{acc.account_id}</span>
                    {acc.is_sim && <SimBadge label="SIM" size="sm" />}
                  </div>
                </td>

                <td className="min-w-[110px] px-4 py-3">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] tabular-nums text-text-muted">
                      {formatPercent(acc.cancel_ratio * 100, false)}
                    </span>
                    <div className="h-1 w-full overflow-hidden rounded-full border border-glass-border bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{ width: `${Math.min(100, acc.cancel_ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-text">
                  {acc.orders_per_min} /m
                </td>

                <td className="px-4 py-3 font-mono text-[10.5px] tabular-nums text-text-muted">
                  {formatPercent(acc.supply_share_pct, false)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-mono text-[10.5px] font-semibold tabular-nums",
                      acc.above_ceiling_attempts > 0 ? "text-sell" : "text-text-dim"
                    )}
                  >
                    {acc.above_ceiling_attempts} probes
                  </span>
                </td>

                <td
                  className="min-w-[260px] max-w-[360px] whitespace-normal px-4 py-3 text-[11px] leading-relaxed text-text-muted"
                  title={acc.notes}
                >
                  {acc.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
