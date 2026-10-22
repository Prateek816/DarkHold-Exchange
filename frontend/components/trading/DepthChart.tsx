"use client";

import React from "react";
import { BookLevel } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface DepthChartProps {
  bids: BookLevel[];
  asks: BookLevel[];
  height?: number;
  className?: string;
}

export function DepthChart({ bids, asks, height = 150, className }: DepthChartProps) {
  if (!bids.length && !asks.length) {
    return (
      <GlassCard className={cn("flex h-[170px] items-center justify-center", className)}>
        <span className="font-mono text-[11px] text-text-dim">Awaiting book depth snapshot…</span>
      </GlassCard>
    );
  }

  const maxBidQty = bids.length > 0 ? bids[bids.length - 1].total_qty : 0;
  const maxAskQty = asks.length > 0 ? asks[asks.length - 1].total_qty : 0;
  const maxQty = Math.max(maxBidQty, maxAskQty, 1);

  const sortedBids = [...bids].reverse();
  const bidPoints: string[] = ["0,150"];

  sortedBids.forEach((b, idx) => {
    const x = (idx / (sortedBids.length || 1)) * 50;
    const y = 150 - (b.total_qty / maxQty) * 135;
    bidPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  bidPoints.push("50,150");

  const askPoints: string[] = ["50,150"];

  asks.forEach((a, idx) => {
    const x = 50 + (idx / (asks.length || 1)) * 50;
    const y = 150 - (a.total_qty / maxQty) * 135;
    askPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  askPoints.push("100,150");

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null;
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;

  return (
    <GlassCard className={cn("flex flex-col p-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text">
          Market depth
        </span>
        <span className="rounded-full border border-glass-border bg-white/[0.03] px-2 py-0.5 font-mono text-[9.5px] text-text-muted">
          Spread{" "}
          <span className="font-semibold tabular-nums text-text">
            {spread !== null ? formatCurrency(spread) : "—"}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 font-mono text-[9.5px]">
        <span className="flex items-center gap-1.5 font-medium text-buy-text">
          <span className="h-1.5 w-1.5 rounded-full bg-buy shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          Bids · {formatQuantity(maxBidQty)}
        </span>
        <span className="text-text-dim">
          {mid !== null ? `Mid ${formatCurrency(mid)}` : "No mid"}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-sell-text">
          Asks · {formatQuantity(maxAskQty)}
          <span className="h-1.5 w-1.5 rounded-full bg-sell shadow-[0_0_6px_rgba(240,80,110,0.6)]" />
        </span>
      </div>

      <div className="relative mx-2 my-2 w-auto overflow-hidden" style={{ height }}>
        <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="depth-bid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="depth-ask-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0506E" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#F0506E" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line
            x1="50"
            y1="0"
            x2="50"
            y2="150"
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="2 2"
          />
          <line
            x1="0"
            y1="75"
            x2="100"
            y2="75"
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 2"
          />
          <line
            x1="0"
            y1="150"
            x2="100"
            y2="150"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />

          <polygon
            points={bidPoints.join(" ")}
            fill="url(#depth-bid-grad)"
            stroke="#22C55E"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />

          <polygon
            points={askPoints.join(" ")}
            fill="url(#depth-ask-grad)"
            stroke="#F0506E"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>

        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 select-none rounded-full border border-glass-border bg-canvas-elevated/90 px-2 py-0.5 font-mono text-[9px] text-text-muted shadow-glass-sm backdrop-blur-md">
          Mid
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-white/[0.06] border-t border-glass-border font-mono text-[9.5px]">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-text-dim">Best bid</span>
          <span className="font-semibold tabular-nums text-buy-text">
            {bestBid ? formatCurrency(bestBid) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-text-dim">Best ask</span>
          <span className="font-semibold tabular-nums text-sell-text">
            {bestAsk ? formatCurrency(bestAsk) : "—"}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
