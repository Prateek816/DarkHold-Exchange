"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SpreadChartProps {
  spreadHistory: { time: number; spread: number }[];
  currentSpread?: number;
  bestBid?: number;
  bestAsk?: number;
  className?: string;
}

/**
 * A derived spread panel, not a fabricated benchmark. The line only appears
 * after two accepted book snapshots, and the numbers come from that book.
 */
export function SpreadChart({
  spreadHistory,
  currentSpread,
  bestBid,
  bestAsk,
  className,
}: SpreadChartProps) {
  const hasSpread = currentSpread !== undefined && Number.isFinite(currentSpread);
  const mid =
    bestBid !== undefined && bestAsk !== undefined ? (bestBid + bestAsk) / 2 : undefined;
  const bps =
    hasSpread && mid && mid > 0 ? ((currentSpread as number) / mid) * 10_000 : undefined;

  const pointsData = spreadHistory.slice(-40);
  const maxSpread = pointsData.length > 0 ? Math.max(...pointsData.map((point) => point.spread)) : 0;
  const minSpread = pointsData.length > 0 ? Math.min(...pointsData.map((point) => point.spread)) : 0;
  const range = maxSpread - minSpread || 1;

  const coords = pointsData.map((point, index) => {
    const x =
      pointsData.length === 1 ? 50 : (index / (pointsData.length - 1)) * 96 + 2;
    const y = 36 - ((point.spread - minSpread) / range) * 28;
    return { x, y };
  });
  const points = coords.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <section
      className={cn("flex flex-col border border-glass-border bg-surface", className)}
      aria-label="Derived bid-ask spread"
    >
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">Spread</span>
        <span className="font-mono text-[10px] tabular-nums text-brand-300">
          {hasSpread ? formatCurrency(currentSpread) : "—"}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-glass-border border-b border-glass-border">
        <div className="px-3 py-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-text-dim">Bid</p>
          <p className="pt-0.5 font-mono text-[10px] tabular-nums text-buy-text">
            {formatCurrency(bestBid)}
          </p>
        </div>
        <div className="px-3 py-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-text-dim">Mid</p>
          <p className="pt-0.5 font-mono text-[10px] tabular-nums text-text">
            {formatCurrency(mid)}
          </p>
        </div>
        <div className="px-3 py-2">
          <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-text-dim">Ask</p>
          <p className="pt-0.5 font-mono text-[10px] tabular-nums text-sell-text">
            {formatCurrency(bestAsk)}
          </p>
        </div>
      </div>

      <div className="px-3 pb-2 pt-3">
        <div className="h-16 w-full">
          {pointsData.length > 1 ? (
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`Spread history across ${pointsData.length} book snapshots`}
            >
              <line
                x1="0"
                y1="30"
                x2="100"
                y2="30"
                stroke="rgba(243,233,216,0.06)"
                strokeDasharray="2 2"
              />
              <polyline
                fill="none"
                stroke="#cdb077"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {last && (
                <circle cx={last.x} cy={last.y} r="1.6" fill="#f3e9d8" stroke="#100c0a" strokeWidth="0.6" />
              )}
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center border border-dashed border-glass-border px-2 text-center font-mono text-[8.5px] leading-relaxed text-text-dim">
              {hasSpread
                ? "Session history starts after two accepted book snapshots."
                : "Waiting for a two-sided book."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 font-mono text-[8.5px] text-text-dim">
          <span>
            {bps === undefined ? "—" : `${bps.toFixed(1)} bps`} of mid
          </span>
          <span>
            {pointsData.length > 1
              ? `min ${formatCurrency(minSpread)} · max ${formatCurrency(maxSpread)}`
              : "derived, not a benchmark"}
          </span>
        </div>
      </div>
    </section>
  );
}
