"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GaugeBarProps {
  valuePct: number; // 0 to 100
  secondaryPct?: number; // optional second segment
  leftLabel?: string;
  rightLabel?: string;
  leftValue?: string;
  rightValue?: string;
  variant?: "brand-violet" | "green-red" | "ward";
  height?: number;
  className?: string;
}

export function GaugeBar({
  valuePct,
  secondaryPct = 0,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  variant = "brand-violet",
  height = 8,
  className,
}: GaugeBarProps) {
  const safeValue = Math.min(100, Math.max(0, valuePct));
  const safeSecondary = Math.min(100 - safeValue, Math.max(0, secondaryPct));

  return (
    <div className={cn("w-full space-y-1.5 font-mono text-xs", className)}>
      {(leftLabel || rightLabel || leftValue || rightValue) && (
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            {leftLabel && <span className="uppercase text-text-dim">{leftLabel}</span>}
            {leftValue && <span className="font-semibold text-text">{leftValue}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {rightValue && <span className="font-semibold text-text">{rightValue}</span>}
            {rightLabel && <span className="uppercase text-text-dim">{rightLabel}</span>}
          </div>
        </div>
      )}

      {/* Two-tone Track */}
      <div
        className="relative w-full rounded-pill bg-white/[0.05] border border-glass-border overflow-hidden p-[1px] flex gap-[2px]"
        style={{ height }}
      >
        {/* Primary Segment */}
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-300",
            variant === "brand-violet" && "bg-gradient-to-r from-brand-500 to-brand-400 shadow-glow-teal",
            variant === "green-red" && "bg-gradient-to-r from-buy to-[#3DDC84]",
            variant === "ward" && "bg-gradient-to-r from-brand-500 via-ward to-sell"
          )}
          style={{ width: `${safeValue}%` }}
        />

        {/* Optional Secondary Segment */}
        {safeSecondary > 0 && (
          <div
            className={cn(
              "h-full rounded-pill transition-all duration-300",
              variant === "brand-violet" && "bg-gradient-to-r from-violet-500 to-violet-400 shadow-glow-violet",
              variant === "green-red" && "bg-sell",
              variant === "ward" && "bg-ward"
            )}
            style={{ width: `${safeSecondary}%` }}
          />
        )}
      </div>
    </div>
  );
}
