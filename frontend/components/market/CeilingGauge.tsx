"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CeilingGaugeProps {
  faceValue: number; // minor units
  lastPrice: number;
  ceilingPrice: number;
  ceilingPct: number;
  className?: string;
  showLabels?: boolean;
}

export function CeilingGauge({
  faceValue,
  lastPrice,
  ceilingPrice,
  ceilingPct,
  className,
  showLabels = true,
}: CeilingGaugeProps) {
  const facePct = Math.min(100, Math.max(0, (faceValue / ceilingPrice) * 100));
  const currentPct = Math.min(100, Math.max(0, (lastPrice / ceilingPrice) * 100));
  const isNearCeiling = currentPct >= 96;

  return (
    <div className={cn("space-y-1.5 font-mono", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>Face {formatCurrency(faceValue, { showCents: false })}</span>
          <span className={cn(isNearCeiling ? "text-ward font-bold" : "text-text font-medium")}>
            Last {formatCurrency(lastPrice)}
          </span>
          <span className="text-ward font-semibold">
            Cap {formatCurrency(ceilingPrice, { showCents: false })}
          </span>
        </div>
      )}

      {/* The Gauge Track */}
      <div className="relative w-full h-2 rounded-pill bg-white/[0.05] border border-glass-border overflow-hidden p-[1px]">
        {/* Progress fill up to current price */}
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-300",
            isNearCeiling
              ? "bg-gradient-to-r from-brand-500 to-ward shadow-glow-ward"
              : "bg-gradient-to-r from-brand-500 to-brand-400 shadow-glow-teal"
          )}
          style={{ width: `${currentPct}%` }}
        />

        {/* Face Value Tick Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
          style={{ left: `${facePct}%` }}
          title={`Face Value: ${formatCurrency(faceValue)}`}
        />

        {/* Ceiling Cap Marker (100% right boundary) */}
        <div
          className="absolute top-0 bottom-0 right-0 w-1 bg-ward z-10 shadow-glow-ward"
          title={`The Ward Ceiling: ${formatCurrency(ceilingPrice)} (${ceilingPct}%)`}
        />
      </div>
    </div>
  );
}
