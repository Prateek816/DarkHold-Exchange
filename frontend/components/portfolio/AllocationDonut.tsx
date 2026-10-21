"use client";

import React from "react";
import { WalletHolding } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllocationDonutProps {
  holdings: WalletHolding[];
  availableCredits: number;
  className?: string;
}

const PALETTE = ["#19CBB0", "#7C5CFF", "#D6F24A", "#F5B544", "#5AA9FF"];

export function AllocationDonut({
  holdings,
  availableCredits,
  className,
}: AllocationDonutProps) {
  const items = [
    {
      name: "Cash Credits",
      value: availableCredits,
      color: "#19CBB0",
    },
    ...holdings.map((h, i) => ({
      name: h.name,
      value: h.total_units * h.current_price,
      color: PALETTE[(i + 1) % PALETTE.length],
    })),
  ];

  const totalValuation = items.reduce((sum, item) => sum + item.value, 0) || 1;

  let cumulativeAngle = 0;
  const slices = items.map((item) => {
    const fraction = item.value / totalValuation;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...item,
      fraction,
      startAngle,
      angle,
    };
  });

  return (
    <GlassCard glowEdge="teal" className={cn("p-6 space-y-4 font-mono", className)}>
      <SectionHeader
        icon={PieChart}
        iconVariant="teal"
        title="Asset Allocation Breakdown"
        subtitle="Distribution across liquid credits and vault relics."
      />

      <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
        {/* Glowing Thick Ring Donut */}
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <defs>
              <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="14"
            />

            {slices.map((slice, idx) => {
              const strokeDasharray = `${(slice.fraction * 238.7).toFixed(1)} 238.7`;
              const strokeDashoffset = -((slice.startAngle / 360) * 238.7).toFixed(1);

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#donut-glow)"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Centered Big Tabular Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-text-dim uppercase font-mono">Portfolio</span>
            <span className="text-sm font-bold text-text tabular-nums font-mono">
              {formatCurrency(totalValuation, { showCents: false })}
            </span>
          </div>
        </div>

        {/* Legend as Glass Pills */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {slices.map((slice, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-[12px] bg-white/[0.025] border border-glass-border hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-text-muted truncate text-xs">{slice.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-text font-semibold tabular-nums">
                  {formatCurrency(slice.value)}
                </span>
                <span className="text-text-dim text-[11px] font-mono w-12 text-right">
                  {formatPercent(slice.fraction * 100, false)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
