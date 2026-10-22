"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface TheWardProps {
  ceilingPrice: number;
  faceValue: number;
  ceilingPct: number;
  currentInputPrice?: number;
  isTriggered?: boolean;
  className?: string;
  variant?: "inline" | "badge" | "banner";
}

/**
 * THE WARD — anti-scalping ceiling visualization.
 * Amber at rest, rose + shake when an input attempts to breach the cap.
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
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono transition-all duration-200",
          isBreached
            ? "border-sell/45 bg-sell/10 text-sell-text animate-ward-shake"
            : "border-warning/30 bg-warning/10 text-warning",
          className
        )}
        title={`Resale cap is ${ceilingPct}% of face value. Orders above it are rejected.`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning shadow-[0_0_6px_#F5B544]" />
        <span className="font-medium">Cap {formattedCeiling}</span>
      </div>
    );
  }

  if (variant === "banner" || isBreached) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-panel border border-sell/40 bg-sell/[0.09] p-3 text-xs text-text animate-ward-shake shadow-[0_0_20px_rgba(240,80,110,0.16)]",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sell" />
        <div className="space-y-0.5">
          <p className="font-display text-[12px] font-semibold text-sell-text">
            The Ward Activated — price exceeds ceiling
          </p>
          <p className="font-sans text-[11px] leading-relaxed text-text-muted">
            Resale cap is <strong className="font-mono text-text">{formattedCeiling}</strong> (
            {ceilingPct}% of face value {formattedFace}). Lower your price to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-dashed border-warning/25 py-1.5 font-mono text-xs text-text-muted",
        className
      )}
      title={`Resale cap is ${ceilingPct}% of face value (${formattedFace}). Orders above it are rejected.`}
    >
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-2 bg-warning shadow-[0_0_4px_#F5B544]" />
        <span className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Ward Ceiling</span>
      </span>
      <span className="font-semibold tabular-nums text-warning">{formattedCeiling}</span>
    </div>
  );
}
