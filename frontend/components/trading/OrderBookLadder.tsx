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
      className={cn("flex flex-col font-mono text-xs select-none p-0 overflow-hidden", className)}
      role="region"
      aria-label="Order Book Ladder"
    >
      {/* DataTable Rounded Header Strip */}
      <div className="grid grid-cols-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-dim border-b border-glass-border bg-white/[0.02]">
        <span>Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total Depth</span>
      </div>

      {/* Asks (Sellers) Ladder */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden min-h-[190px]">
        {topAsks.length === 0 ? (
          <LineArtEmptyState
            type="NO_SELLERS"
            title="No Sellers"
            description="Ask side empty."
            className="py-4"
          />
        ) : (
          topAsks.map((level) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);
            const isAtCeiling = level.price >= ceilingPrice;

            return (
              <button
                key={`ask-${level.price}`}
                onClick={() => onPriceClick?.(level.price)}
                className="relative grid grid-cols-3 px-4 py-1 text-left items-center group hover:bg-white/[0.04] transition-colors border-b border-white/[0.02]"
                title={`Prefill price: ${formatCurrency(level.price)}`}
              >
                {/* Depth bar fill from right edge at ~18% alpha */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-sell/[0.18] border-l border-sell/40 pointer-events-none transition-all duration-200"
                  style={{ width: `${depthPct}%` }}
                />

                <span
                  className={cn(
                    "relative font-medium flex items-center gap-2",
                    isAtCeiling ? "text-ward font-bold" : "text-sell"
                  )}
                >
                  {level.has_user_order && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-ward inline-block shrink-0 shadow-glow-ward"
                      title="Your resting order"
                    />
                  )}
                  <span>{formatCurrency(level.price)}</span>
                </span>
                <span className="relative text-right text-text-muted">
                  {formatQuantity(level.qty)}
                </span>
                <span className="relative text-right text-text-dim">
                  {formatQuantity(level.total_qty)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Mid-Spread Row as a Glass Pill */}
      <div className="mx-3 my-1.5 p-2 rounded-pill border border-glass-border bg-white/[0.035] backdrop-blur-md flex items-center justify-between text-xs px-4 shadow-glass-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-text-dim">Mid</span>
          <span className="font-bold text-text text-sm">
            {formatCurrency(lastPrice)}
          </span>
        </div>
        <span className="text-[11px] text-ward font-medium">
          Cap: {formatCurrency(ceilingPrice, { showCents: false })}
        </span>
      </div>

      {/* Bids (Buyers) Ladder */}
      <div className="flex-1 overflow-hidden min-h-[190px]">
        {topBids.length === 0 ? (
          <LineArtEmptyState
            type="NO_BUYERS"
            title="No Buyers"
            description="Bid side empty."
            className="py-4"
          />
        ) : (
          topBids.map((level) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);

            return (
              <button
                key={`bid-${level.price}`}
                onClick={() => onPriceClick?.(level.price)}
                className="relative grid grid-cols-3 px-4 py-1 text-left items-center group hover:bg-white/[0.04] transition-colors border-b border-white/[0.02]"
                title={`Prefill price: ${formatCurrency(level.price)}`}
              >
                {/* Depth bar fill from right edge at ~18% alpha */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-buy/[0.18] border-l border-buy/40 pointer-events-none transition-all duration-200"
                  style={{ width: `${depthPct}%` }}
                />

                <span className="relative font-medium text-buy-text flex items-center gap-2">
                  {level.has_user_order && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-ward inline-block shrink-0 shadow-glow-ward"
                      title="Your resting order"
                    />
                  )}
                  <span>{formatCurrency(level.price)}</span>
                </span>
                <span className="relative text-right text-text-muted">
                  {formatQuantity(level.qty)}
                </span>
                <span className="relative text-right text-text-dim">
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
