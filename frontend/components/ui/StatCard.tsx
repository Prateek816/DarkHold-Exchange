"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { IconTile } from "./IconTile";
import { DeltaPill } from "./DeltaPill";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  iconVariant?: "teal" | "violet" | "neutral" | "sell" | "amber";
  label: string;
  value: string | number;
  delta?: number;
  subValue?: string;
  bottomSlot?: React.ReactNode;
  glowEdge?: "teal" | "sell" | "violet" | "none";
  className?: string;
}

export function StatCard({
  icon,
  iconVariant = "teal",
  label,
  value,
  delta,
  subValue,
  bottomSlot,
  glowEdge = "none",
  className,
}: StatCardProps) {
  return (
    <GlassCard glowEdge={glowEdge} className={cn("p-5 flex flex-col justify-between space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon={icon} variant={iconVariant} />
          <div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium block">
              {label}
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <h3 className="text-2xl sm:text-3xl font-semibold text-text tabular-nums tracking-tight">
                {value}
              </h3>
            </div>
          </div>
        </div>

        {delta !== undefined && <DeltaPill value={delta} />}
      </div>

      {subValue && (
        <p className="text-xs text-text-dim font-mono">{subValue}</p>
      )}

      {bottomSlot && <div className="pt-2 border-t border-glass-border">{bottomSlot}</div>}
    </GlassCard>
  );
}
