"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { IconTile } from "./IconTile";
import { DeltaPill } from "./DeltaPill";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  iconVariant?: "brand" | "mint" | "neutral" | "sell" | "amber";
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subValue?: string;
  bottomSlot?: React.ReactNode;
  glowEdge?: "brand" | "mint" | "sell" | "ward" | "none";
  className?: string;
}

/**
 * StatCard — IconTile top-left, label, big number, tinted delta pill.
 * Optional bottom slot for charts, gauges and progress bars.
 */
export function StatCard({
  icon,
  iconVariant = "mint",
  label,
  value,
  delta,
  deltaLabel,
  subValue,
  bottomSlot,
  glowEdge = "none",
  className,
}: StatCardProps) {
  const trend = delta === undefined ? undefined : delta > 0 ? "up" : delta < 0 ? "down" : "neutral";

  return (
    <GlassCard
      glowEdge={glowEdge}
      enableSpotlight
      className={cn("group flex flex-col justify-between gap-4", className)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={icon} variant={iconVariant} size="sm" />
          <span className="data-label block min-w-0 truncate">{label}</span>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tile border border-glass-border bg-white/[0.03] text-text-dim transition-colors hover:border-glass-border-strong hover:bg-white/[0.08] hover:text-text"
          aria-label={`More options for ${label}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <div className="min-w-0">
          <span className="figure block text-[26px] md:text-[30px] text-text">
            {value}
          </span>
          {subValue && (
            <span className="mt-1 block font-mono text-[11px] text-text-dim">{subValue}</span>
          )}
        </div>
        {delta !== undefined && (
          <DeltaPill value={delta} label={deltaLabel} trend={trend} className="mb-0.5" />
        )}
      </div>

      {bottomSlot && <div className="mt-1 border-t border-glass-border pt-4">{bottomSlot}</div>}
    </GlassCard>
  );
}
