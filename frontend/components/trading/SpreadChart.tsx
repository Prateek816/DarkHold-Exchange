"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface SpreadChartProps {
  spreadHistory: { time: number; spread: number }[];
  currentSpread?: number;
  className?: string;
}

export function SpreadChart({
  spreadHistory,
  currentSpread = 200,
  className,
}: SpreadChartProps) {
  const pointsData =
    spreadHistory.length > 1
      ? spreadHistory
      : [
          { time: 1, spread: 250 },
          { time: 2, spread: 200 },
          { time: 3, spread: 300 },
          { time: 4, spread: 150 },
          { time: 5, spread: 200 },
          { time: 6, spread: currentSpread },
        ];

  const maxSpread = Math.max(...pointsData.map((d) => d.spread), 1);
  const minSpread = Math.min(...pointsData.map((d) => d.spread), 0);
  const range = maxSpread - minSpread || 1;

  const coords = pointsData.map((d, i) => {
    const x = (i / (pointsData.length - 1)) * 96 + 2;
    const y = 36 - ((d.spread - minSpread) / range) * 28;
    return { x, y };
  });

  const points = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `2,40 ${points} 98,40`;
  const last = coords[coords.length - 1];

  return (
    <GlassCard className={cn("flex flex-col p-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-2.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text">
          Spread
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-text-dim">now</span>
          <span className="font-bold tabular-nums text-brand-400">
            {formatCurrency(currentSpread)}
          </span>
        </span>
      </div>

      <div className="px-2 pb-2 pt-3">
        <div className="h-16 w-full">
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id="spread-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#19CBB0" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#19CBB0" stopOpacity="0" />
              </linearGradient>
              <filter id="spread-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <line
              x1="0"
              y1="30"
              x2="100"
              y2="30"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 2"
            />

            <polygon points={area} fill="url(#spread-area-grad)" />

            <polyline
              fill="none"
              stroke="#19CBB0"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#spread-glow)"
              points={points}
            />

            {last && (
              <>
                <circle cx={last.x} cy={last.y} r="3.4" fill="rgba(25,203,176,0.22)" />
                <circle
                  cx={last.x}
                  cy={last.y}
                  r="1.8"
                  fill="#D6F24A"
                  className="animate-pulse"
                />
              </>
            )}
          </svg>
        </div>

        <div className="flex items-center justify-between pt-1 font-mono text-[9px] text-text-dim">
          <span>min {formatCurrency(minSpread)}</span>
          <span>max {formatCurrency(maxSpread)}</span>
        </div>
      </div>
    </GlassCard>
  );
}
