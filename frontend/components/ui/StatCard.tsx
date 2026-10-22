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
    <GlassCard
      glowEdge={glowEdge}
      className={cn("group flex flex-col justify-between gap-3 p-5", className)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={icon} variant={iconVariant} />
        <span className="data-label block min-w-0 truncate">{label}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <h3 className="min-w-0 truncate font-display text-[22px] font-semibold leading-none tracking-tight text-text tabular-nums sm:text-[26px]">
          {value}
        </h3>
        {delta !== undefined && <DeltaPill value={delta} className="mb-0.5" />}
      </div>

      {subValue && <p className="font-mono text-[11px] text-text-dim">{subValue}</p>}

      {bottomSlot && <div className="border-t border-glass-border pt-3">{bottomSlot}</div>}
    </GlassCard>
  );
}
