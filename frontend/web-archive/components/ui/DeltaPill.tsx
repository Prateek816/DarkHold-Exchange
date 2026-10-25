"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DeltaPillProps {
  value: number;
  /** Label suffix (e.g., "24h", "7d") */
  label?: string;
  /** Override trend detection */
  trend?: "up" | "down" | "neutral";
  /** Compact variant for tight spaces */
  compact?: boolean;
  className?: string;
}

/**
 * DeltaPill — Tinted pill with arrow indicating direction.
 * Positive = mint, Negative = rose, Neutral = amber
 */
export function DeltaPill({
  value,
  label,
  trend,
  compact = false,
  className,
}: DeltaPillProps) {
  const detectedTrend = trend ?? (value > 0 ? "up" : value < 0 ? "down" : "neutral");
  const absValue = Math.abs(value).toFixed(1);

  const colors = {
    up: "bg-buy-tint text-buy border-buy/30",
    down: "bg-sell-tint text-sell border-sell/30",
    neutral: "bg-warning-tint text-warning border-warning/30",
  }[detectedTrend];

  const icons = {
    up: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    ),
    down: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    ),
    neutral: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono tabular-nums",
        compact ? "text-[10px]" : "text-[11px]",
        colors,
        className
      )}
    >
      {icons[detectedTrend]}
      <span>{absValue}%</span>
      {label && <span className="text-text-dim ml-0.5">{label}</span>}
    </span>
  );
}