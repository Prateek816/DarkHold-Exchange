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
 * THE WARD: Price Ceiling Protection Component
 * Visualizes the anti-scalping price ceiling tied to face value.
 * Triggers ward shake animation when input price attempts to breach ceiling.
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
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border transition-all duration-200",
          isBreached
            ? "border-sell text-sell bg-sell-tint animate-ward-shake shadow-[0_0_12px_rgba(240,80,110,0.3)]"
            : "border-warning/30 text-warning bg-warning/10 hover:border-warning/50",
          className
        )}
        title={`Resale cap is ${ceilingPct}% of face value. Orders above it are rejected.`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 shadow-[0_0_6px_#F5B544]" />
        <span>Cap: {formattedCeiling}</span>
      </div>
    );
  }

  if (variant === "banner" || isBreached) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 p-3 rounded-14 bg-sell-tint border border-sell/40 text-xs text-text animate-ward-shake shadow-[0_0_18px_rgba(240,80,110,0.2)]",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <ShieldAlert className="w-4 h-4 text-sell shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-sell">The Ward Activated — Price Exceeds Ceiling</p>
          <p className="text-text-muted font-sans text-[11px]">
            Resale cap is <strong className="text-white font-mono">{formattedCeiling}</strong> ({ceilingPct}%
            of face value {formattedFace}). Lower your price to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs font-mono text-text-muted py-1.5 border-t border-dashed border-warning/30",
        className
      )}
      title={`Resale cap is ${ceilingPct}% of face value (${formattedFace}). Orders above it are rejected.`}
    >
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-0.5 bg-warning inline-block shadow-[0_0_4px_#F5B544]" />
        <span className="text-[10px] uppercase tracking-wider text-text-dim">Ward Ceiling</span>
      </span>
      <span className="text-warning font-semibold tabular-nums">{formattedCeiling}</span>
    </div>
  );
}
