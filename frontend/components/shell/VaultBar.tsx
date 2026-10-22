"use client";

import React from "react";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { Lock, Unlock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultBarProps {
  available: number;
  reserved: number;
  total: number;
  isCurrency?: boolean;
  variant?: "compact" | "large";
  className?: string;
  label?: string;
}

export function VaultBar({
  available,
  reserved,
  total,
  isCurrency = true,
  variant = "compact",
  className,
  label,
}: VaultBarProps) {
  const safeTotal = total > 0 ? total : available + reserved || 1;
  const availablePct = Math.min(100, Math.max(0, (available / safeTotal) * 100));
  const reservedPct = Math.min(100, Math.max(0, (reserved / safeTotal) * 100));

  const formatFn = isCurrency
    ? formatCurrency
    : (val: number) => `${formatQuantity(val)} units`;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex min-w-[210px] flex-col gap-1.5 rounded-full border border-glass-border bg-white/[0.035] px-3.5 py-1.5 text-xs shadow-glass-sm backdrop-blur-md",
          className
        )}
        title={`Vault Balance: ${formatFn(available)} available, ${formatFn(reserved)} reserved in orders`}
      >
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] leading-tight">
          <span className="flex items-center gap-1.5 font-semibold text-text">
            <Unlock className="h-3 w-3 text-brand-400" />
            <span className="tabular-nums">{formatFn(available)}</span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-text-dim">avail</span>
          </span>
          {reserved > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-warning">
              <Lock className="h-3 w-3" />
              <span className="tabular-nums">{formatFn(reserved)}</span>
              <span className="text-[9px] uppercase tracking-[0.12em] text-text-dim">res</span>
            </span>
          )}
        </div>

        <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-white/[0.06] p-px">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 shadow-glow-teal transition-all duration-300"
            style={{ width: `${availablePct}%` }}
          />
          <div
            className="h-full rounded-full bg-warning shadow-glow-ward transition-all duration-300"
            style={{ width: `${reservedPct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <GlassCard glowEdge="teal" className={cn("space-y-5 p-6", className)}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <span className="eyebrow flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-brand-400" />
            {label || "Vault Balance"}
          </span>
          <h3 className="font-display text-[32px] font-semibold leading-none tracking-tight text-text tabular-nums sm:text-[38px]">
            {formatFn(total || available + reserved)}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-glass-border bg-white/[0.03] px-3 py-1.5">
            <Unlock className="h-3.5 w-3.5 text-brand-400" />
            <span className="text-[11px] text-text-muted">Available</span>
            <span className="font-mono text-[12px] font-semibold text-text tabular-nums">
              {formatFn(available)}
            </span>
            <span className="font-mono text-[10px] text-text-dim">
              {availablePct.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-glass-border bg-white/[0.03] px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-warning" />
            <span className="text-[11px] text-text-muted">Reserved</span>
            <span className="font-mono text-[12px] font-semibold text-warning tabular-nums">
              {formatFn(reserved)}
            </span>
            <span className="font-mono text-[10px] text-text-dim">
              {reservedPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full border border-glass-border bg-white/[0.05] p-[2px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 shadow-glow-teal transition-all duration-500"
            style={{ width: `${availablePct}%` }}
            title={`Available: ${formatFn(available)}`}
          />
          <div
            className="h-full rounded-full bg-gradient-to-r from-warning to-ward shadow-glow-ward transition-all duration-500"
            style={{ width: `${reservedPct}%` }}
            title={`Reserved: ${formatFn(reserved)}`}
          />
        </div>

        <div className="flex items-center justify-between gap-3 font-mono text-[10px] text-text-dim">
          <span>0%</span>
          <span className="hidden text-center sm:block">
            Funds stay locked until settlement completes or the order is canceled
          </span>
          <span>100%</span>
        </div>
      </div>
    </GlassCard>
  );
}
