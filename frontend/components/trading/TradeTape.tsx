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
      className={cn("flex flex-col font-mono text-xs overflow-hidden p-0", className)}
      role="region"
      aria-label="Recent Trades Tape"
    >
      {/* Header */}
      <div className="grid grid-cols-4 px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-dim border-b border-glass-border bg-white/[0.02]">
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Time</span>
        <span className="text-right">Trader</span>
      </div>

      {/* Trades List */}
      <div className="overflow-y-auto max-h-[300px] divide-y divide-white/[0.03]">
        {trades.length === 0 ? (
          <div className="p-4 text-center text-text-dim text-xs">
            No recent trades on the tape.
          </div>
        ) : (
          trades.map((trade, idx) => {
            const isBuy = trade.aggressor_side === "BUY";
            const isLatest = idx === 0;

            // Compute relative time string ("NOW" for < 5s)
            const diffSec = Math.floor((Date.now() - trade.timestamp) / 1000);
            const timeStr = diffSec < 5 ? "NOW" : `${diffSec}s`;

            return (
              <div
                key={trade.trade_id || trade.seq}
                className="grid grid-cols-4 px-4 py-2 items-center hover:bg-white/[0.035] transition-colors"
              >
                {/* Price with Aggressor Side dot */}
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      trade.is_sim
                        ? "bg-sim shadow-[0_0_6px_rgba(124,92,255,0.6)]"
                        : isBuy
                        ? "bg-buy shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                        : "bg-sell shadow-[0_0_6px_rgba(240,80,110,0.6)]"
                    )}
                    title={
                      trade.is_sim
                        ? "Simulated trader execution"
                        : `${trade.aggressor_side} Aggressor`
                    }
                  />
                  <span className={cn("tabular-nums", isBuy ? "text-buy-text font-semibold" : "text-sell font-semibold")}>
                    {formatCurrency(trade.price)}
                  </span>
                </span>

                {/* Quantity */}
                <span className="text-right text-text-muted tabular-nums">
                  {formatQuantity(trade.qty)}
                </span>

                {/* Time (NOW style) */}
                <span
                  className={cn(
                    "text-right text-[11px] tabular-nums",
                    timeStr === "NOW" ? "text-lime font-bold" : "text-text-dim"
                  )}
                >
                  {timeStr}
                </span>

                {/* Counterparty / SIM badge */}
                <div className="text-right flex justify-end">
                  {trade.is_sim ? (
                    <SimBadge label="SIM" size="sm" />
                  ) : (
                    <span className="text-[10px] text-text-dim uppercase font-mono">Live</span>
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
