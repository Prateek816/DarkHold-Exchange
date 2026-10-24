"use client";

import React from "react";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { Lock, Shield, Unlock } from "lucide-react";
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
    : (value: number) => `${formatQuantity(value)} units`;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex min-w-[190px] flex-col gap-1.5 border border-glass-border bg-canvas-elevated px-3 py-1.5",
          className
        )}
        title={`Reservation balance: ${formatFn(available)} available, ${formatFn(
          reserved
        )} reserved in orders`}
      >
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] leading-tight">
          <span className="flex items-center gap-1.5 text-text">
            <Unlock className="h-2.5 w-2.5 text-buy" />
            <span className="tabular-nums">{formatFn(available)}</span>
            <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim">avail</span>
          </span>
          {reserved > 0 && (
            <span className="flex items-center gap-1.5 text-warning">
              <Lock className="h-2.5 w-2.5" />
              <span className="tabular-nums">{formatFn(reserved)}</span>
              <span className="text-[8px] uppercase tracking-[0.1em] text-text-dim">res</span>
            </span>
          )}
        </div>
        <div className="flex h-1 w-full gap-px bg-white/[0.07]">
          <div className="h-full bg-buy" style={{ width: `${availablePct}%` }} />
          <div className="h-full bg-warning" style={{ width: `${reservedPct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <section className={cn("border border-glass-border bg-surface p-5 sm:p-6", className)}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="keyline">
            <Shield className="h-3 w-3 text-brand-300" />
            {label || "Credit reservations"}
          </p>
          <p className="pt-2.5 figure text-[30px] text-text sm:text-[36px]">
            {formatFn(total || available + reserved)}
          </p>
          <p className="pt-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
            Total ledger credits · mock wallet
          </p>
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-[9px]">
          <div className="flex items-center gap-2 border border-glass-border bg-canvas-elevated px-2.5 py-1.5">
            <Unlock className="h-3 w-3 text-buy" />
            <span className="uppercase tracking-[0.08em] text-text-dim">Available</span>
            <span className="tabular-nums text-text">{formatFn(available)}</span>
            <span className="text-text-dim">{availablePct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 border border-glass-border bg-canvas-elevated px-2.5 py-1.5">
            <Lock className="h-3 w-3 text-warning" />
            <span className="uppercase tracking-[0.08em] text-text-dim">Reserved</span>
            <span className="tabular-nums text-warning">{formatFn(reserved)}</span>
            <span className="text-text-dim">{reservedPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex h-2 w-full gap-px border border-glass-border bg-canvas p-px">
          <div
            className="h-full bg-buy"
            style={{ width: `${availablePct}%` }}
            title={`Available: ${formatFn(available)}`}
          />
          <div
            className="h-full bg-warning"
            style={{ width: `${reservedPct}%` }}
            title={`Reserved: ${formatFn(reserved)}`}
          />
        </div>
        <div className="flex items-center justify-between gap-3 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
          <span>Available {availablePct.toFixed(1)}%</span>
          <span className="hidden text-center sm:block">
            Reserved credits stay held until cancellation or settlement
          </span>
          <span>Reserved {reservedPct.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}
