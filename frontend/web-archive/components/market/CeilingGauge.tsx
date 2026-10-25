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

/**
 * CeilingGauge — Two-tone bar showing face value, last price and the Ward ceiling.
 * The Ward cap sits at the right edge as a glowing ember-gold boundary.
 */
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
    <div className={cn("space-y-2 font-mono", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-[9.5px] uppercase tracking-[0.08em]">
          <span className="text-text-dim">
            Face {formatCurrency(faceValue, { showCents: false })}
          </span>
          <span className={cn("font-semibold", isNearCeiling ? "text-ward" : "text-text")}>
            Last {formatCurrency(lastPrice, { showCents: false })}
          </span>
          <span className="text-ward">
            Cap {formatCurrency(ceilingPrice, { showCents: false })}
          </span>
        </div>
      )}

      {/* The Gauge Track */}
      <div
        className="relative h-2 w-full overflow-hidden rounded-pill border border-glass-border bg-white/[0.04]"
        title={`Resale cap is ${ceilingPct}% of face value (${formatCurrency(faceValue)}). Orders above it are rejected.`}
        role="img"
        aria-label={`Last price ${formatCurrency(lastPrice)}, resale cap ${formatCurrency(ceilingPrice)}`}
      >
        {/* Face value segment */}
        <div
          className="absolute inset-y-0 left-0 bg-white/[0.08]"
          style={{ width: `${facePct}%` }}
        />

        {/* Progress fill up to current price */}
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-300",
            isNearCeiling
              ? "bg-gradient-to-r from-brand-500 to-ward shadow-[0_0_12px_rgba(245,181,68,0.5)]"
              : "bg-gradient-to-r from-brand-500 to-brand-400"
          )}
          style={{ width: `${currentPct}%` }}
        />

        {/* Face Value Tick Marker */}
        <div
          className="absolute inset-y-0 z-10 w-px bg-white/40"
          style={{ left: `${facePct}%` }}
          title={`Face value: ${formatCurrency(faceValue)}`}
        />

        {/* Ceiling Cap Marker (100% right boundary) — the Ward */}
        <div
          className="absolute inset-y-0 right-0 z-10 w-[3px] bg-ward shadow-[0_0_10px_rgba(245,181,68,0.8)]"
          title={`Resale cap: ${formatCurrency(ceilingPrice)} (${ceilingPct}% of face value)`}
        />
      </div>
    </div>
  );
}
