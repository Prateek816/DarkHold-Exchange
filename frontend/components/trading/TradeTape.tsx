"use client";

import React from "react";
import { TradeTick } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { SimBadge } from "@/components/ui/SimBadge";
import { cn } from "@/lib/utils";

interface TradeTapeProps {
  trades: TradeTick[];
  className?: string;
}

export function TradeTape({ trades, className }: TradeTapeProps) {
  return (
    <GlassCard
      className={cn("flex flex-col overflow-hidden p-0", className)}
      role="region"
      aria-label="Recent trades tape"
    >
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text">
          Trade tape
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span className="h-1 w-1 animate-pulse rounded-full bg-brand-400 shadow-[0_0_5px_#19CBB0]" />
          live
        </span>
      </div>

      <div className="grid grid-cols-4 border-b border-glass-border bg-white/[0.015] px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Age</span>
        <span className="text-right">By</span>
      </div>

      <div className="no-scrollbar max-h-[300px] divide-y divide-white/[0.03] overflow-y-auto">
        {trades.length === 0 ? (
          <div className="p-5 text-center font-mono text-[11px] text-text-dim">
            Awaiting first print…
          </div>
        ) : (
          trades.map((trade, idx) => {
            const isBuy = trade.aggressor_side === "BUY";
            const isLatest = idx === 0;
            const diffSec = Math.floor((Date.now() - trade.timestamp) / 1000);
            const timeStr = diffSec < 5 ? "NOW" : `${diffSec}s`;

            return (
              <div
                key={trade.trade_id || trade.seq}
                className={cn(
                  "grid grid-cols-4 items-center px-4 py-1.5 font-mono text-[10.5px] transition-colors hover:bg-white/[0.035]",
                  isLatest && "animate-count-flash"
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      trade.is_sim
                        ? "bg-violet-400 shadow-[0_0_6px_rgba(124,92,255,0.6)]"
                        : isBuy
                        ? "bg-buy shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                        : "bg-sell shadow-[0_0_6px_rgba(240,80,110,0.6)]"
                    )}
                    title={
                      trade.is_sim
                        ? "Simulated trader execution"
                        : `${trade.aggressor_side} aggressor`
                    }
                  />
                  <span
                    className={cn(
                      "tabular-nums",
                      isBuy ? "font-semibold text-buy-text" : "font-semibold text-sell-text"
                    )}
                  >
                    {formatCurrency(trade.price)}
                  </span>
                </span>

                <span className="text-right tabular-nums text-text-muted">
                  {formatQuantity(trade.qty)}
                </span>

                <span
                  className={cn(
                    "text-right tabular-nums",
                    timeStr === "NOW" ? "font-bold text-lime" : "text-text-dim"
                  )}
                >
                  {timeStr}
                </span>

                <div className="flex justify-end">
                  {trade.is_sim ? (
                    <SimBadge label="SIM" size="sm" />
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
                      live
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
