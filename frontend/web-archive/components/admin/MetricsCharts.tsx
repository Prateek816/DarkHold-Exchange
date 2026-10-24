"use client";

import React from "react";
import { Activity, Zap, Server, Cpu } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

const bins = [
  { range: "<50ms", count: 480 },
  { range: "50-100", count: 820 },
  { range: "100-200", count: 1450 },
  { range: "200-400", count: 320 },
  { range: "400-800", count: 70 },
  { range: ">800ms", count: 12 },
];

export function MetricsCharts({ className }: { className?: string }) {
  const maxCount = Math.max(...bins.map((b) => b.count));

  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-3", className)}>
      {/* Chart 1: Settlement lag histogram */}
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3 border-b border-glass-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-buy/30 bg-buy/10 text-buy">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text">
                Settlement latency
              </h4>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-dim">
                SLA distribution
              </p>
            </div>
          </div>
          <span className="rounded-full border border-buy/30 bg-buy-tint px-2 py-0.5 font-mono text-[9px] font-bold text-buy-text">
            p50 142ms
          </span>
        </div>

        <div className="flex h-32 items-end gap-2">
          {bins.map((bin, i) => {
            const heightPct = (bin.count / maxCount) * 100;
            const isP50 = i === 2;
            const isP99 = i === 5;

            return (
              <div
                key={bin.range}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 font-mono"
              >
                <span className="text-[9px] tabular-nums text-text-dim">{bin.count}</span>
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-all duration-300",
                    isP99
                      ? "bg-sell shadow-[0_0_8px_rgba(240,80,110,0.45)]"
                      : isP50
                      ? "bg-gradient-to-t from-buy/70 to-buy shadow-[0_0_10px_rgba(34,197,94,0.35)]"
                      : "bg-white/[0.14] hover:bg-white/[0.22]"
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${bin.range}: ${bin.count} settlements`}
                />
                <span className="w-full truncate text-center text-[8.5px] text-text-muted">
                  {bin.range}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-glass-border pt-2.5 font-mono text-[9px] text-text-dim">
          <span>p99 780ms</span>
          <span>2,450 settlements</span>
        </div>
      </GlassCard>

      {/* Chart 2: Pipeline throughput */}
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3 border-b border-glass-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-warning/30 bg-warning/10 text-warning">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text">
                Engine rate
              </h4>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-dim">
                Orders per second
              </p>
            </div>
          </div>
          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold text-warning">
            2,450 ops/s
          </span>
        </div>

        <div className="space-y-3.5">
          {[
            { label: "Offered orders", value: "2,450 / s", pct: 92, className: "bg-white/40" },
            {
              label: "Matched trades",
              value: "1,820 / s",
              pct: 78,
              className: "bg-brand-500 shadow-[0_0_8px_rgba(25,203,176,0.45)]",
            },
            {
              label: "Settled on ledger",
              value: "1,820 / s",
              pct: 78,
              className: "bg-buy shadow-[0_0_8px_rgba(34,197,94,0.35)]",
            },
          ].map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>{row.label}</span>
                <span className="font-mono font-semibold tabular-nums text-text">{row.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-glass-border bg-white/[0.04]">
                <div
                  className={cn("h-full rounded-full", row.className)}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex justify-between border-t border-glass-border pt-2.5 font-mono text-[9px] text-text-dim">
          <span>100% pipeline balance</span>
          <span>zero unsettled drift</span>
        </div>
      </GlassCard>

      {/* Chart 3: Sequence vs offset */}
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3 border-b border-glass-border pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-brand-500/30 bg-brand-500/10 text-brand-400">
              <Server className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text">
                Sequence vs offset
              </h4>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-dim">
                Consumer lag
              </p>
            </div>
          </div>
          <span className="rounded-full border border-buy/30 bg-buy-tint px-2 py-0.5 font-mono text-[9px] font-bold text-buy-text">
            Lag 0 msgs
          </span>
        </div>

        <div className="space-y-2.5 rounded-panel border border-glass-border bg-white/[0.02] p-3.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-text-muted">Engine sequence</span>
            <span className="text-[11.5px] font-bold tabular-nums text-text">#1,894,204</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-text-muted">Consumer offset</span>
            <span className="text-[11.5px] font-bold tabular-nums text-buy-text">
              #1,894,204
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-glass-border pt-2.5 text-[10px] text-text-dim">
            <span>Event-loop lag</span>
            <span className="font-semibold text-buy-text">1.2 ms</span>
          </div>
        </div>

        <div className="mt-auto flex items-start gap-2 border-t border-glass-border pt-2.5 text-[10.5px] leading-relaxed text-text-muted">
          <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-buy" />
          <span>In-memory ring buffer synchronized with the persistent write-ahead log.</span>
        </div>
      </GlassCard>
    </div>
  );
}
