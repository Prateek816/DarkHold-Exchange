"use client";

import React, { useMemo } from "react";
import type { BookLevel } from "@/lib/types";
import { formatCurrency, formatDataAge, formatQuantity } from "@/lib/format";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { cn } from "@/lib/utils";

interface OrderBookLadderProps {
  bids: BookLevel[];
  asks: BookLevel[];
  lastPrice?: number;
  ceilingPrice: number;
  asOfSeq?: number;
  snapshotAt?: number;
  onPriceClick?: (price: number) => void;
  className?: string;
}

export function OrderBookLadder({
  bids,
  asks,
  lastPrice,
  ceilingPrice,
  asOfSeq,
  snapshotAt,
  onPriceClick,
  className,
}: OrderBookLadderProps) {
  // Snapshots should arrive best-price-first, but sorting here keeps the
  // ladder correct if a feed sends levels in another order. Only asks at or
  // below the cap can execute, so higher levels are noise.
  const topAsks = useMemo(
    () =>
      [...asks]
        .filter((level) => level.price <= ceilingPrice)
        .sort((a, b) => a.price - b.price)
        .slice(0, 12)
        .reverse(),
    [asks, ceilingPrice]
  );
  const topBids = useMemo(
    () => [...bids].sort((a, b) => b.price - a.price).slice(0, 12),
    [bids]
  );
  const age = formatDataAge(snapshotAt);

  const maxTotal = useMemo(() => {
    const maxAsk = topAsks.length > 0 ? topAsks[0]?.total_qty ?? 0 : 0;
    const maxBid = topBids.length > 0 ? topBids[topBids.length - 1]?.total_qty ?? 0 : 0;
    return Math.max(maxAsk, maxBid, 1);
  }, [topAsks, topBids]);

  return (
    <section
      className={cn(
        "select-none overflow-hidden rounded-card border border-glass-border bg-white/[0.02] shadow-card",
        className
      )}
      role="region"
      aria-label="Order book ladder"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border px-5 py-3.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
          Order book
        </span>
        <span
          className={cn(
            "font-mono text-[8.5px] uppercase tracking-[0.06em]",
            age.isStale ? "text-warning" : "text-text-dim"
          )}
          title="Sequence and age of the last accepted snapshot"
        >
          seq {asOfSeq?.toLocaleString("en-US") ?? "—"} · {age.text}
        </span>
      </div>

      <div className="grid grid-cols-3 border-b border-glass-border bg-white/[0.015] px-5 py-2 font-mono text-[8.5px] uppercase tracking-[0.09em] text-text-dim">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="no-scrollbar max-h-[168px] overflow-y-auto">
        {topAsks.length === 0 ? (
          <LineArtEmptyState
            variant="no-sellers"
            message="The ask ladder is empty in this snapshot."
            className="py-4"
          />
        ) : (
          topAsks.map((level, index) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);
            const isAtCeiling = level.price >= ceilingPrice;
            return (
              <button
                key={`ask-${level.price}-${index}`}
                type="button"
                onClick={() => onPriceClick?.(level.price)}
                className="group relative grid w-full grid-cols-3 items-center border-b border-white/[0.025] px-5 py-[6px] text-left font-mono text-[10.5px] transition-colors last:border-0 hover:bg-white/[0.035]"
                title={`Use ask ${formatCurrency(level.price)} in the ticket`}
                aria-label={`Ask ${formatCurrency(level.price)}, ${formatQuantity(
                  level.qty
                )} units. Use as ticket price.`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 border-l"
                  style={{
                    width: `${depthPct}%`,
                    borderColor:
                      isAtCeiling
                        ? "rgba(245,181,68,0.35)"
                        : "rgba(224,64,94,0.30)",
                    backgroundImage: isAtCeiling
                      ? "linear-gradient(to left, rgba(245,181,68,0.20), rgba(245,181,68,0.02))"
                      : "linear-gradient(to left, rgba(224,64,94,0.18), rgba(224,64,94,0.02))",
                  }}
                />
                <span
                  className={cn(
                    "relative flex items-center gap-1.5",
                    isAtCeiling ? "text-ward" : "text-sell"
                  )}
                >
                  {level.has_user_order && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(124,92,255,0.9)]"
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

      {/* Spread row — glass pill */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5">
        <span className="flex w-full items-center justify-between gap-3 rounded-pill border border-glass-border bg-white/[0.035] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
          <span className="flex items-center gap-2">
            Last
            <span className="text-[12px] tabular-nums text-text">
              {formatCurrency(lastPrice)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-ward">
            <span className="h-1.5 w-1.5 rounded-full bg-ward shadow-[0_0_6px_rgba(245,181,68,0.8)]" />
            Resale cap {formatCurrency(ceilingPrice, { showCents: false })}
          </span>
        </span>
      </div>

      <div className="no-scrollbar max-h-[168px] overflow-y-auto">
        {topBids.length === 0 ? (
          <LineArtEmptyState
            variant="no-buyers"
            message="The bid ladder is empty in this snapshot."
            className="py-4"
          />
        ) : (
          topBids.map((level, index) => {
            const depthPct = Math.min(100, (level.total_qty / maxTotal) * 100);
            return (
              <button
                key={`bid-${level.price}-${index}`}
                type="button"
                onClick={() => onPriceClick?.(level.price)}
                className="group relative grid w-full grid-cols-3 items-center border-b border-white/[0.025] px-5 py-[6px] text-left font-mono text-[10.5px] transition-colors last:border-0 hover:bg-white/[0.035]"
                title={`Use bid ${formatCurrency(level.price)} in the ticket`}
                aria-label={`Bid ${formatCurrency(level.price)}, ${formatQuantity(
                  level.qty
                )} units. Use as ticket price.`}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 border-l border-mint-500/30"
                  style={{
                    width: `${depthPct}%`,
                    backgroundImage:
                      "linear-gradient(to left, rgba(25,203,176,0.18), rgba(25,203,176,0.02))",
                  }}
                />
                <span className="relative flex items-center gap-1.5 text-buy">
                  {level.has_user_order && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(124,92,255,0.9)]"
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

      <p className="border-t border-glass-border px-5 py-2.5 font-mono text-[8.5px] leading-relaxed text-text-dim">
        Click a level to prefill the limit price. Depth is a server snapshot, not a live venue
        feed.
      </p>
    </section>
  );
}
