"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TheWardProps {
  ceilingPrice: number;
  faceValue: number;
  ceilingPct: number;
  currentInputPrice?: number;
  isTriggered?: boolean;
  className?: string;
  variant?: "inline" | "badge" | "banner" | "chart-line";
}

/**
 * TheWard — Anti-scalping ceiling indicator.
 * Flat ink, brass rule, vermilion on breach.
 * Variants: inline (chart), badge (form), banner (alert), chart-line (candle chart)
 */
export function TheWard({
  ceilingPrice,
  faceValue,
  ceilingPct,
  currentInputPrice,
  isTriggered = false,
  className,
  variant = "inline",
}: TheWardProps) {
  const isBreached =
    isTriggered || (currentInputPrice !== undefined && currentInputPrice > ceilingPrice);

  const formattedCeiling = formatCurrency(ceilingPrice);
  const formattedFace = formatCurrency(faceValue);

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em]",
          isBreached
            ? "border-sell/50 bg-sell-tint text-sell"
            : "border-ward/35 bg-ward-tint text-ward",
          className
        )}
        title={`Resale cap is ${ceilingPct}% of face value. Orders above it are rejected.`}
      >
        <span className="h-1.5 w-1.5 shrink-0 bg-current" />
        Cap {formattedCeiling}
      </span>
    );
  }

  if (variant === "banner" || isBreached) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-panel border p-3 text-xs text-text",
          isBreached
            ? "border-sell/40 bg-sell-tint"
            : "border-ward/35 bg-ward-tint",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <ShieldAlert className={cn("mt-0.5 h-4 w-4 shrink-0", isBreached ? "text-sell" : "text-ward")} />
        <div className="space-y-0.5">
          <p className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.08em]", isBreached ? "text-sell" : "text-ward")}>
            {isBreached ? "Above the resale cap" : "Resale ceiling"}
          </p>
          <p className="text-[11px] leading-relaxed text-text-muted">
            The ceiling is{" "}
            <strong className="font-mono text-text">{formattedCeiling}</strong> — {ceilingPct}% of
            the {formattedFace} face value.
            {isBreached ? " Lower the price to continue." : ""}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "chart-line") {
    // Returns SVG line component for candle chart
    return null; // Used via PriceLine in CandleChart
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-panel border-t border-dashed border-ward/25 py-1.5 font-mono text-xs text-text-muted",
        className
      )}
      title={`Resale cap is ${ceilingPct}% of face value (${formattedFace}). Orders above it are rejected.`}
    >
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-2 bg-ward" />
        <span className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Ward ceiling</span>
      </span>
      <span className="font-semibold tabular-nums text-ward">{formattedCeiling}</span>
    </div>
  );
}