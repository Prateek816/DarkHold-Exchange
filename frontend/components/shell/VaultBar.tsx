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

  const formatFn = isCurrency ? formatCurrency : (val: number) => `${formatQuantity(val)} units`;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 px-3 py-1.5 rounded-pill bg-white/[0.035] border border-glass-border text-xs min-w-[210px] backdrop-blur-md shadow-glass-sm",
          className
        )}
        title={`Vault Balance: ${formatFn(available)} available, ${formatFn(reserved)} reserved in orders`}
      >
        <div className="flex items-center justify-between font-mono text-[11px] leading-tight">
          <span className="flex items-center gap-1.5 text-text font-bold">
            <Unlock className="w-3 h-3 text-brand-400" />
            <span className="tabular-nums">{formatFn(available)}</span>
            <span className="text-text-dim text-[10px]">avail</span>
          </span>
          {reserved > 0 && (
            <span className="flex items-center gap-1.5 text-warning font-semibold">
              <Lock className="w-3 h-3" />
              <span className="tabular-nums">{formatFn(reserved)}</span>
              <span className="text-text-dim text-[10px]">res</span>
            </span>
          )}
        </div>

        {/* Dual-tone Progress Bar */}
        <div className="w-full h-1.5 bg-white/[0.06] rounded-pill overflow-hidden flex p-[1px] gap-[1px]">
          <div
            className="h-full bg-brand-400 rounded-pill transition-all duration-300 shadow-glow-teal"
            style={{ width: `${availablePct}%` }}
          />
          <div
            className="h-full bg-warning rounded-pill transition-all duration-300 shadow-glow-ward"
            style={{ width: `${reservedPct}%` }}
          />
        </div>
      </div>
    );
  }

  // Large format for Portfolio
  return (
    <GlassCard glowEdge="teal" className={cn("p-6 space-y-5 font-mono", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          {label && (
            <p className="text-xs uppercase tracking-widest text-text-dim font-medium">
              {label}
            </p>
          )}
          <h3 className="text-3xl sm:text-4xl font-semibold text-text tabular-nums tracking-tight">
            {formatFn(total || available + reserved)}
          </h3>
        </div>

        {/* Detail pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/[0.035] border border-glass-border">
            <Unlock className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-text-muted">Available:</span>
            <span className="text-text font-bold tabular-nums">{formatFn(available)}</span>
            <span className="text-text-dim">({availablePct.toFixed(1)}%)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/[0.035] border border-glass-border">
            <Lock className="w-3.5 h-3.5 text-warning" />
            <span className="text-text-muted">Reserved:</span>
            <span className="text-warning font-bold tabular-nums">{formatFn(reserved)}</span>
            <span className="text-text-dim">({reservedPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Two-tone Bar with Round End Caps */}
      <div className="space-y-2">
        <div className="w-full h-3 rounded-pill bg-white/[0.05] border border-glass-border overflow-hidden p-[1px] flex gap-[2px]">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500 shadow-glow-teal"
            style={{ width: `${availablePct}%` }}
            title={`Available: ${formatFn(available)}`}
          />
          <div
            className="h-full rounded-pill bg-gradient-to-r from-warning to-ward transition-all duration-500 shadow-glow-ward"
            style={{ width: `${reservedPct}%` }}
            title={`Reserved: ${formatFn(reserved)}`}
          />
        </div>

        <div className="flex justify-between text-[11px] text-text-dim">
          <span>0%</span>
          <span>Settlement Pipeline Truth: Funds locked until order completion or cancellation</span>
          <span>100%</span>
        </div>
      </div>
    </GlassCard>
  );
}
