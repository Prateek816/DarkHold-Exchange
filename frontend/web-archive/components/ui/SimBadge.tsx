"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SimBadgeProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Additional tooltip/title */
  title?: string;
  className?: string;
}

/**
 * SimBadge — Ice-blue hatched badge for simulated content.
 * Always includes the diagonal hatch pattern background.
 */
export function SimBadge({ label = "SIM", size = "md", title, className }: SimBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[8px]",
    md: "px-2.5 py-1 text-[9px]",
    lg: "px-3 py-1.5 text-[10px]",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border font-mono font-semibold uppercase tracking-[0.08em]",
        "bg-sim-tint text-sim border-sim/30 sim-hatch",
        sizeClasses,
        className
      )}
      title={title}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-sim animate-ping opacity-40" />
        <span className="relative rounded-full bg-sim" />
      </span>
      <span>{label}</span>
    </span>
  );
}

/** Simulated history shading for charts/candles */
export function SimHatchOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 sim-hatch pointer-events-none",
        className
      )}
      aria-hidden="true"
    />
  );
}

/** "Simulated history" legend badge */
export function SimHistoryLegend({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim",
        className
      )}
    >
      <span className="h-3 w-3 border sim-hatch" />
      <span>Simulated history</span>
    </span>
  );
}

/** "Live from here" divider */
export function LiveFromHereDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-px w-full items-center",
        className
      )}
    >
      <div className="flex-1 border-t border-dashed border-glass-border" />
      <span className="px-3 bg-canvas/80 backdrop-blur-sm font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
        Live from here
      </span>
      <div className="flex-1 border-t border-dashed border-glass-border" />
    </div>
  );
}