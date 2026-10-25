"use client";

import React from "react";
import type { BookLevel } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DepthChartProps {
  bids: BookLevel[];
  asks: BookLevel[];
  height?: number;
  className?: string;
}

/**
 * DepthChart — Mint bids, rose asks, soft glow, mid-price hairline.
 * The area grows away from the mid so the two sides read as a single shape.
 */
export function DepthChart({ bids, asks, height = 150, className }: DepthChartProps) {
  if (!bids.length && !asks.length) {
    return (
      <section
        className={cn(
          "flex h-[190px] items-center justify-center rounded-card border border-glass-border bg-white/[0.02]",
          className
        )}
      >
        <span className="font-mono text-[10px] text-text-dim">
          Awaiting book depth snapshot…
        </span>
      </section>
    );
  }

  const bidDepth = bids.length > 0 ? bids[bids.length - 1].total_qty : 0;
  const askDepth = asks.length > 0 ? asks[asks.length - 1].total_qty : 0;
  const maxQty = Math.max(bidDepth, askDepth, 1);

  const sortedBids = [...bids].reverse();
  const bidPoints: string[] = ["0,150"];

  sortedBids.forEach((level, index) => {
    const x = (index / (sortedBids.length || 1)) * 50;
    const y = 150 - (level.total_qty / maxQty) * 135;
    bidPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  bidPoints.push("50,150");

  const askPoints: string[] = ["50,150"];

  asks.forEach((level, index) => {
    const x = 50 + (index / (asks.length || 1)) * 50;
    const y = 150 - (level.total_qty / maxQty) * 135;
    askPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  askPoints.push("100,150");

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null;
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : null;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-glass-border bg-white/[0.02] shadow-card",
        className
      )}
      aria-label="Order book depth"
    >
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-5 py-3.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
          Market depth
        </span>
        <span className="font-mono text-[9.5px] text-text-dim">
          Spread{" "}
          <span className="tabular-nums text-text">
            {spread !== null ? formatCurrency(spread) : "—"}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between px-5 pt-3 font-mono text-[9px] uppercase tracking-[0.06em]">
        <span className="flex items-center gap-1.5 text-buy">
          <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
          Bids · {formatQuantity(bidDepth)}
        </span>
        <span className="text-text-dim">
          {mid !== null ? `Mid ${formatCurrency(mid)}` : "No mid"}
        </span>
        <span className="flex items-center gap-1.5 text-sell">
          Asks · {formatQuantity(askDepth)}
          <span className="h-1.5 w-1.5 rounded-full bg-sell" />
        </span>
      </div>

      <div className="relative mx-3 my-2.5 w-auto overflow-hidden" style={{ height }}>
        <svg
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`Depth chart: best bid ${formatCurrency(bestBid)}, best ask ${formatCurrency(bestAsk)}`}
        >
          <defs>
            <linearGradient id="depth-bid-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14CBAA" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#14CBAA" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="depth-ask-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0405E" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E0405E" stopOpacity="0" />
            </linearGradient>
            <filter id="depth-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Mid-price hairline */}
          <line
            x1="50"
            y1="0"
            x2="50"
            y2="150"
            stroke="rgba(255,255,255,0.14)"
            strokeDasharray="2 2"
            strokeWidth="0.6"
          />
          <line
            x1="0"
            y1="150"
            x2="100"
            y2="150"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />

          <polygon
            points={bidPoints.join(" ")}
            fill="url(#depth-bid-fill)"
            stroke="#14CBAA"
            strokeWidth="1.4"
            strokeLinejoin="round"
            filter="url(#depth-glow)"
          />
          <polygon
            points={askPoints.join(" ")}
            fill="url(#depth-ask-fill)"
            stroke="#E0405E"
            strokeWidth="1.4"
            strokeLinejoin="round"
            filter="url(#depth-glow)"
          />
        </svg>

        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 select-none rounded-pill border border-glass-border bg-canvas-elevated/90 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-text-dim backdrop-blur-sm">
          Mid
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-glass-border border-t border-glass-border font-mono text-[9.5px]">
        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-text-dim">Best bid</span>
          <span className="tabular-nums text-buy">
            {bestBid ? formatCurrency(bestBid) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-text-dim">Best ask</span>
          <span className="tabular-nums text-sell">
            {bestAsk ? formatCurrency(bestAsk) : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
