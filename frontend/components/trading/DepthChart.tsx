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
      <GlassCard className="h-[170px] flex items-center justify-center text-xs font-mono text-text-dim">
        Awaiting book depth snapshot...
      </GlassCard>
    );
  }

  const maxBidQty = bids.length > 0 ? bids[bids.length - 1].total_qty : 0;
  const maxAskQty = asks.length > 0 ? asks[asks.length - 1].total_qty : 0;
  const maxQty = Math.max(maxBidQty, maxAskQty, 1);

  const sortedBids = [...bids].reverse();
  const bidPoints: string[] = [];
  bidPoints.push("0,150");

  sortedBids.forEach((b, idx) => {
    const x = (idx / (sortedBids.length || 1)) * 50;
    const y = 150 - (b.total_qty / maxQty) * 135;
    bidPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  bidPoints.push("50,150");

  const askPoints: string[] = [];
  askPoints.push("50,150");

  asks.forEach((a, idx) => {
    const x = 50 + (idx / (asks.length || 1)) * 50;
    const y = 150 - (a.total_qty / maxQty) * 135;
    askPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  askPoints.push("100,150");

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;

  return (
    <GlassCard className={cn("p-4 space-y-3 font-mono", className)}>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1.5 text-buy-text font-medium">
          <span className="w-2 h-2 rounded-full bg-buy shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          <span>Bids Depth ({formatQuantity(maxBidQty)})</span>
        </span>
        <span className="text-text-dim text-[11px] px-2 py-0.5 rounded-pill bg-white/[0.03] border border-glass-border">
          Spread: {bestAsk && bestBid ? formatCurrency(bestAsk - bestBid) : "—"}
        </span>
        <span className="flex items-center gap-1.5 text-sell font-medium">
          <span>Asks Depth ({formatQuantity(maxAskQty)})</span>
          <span className="w-2 h-2 rounded-full bg-sell shadow-[0_0_6px_rgba(240,80,110,0.6)]" />
        </span>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg viewBox="0 0 100 150" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="depth-bid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="depth-ask-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0506E" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F0506E" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="50" y1="0" x2="50" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />

          {/* Bids Green Area */}
          <polygon
            points={bidPoints.join(" ")}
            fill="url(#depth-bid-grad)"
            stroke="#22C55E"
            strokeWidth="1.5"
          />

          {/* Asks Red Area */}
          <polygon
            points={askPoints.join(" ")}
            fill="url(#depth-ask-grad)"
            stroke="#F0506E"
            strokeWidth="1.5"
          />
        </svg>

        {/* Center Mid-Price Hairline Marker */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-pill bg-canvas-elevated/90 border border-glass-border text-[10px] text-text-muted shadow-glass-sm select-none">
          Mid
        </div>
      </div>
    </GlassCard>
  );
}
