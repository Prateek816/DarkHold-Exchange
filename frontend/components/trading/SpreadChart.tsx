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

  const points = pointsData
    .map((d, i) => {
      const x = (i / (pointsData.length - 1)) * 96 + 2;
      const y = 36 - ((d.spread - minSpread) / range) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastY = 36 - ((currentSpread - minSpread) / range) * 28;

  return (
    <GlassCard className={cn("p-4 font-mono space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-text-dim text-[11px]">
          Spread Over Time
        </span>
        <span className="text-text font-bold text-xs">
          Now: <strong className="text-brand-400">{formatCurrency(currentSpread)}</strong>
        </span>
      </div>

      <div className="h-16 w-full pt-1">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <filter id="spread-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glowing Monotone Line */}
          <polyline
            fill="none"
            stroke="#19CBB0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#spread-glow)"
            points={points}
          />

          {/* End Dot */}
          <circle cx="98" cy={lastY} r="3" fill="#D6F24A" className="animate-pulse" />
        </svg>
      </div>
    </GlassCard>
  );
}
