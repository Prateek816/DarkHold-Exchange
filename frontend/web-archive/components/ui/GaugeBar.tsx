"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type GaugeBarVariant = "brand" | "mint" | "ward" | "neutral";

interface GaugeBarProps {
  /** Primary value percentage (0-100) */
  valuePct: number;
  /** Secondary value percentage (0-100) — shown as overlay */
  secondaryPct?: number;
  /** Left label */
  leftLabel: string;
  /** Left value display */
  leftValue: string;
  /** Right label */
  rightLabel: string;
  /** Right value display */
  rightValue: string;
  /** Variant for color scheme */
  variant?: GaugeBarVariant;
  /** Height of the bar */
  height?: number;
  /** Show end dot labels */
  showEndLabels?: boolean;
  className?: string;
}

const variantColors: Record<GaugeBarVariant, { primary: string; secondary: string; track: string }> = {
  brand: {
    primary: "var(--brand-500)",
    secondary: "var(--brand-300)",
    track: "rgba(255,255,255,0.05)",
  },
  mint: {
    primary: "var(--mint-500)",
    secondary: "var(--mint-300)",
    track: "rgba(255,255,255,0.05)",
  },
  ward: {
    primary: "var(--ward)",
    secondary: "var(--ward)",
    track: "rgba(255,255,255,0.05)",
  },
  neutral: {
    primary: "rgba(255,255,255,0.15)",
    secondary: "rgba(255,255,255,0.08)",
    track: "rgba(255,255,255,0.05)",
  },
};

/**
 * GaugeBar — Thin two-tone rounded bar with round end dots and labels at each end.
 * Like the Win Rate bar in ref-violet.
 */
export function GaugeBar({
  valuePct,
  secondaryPct = 0,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  variant = "brand",
  height = 6,
  showEndLabels = true,
  className,
}: GaugeBarProps) {
  const colors = variantColors[variant];
  const clampedPrimary = Math.max(0, Math.min(100, valuePct));
  const clampedSecondary = Math.max(0, Math.min(100, secondaryPct));

  return (
    <div className={cn("w-full", className)}>
      {/* Labels above */}
      {showEndLabels && (
        <div className="flex justify-between mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            {leftLabel}
          </span>
          <span className="flex items-center gap-1">
            {rightLabel}
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.secondary }} />
          </span>
        </div>
      )}

      {/* Bar track */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{ height, backgroundColor: colors.track }}
        role="img"
        aria-label={`${leftLabel}: ${leftValue}, ${rightLabel}: ${rightValue}`}
      >
        {/* Secondary fill (behind) */}
        {secondaryPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${clampedSecondary}%`,
              backgroundColor: colors.secondary,
              opacity: 0.5,
            }}
          />
        )}

        {/* Primary fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-smooth"
          style={{
            width: `${clampedPrimary}%`,
            backgroundColor: colors.primary,
          }}
        />

        {/* End dots */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full" style={{ backgroundColor: colors.primary }} />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-4 w-4 rounded-full" style={{ backgroundColor: colors.secondary }} />
      </div>

      {/* Value labels below */}
      {showEndLabels && (
        <div className="flex justify-between mt-2 font-mono text-[11px] tabular-nums text-text">
          <span>{leftValue}</span>
          <span>{rightValue}</span>
        </div>
      )}
    </div>
  );
}

/** Compact VaultBar for header */
interface VaultBarCompactProps {
  available: number;
  reserved: number;
  total: number;
  formatValue: (val: number) => string;
  className?: string;
}

export function VaultBarCompact({ available, reserved, total, formatValue, className }: VaultBarCompactProps) {
  const availablePct = total > 0 ? (available / total) * 100 : 0;
  const reservedPct = total > 0 ? (reserved / total) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-3 w-[220px] max-w-[280px]", className)}>
      <GaugeBar
        valuePct={availablePct}
        secondaryPct={reservedPct}
        leftLabel="Available"
        leftValue={formatValue(available)}
        rightLabel="Reserved"
        rightValue={formatValue(reserved)}
        variant="mint"
        height={5}
        showEndLabels={false}
      />
    </div>
  );
}