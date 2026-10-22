"use client";

import React, { useMemo } from "react";
import { BookLevel } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { cn } from "@/lib/utils";

interface OrderBookLadderProps {
  bids: BookLevel[];
  asks: BookLevel[];
  lastPrice?: number;
  ceilingPrice: number;
  onPriceClick?: (price: number) => void;
  className?: string;
}

export function OrderBookLadder({
  bids,
  asks,
  lastPrice,
  ceilingPrice,
  onPriceClick,
  className,
}: OrderBookLadderProps) {
  const topAsks = useMemo(() => [...asks].slice(0, 15).reverse(), [asks]);
  const topBids = useMemo(() => [...bids].slice(0, 15), [bids]);

  const maxTotal = useMemo(() => {
    const maxAsk = topAsks.length > 0 ? topAsks[0]?.total_qty ?? 0 : 0;
    const maxBid = topBids.length > 0 ? topBids[topBids.length - 1]?.total_qty ?? 0 : 0;
    return Math.max(maxAsk, maxBid, 1);
  }, [topAsks, topBids]);

  return (
    <GlassCard
      className={cn("flex select-none flex-col overflow-hidden p-0", className)}
      role="region"
      aria-label="Order book ladder"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text">
          Order book
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span className="h-1 w-1 rounded-full bg-buy shadow-[0_0_5px_#22C55E]" />
          depth · 10/s
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 border-b border-glass-border bg-white/[0.015] px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="no-scrollbar max-h-[168px] flex-1 overflow-y-auto">
        {topAsks.length === 0 ? (
          <LineArtEmptyState
            type="NO_SELLERS"
            title="No sellers"
            description="Ask side empty."
            className="py-3"
          />
        ) : (
          topAsks.map((level, idx) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);
            const isAtCeiling = level.price >= ceilingPrice;

            return (
              <button
                key={`ask-${level.price}-${idx}`}
                onClick={() => onPriceClick?.(level.price)}
                className="group relative grid w-full grid-cols-3 items-center border-b border-white/[0.025] px-4 py-[5px] text-left font-mono text-[10.5px] transition-colors last:border-0 hover:bg-white/[0.04]"
                title={`Prefill price: ${formatCurrency(level.price)}`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 border-l border-sell/30 bg-sell/[0.12] transition-all duration-200"
                  style={{ width: `${depthPct}%` }}
                />

                <span
                  className={cn(
                    "relative flex items-center gap-1.5 font-medium",
                    isAtCeiling ? "font-bold text-warning" : "text-sell-text"
                  )}
                >
                  {level.has_user_order && (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning shadow-glow-ward"
                      title="Your resting order"
                    />
                  )}
                  <span className="tabular-nums">{formatCurrency(level.price)}</span>
                </span>
                <span className="relative text-right tabular-nums text-text-muted">
                  {formatQuantity(level.qty)}
                </span>
                <span className="relative text-right tabular-nums text-text-dim">
                  {formatQuantity(level.total_qty)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Mid spread */}
      <div className="mx-3 my-1.5 flex items-center justify-between rounded-full border border-glass-border bg-white/[0.035] px-3 py-1.5 shadow-glass-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">Last</span>
          <span className="font-mono text-[12px] font-bold tabular-nums text-text">
            {formatCurrency(lastPrice)}
          </span>
        </div>
        <span className="font-mono text-[9.5px] font-medium text-warning">
          Cap {formatCurrency(ceilingPrice, { showCents: false })}
        </span>
      </div>

      {/* Bids */}
      <div className="no-scrollbar max-h-[168px] flex-1 overflow-y-auto">
        {topBids.length === 0 ? (
          <LineArtEmptyState
            type="NO_BUYERS"
            title="No buyers"
            description="Bid side empty."
            className="py-3"
          />
        ) : (
          topBids.map((level, idx) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);

            return (
              <button
                key={`bid-${level.price}-${idx}`}
                onClick={() => onPriceClick?.(level.price)}
                className="group relative grid w-full grid-cols-3 items-center border-b border-white/[0.025] px-4 py-[5px] text-left font-mono text-[10.5px] transition-colors last:border-0 hover:bg-white/[0.04]"
                title={`Prefill price: ${formatCurrency(level.price)}`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 border-l border-buy/30 bg-buy/[0.12] transition-all duration-200"
                  style={{ width: `${depthPct}%` }}
                />

                <span className="relative flex items-center gap-1.5 font-medium text-buy-text">
                  {level.has_user_order && (
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning shadow-glow-ward"
                      title="Your resting order"
                    />
                  )}
                  <span className="tabular-nums">{formatCurrency(level.price)}</span>
                </span>
                <span className="relative text-right tabular-nums text-text-muted">
                  {formatQuantity(level.qty)}
                </span>
                <span className="relative text-right tabular-nums text-text-dim">
                  {formatQuantity(level.total_qty)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
