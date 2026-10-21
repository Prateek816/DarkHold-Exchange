"use client";

import React from "react";
import { Activity, Zap, Server, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricsCharts({ className }: { className?: string }) {
  // Synthetic benchmark histogram bins for settlement latency (ms)
  const bins = [
    { range: "<50ms", count: 480 },
    { range: "50-100", count: 820 },
    { range: "100-200", count: 1450 }, // p50 around here
    { range: "200-400", count: 320 },
    { range: "400-800", count: 70 },
    { range: ">800ms", count: 12 }, // p99 around here
  ];

  const maxCount = Math.max(...bins.map((b) => b.count));

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-5 font-sans text-xs", className)}>
      {/* Chart 1: Settlement Lag Histogram */}
      <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-4 h-4 text-buy" />
            <h4 className="font-semibold uppercase tracking-wider text-[11px]">
              Settlement Latency (SLA)
            </h4>
          </div>
          <span className="text-[10px] text-buy font-bold font-mono px-2 py-0.5 rounded-full bg-buy-tint border border-buy/30">
            p50: 142ms • p99: 780ms
          </span>
        </div>

        {/* Histogram Bars */}
        <div className="h-32 flex items-end justify-between gap-2 pt-2">
          {bins.map((bin, i) => {
            const heightPct = (bin.count / maxCount) * 100;
            const isP50 = i === 2;
            const isP99 = i === 5;

            return (
              <div key={bin.range} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end font-mono">
                <span className="text-[9px] text-text-dim tabular-nums">{bin.count}</span>
                <div
                  className={cn(
                    "w-full rounded-t transition-all duration-300",
                    isP99 ? "bg-sell shadow-[0_0_8px_rgba(240,80,110,0.5)]" : isP50 ? "bg-buy shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/20 hover:bg-white/30"
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${bin.range}: ${bin.count} settlements`}
                />
                <span className="text-[9px] text-text-muted truncate w-full text-center">
                  {bin.range}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart 2: Pipeline Throughput (Orders per Second) */}
      <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-4 h-4 text-warning" />
            <h4 className="font-semibold uppercase tracking-wider text-[11px]">
              Engine Rate (Ops / Sec)
            </h4>
          </div>
          <span className="text-[10px] text-warning font-bold font-mono px-2 py-0.5 rounded-full bg-warning/10 border border-warning/30">
            2,450 ops/sec
          </span>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>Offered Orders</span>
              <span className="text-white font-semibold font-mono">2,450 / s</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-white/40 w-[92%]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>Matched Trades</span>
              <span className="text-brand-400 font-semibold font-mono">1,820 / s</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 w-[78%] shadow-[0_0_8px_rgba(25,203,176,0.5)]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>Settled on Ledger</span>
              <span className="text-buy font-semibold font-mono">1,820 / s</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-buy w-[78%] shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-text-dim border-t border-white/6 pt-2 font-mono">
          <span>100% Pipeline Balance</span>
          <span>Zero Unsettled Drift</span>
        </div>
      </div>

      {/* Chart 3: Engine Sequence vs Consumer Offset */}
      <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 space-y-4 shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2 text-white">
            <Server className="w-4 h-4 text-brand-400" />
            <h4 className="font-semibold uppercase tracking-wider text-[11px]">
              Seq vs Consumer Offset
            </h4>
          </div>
          <span className="text-[10px] text-buy font-bold font-mono px-2 py-0.5 rounded-full bg-buy-tint border border-buy/30">
            Lag: 0 msgs
          </span>
        </div>

        <div className="p-3.5 rounded-16 bg-white/[0.025] border border-white/6 space-y-2.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Engine Seq:</span>
            <span className="font-bold text-white tabular-nums">#1,894,204</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Consumer Offset:</span>
            <span className="font-bold text-buy tabular-nums">#1,894,204</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-dim pt-2 border-t border-white/6">
            <span>Event-Loop Lag:</span>
            <span className="text-buy font-semibold">1.2ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <Cpu className="w-3.5 h-3.5 text-buy shrink-0" />
          <span>In-memory ring buffer synchronized with persistent WAL.</span>
        </div>
      </div>
    </div>
  );
}
