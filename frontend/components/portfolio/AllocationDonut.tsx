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
  reservedCredits?: number;
  className?: string;
}

const PALETTE = ["#7C5CFF", "#D6F24A", "#5AA9FF", "#F0506E"];

export function AllocationDonut({
  holdings,
  availableCredits,
  reservedCredits = 0,
  className,
}: AllocationDonutProps) {
  const items = [
    { name: "Available credits", value: availableCredits, color: "#19CBB0" },
    ...(reservedCredits > 0
      ? [{ name: "Reserved credits", value: reservedCredits, color: "#F5B544" }]
      : []),
    ...holdings.map((h, i) => ({
      name: h.name,
      value: h.total_units * h.current_price,
      color: PALETTE[i % PALETTE.length],
    })),
  ];

  const totalValuation = items.reduce((sum, item) => sum + item.value, 0) || 1;

  let cumulativeAngle = 0;
  const slices = items.map((item) => {
    const fraction = item.value / totalValuation;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...item, fraction, startAngle, angle };
  });

  return (
    <GlassCard glowEdge="teal" className={cn("flex flex-col gap-4 p-5 sm:p-6", className)}>
      <SectionHeader
        icon={PieChart}
        iconVariant="teal"
        title="Asset allocation"
        subtitle="Distribution across available, reserved, and vaulted value."
      />

      <div className="flex flex-col items-center gap-6 pt-1 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <defs>
              <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="13"
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
                  strokeWidth="13"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#donut-glow)"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-text-dim">
              Portfolio
            </span>
            <span className="pt-0.5 font-display text-[16px] font-semibold tracking-tight text-text tabular-nums">
              {formatCurrency(totalValuation)}
            </span>
            <span className="font-mono text-[8.5px] text-text-dim">total valuation</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-1.5">
          {slices.map((slice, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-[11px] border border-glass-border bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.045]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[11px] text-text-muted">{slice.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono">
                <span className="text-[10.5px] font-semibold tabular-nums text-text">
                  {formatCurrency(slice.value)}
                </span>
                <span className="w-10 text-right text-[9.5px] tabular-nums text-text-dim">
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
