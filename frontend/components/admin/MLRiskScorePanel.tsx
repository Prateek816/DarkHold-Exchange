"use client";

import React from "react";
import { MLRiskAccount } from "@/lib/types";
import { SimBadge } from "@/components/ui/SimBadge";
import { formatPercent } from "@/lib/format";
import { ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MLRiskScorePanelProps {
  accounts: MLRiskAccount[];
  className?: string;
}

export function MLRiskScorePanel({ accounts, className }: MLRiskScorePanelProps) {
  // Score histogram distribution buckets (0-20, 21-40, 41-60, 61-80, 81-100)
  const scoreBuckets = [
    { range: "0-20", count: accounts.filter((a) => a.risk_score <= 20).length },
    { range: "21-40", count: accounts.filter((a) => a.risk_score > 20 && a.risk_score <= 40).length },
    { range: "41-60", count: accounts.filter((a) => a.risk_score > 40 && a.risk_score <= 60).length },
    { range: "61-80", count: accounts.filter((a) => a.risk_score > 60 && a.risk_score <= 80).length },
    { range: "81-100", count: accounts.filter((a) => a.risk_score > 80).length },
  ];

  return (
    <div
      className={cn(
        "relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] p-6 space-y-6 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* Header and Advisory Warning Banner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-10 bg-warning/10 border border-warning/25 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-warning" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Advisory ML Suspicious Account Risk Score
            </h3>
          </div>
          <span className="text-[11px] text-text-dim font-mono">Model: tree_ensemble_v3.pkl</span>
        </div>

        {/* Mandatory Advisory Notice */}
        <div
          role="note"
          className="p-4 rounded-16 bg-warning/10 border border-warning/30 text-xs text-text-muted flex items-start gap-3"
        >
          <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>
            <strong className="text-warning">Advisory only.</strong> Trained on simulated data. Does not block trades or
            move money. Designed for surveillance forensics and operator inspection.
          </span>
        </div>
      </div>

      {/* Distribution Histogram & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-20 bg-white/[0.025] border border-white/6">
        <div className="md:col-span-1 space-y-1">
          <span className="text-[10px] uppercase font-medium tracking-wider text-text-dim block">Distribution</span>
          <p className="text-base font-semibold text-white">Risk Histogram</p>
          <span className="text-[11px] text-text-muted">Evaluated across all active bots</span>
        </div>

        <div className="md:col-span-3 flex items-end justify-between gap-3 h-20 pt-2 font-mono">
          {scoreBuckets.map((b) => (
            <div key={b.range} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-text-dim tabular-nums">{b.count}</span>
              <div
                className={cn(
                  "w-full rounded-t transition-all",
                  b.range === "81-100"
                    ? "bg-sell shadow-[0_0_8px_rgba(240,80,110,0.5)]"
                    : b.range === "61-80"
                    ? "bg-warning shadow-[0_0_8px_rgba(245,181,68,0.4)]"
                    : "bg-buy shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                )}
                style={{ height: `${Math.max(15, (b.count / (accounts.length || 1)) * 100)}%` }}
              />
              <span className="text-[10px] text-text-muted">{b.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranked Anomaly Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-text-dim">
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Account ID</th>
              <th className="px-3 py-3">Cancel Ratio</th>
              <th className="px-3 py-3">Orders / Min</th>
              <th className="px-3 py-3">Supply Share</th>
              <th className="px-3 py-3">Ceiling Probes</th>
              <th className="px-3 py-3">Forensic Observation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6 font-mono">
            {accounts.map((acc) => (
              <tr key={acc.account_id} className="hover:bg-white/[0.03] transition-colors">
                {/* Score */}
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums",
                      acc.risk_score >= 80
                        ? "bg-sell-tint text-sell border border-sell/40"
                        : acc.risk_score >= 50
                        ? "bg-warning/15 text-warning border border-warning/40"
                        : "bg-buy-tint text-buy border border-buy/40"
                    )}
                  >
                    {acc.risk_score} / 100
                  </span>
                </td>

                {/* Account ID + SIM badge */}
                <td className="px-3 py-3 font-sans">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-white font-medium">{acc.account_id}</span>
                    {acc.is_sim && <SimBadge label="SIM" size="sm" />}
                  </div>
                </td>

                {/* Cancel ratio feature bar */}
                <td className="px-3 py-3 min-w-[110px]">
                  <div className="space-y-1">
                    <span className="text-[11px] text-text-muted tabular-nums">
                      {formatPercent(acc.cancel_ratio * 100, false)}
                    </span>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning"
                        style={{ width: `${acc.cancel_ratio * 100}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Orders / min */}
                <td className="px-3 py-3 text-white tabular-nums">{acc.orders_per_min} /m</td>

                {/* Supply share */}
                <td className="px-3 py-3 text-text-muted tabular-nums">
                  {formatPercent(acc.supply_share_pct, false)}
                </td>

                {/* Above ceiling attempts */}
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      acc.above_ceiling_attempts > 0 ? "text-sell" : "text-text-dim"
                    )}
                  >
                    {acc.above_ceiling_attempts} probes
                  </span>
                </td>

                {/* Notes */}
                <td className="px-3 py-3 text-[11px] text-text-muted max-w-xs truncate font-sans" title={acc.notes}>
                  {acc.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
