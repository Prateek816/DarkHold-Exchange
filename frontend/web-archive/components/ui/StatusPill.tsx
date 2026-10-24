"use client";

import React from "react";
import { Check, X, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "PENDING_SUBMIT"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED";

export type SettlementStatus = "PENDING" | "COMPLETED" | "FAILED";

export type StatusPillType =
  | "SETTLED"
  | "MATCHED_SETTLING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "CANCELED"
  | "REJECTED"
  | "SIM"
  | "LIVE"
  | "SUCCESS";

interface StatusPillProps {
  status: StatusPillType;
  /** Custom label override */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Compact variant */
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<StatusPillType, { label: string; className: string; icon: React.ReactNode }> = {
  SETTLED: {
    label: "Settled",
    className: "bg-buy-tint text-buy border-buy/30",
    icon: <Check className="h-3 w-3" />,
  },
  MATCHED_SETTLING: {
    label: "Matched, settling",
    className: "bg-warning-tint text-warning border-warning/30",
    icon: <Clock className="h-3 w-3 animate-pulse" />,
  },
  OPEN: {
    label: "Open",
    className: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  PARTIALLY_FILLED: {
    label: "Partially filled",
    className: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  CANCELED: {
    label: "Canceled",
    className: "bg-white/[0.03] text-text-muted border-glass-border",
    icon: <X className="h-3 w-3" />,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-sell-tint text-sell border-sell/30",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  SIM: {
    label: "SIM",
    className: "bg-sim-tint text-sim border-sim/30",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" strokeDasharray="4 4" />
        <path d="M2 12h20" strokeDasharray="4 4" />
      </svg>
    ),
  },
  LIVE: {
    label: "Live",
    className: "bg-buy-tint text-buy border-buy/30",
    icon: (
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-buy animate-ping opacity-60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-buy" />
      </span>
    ),
  },
  SUCCESS: {
    label: "Success",
    className: "bg-buy-tint text-buy border-buy/30",
    icon: <Check className="h-3 w-3" />,
  },
};

/**
 * StatusPill — Semantic status indicators with consistent styling.
 * Spec text is locked per status type.
 */
export function StatusPill({
  status,
  label,
  showIcon = true,
  compact = false,
  className,
}: StatusPillProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono font-medium tabular-nums",
        compact ? "text-[9.5px]" : "text-[10.5px]",
        config.className,
        className
      )}
    >
      {showIcon && <span className="flex-shrink-0">{config.icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
}

/** Convenience: order status pill with settlement sub-status */
interface OrderStatusPillProps {
  orderStatus: OrderStatus;
  settlementStatus?: SettlementStatus;
  isSim?: boolean;
  compact?: boolean;
  className?: string;
}

export function OrderStatusPill({
  orderStatus,
  settlementStatus,
  isSim,
  compact = false,
  className,
}: OrderStatusPillProps) {
  // Settlement takes precedence for display
  if (settlementStatus === "COMPLETED") {
    return <StatusPill status="SETTLED" compact={compact} className={className} />;
  }
  if (settlementStatus === "FAILED") {
    return (
      <StatusPill
        status="REJECTED"
        label="Settlement failed"
        compact={compact}
        className={className}
      />
    );
  }
  if (settlementStatus === "PENDING") {
    return <StatusPill status="MATCHED_SETTLING" compact={compact} className={className} />;
  }

  // Order status mapping
  const statusMap: Record<OrderStatus, StatusPillType> = {
    PENDING_SUBMIT: "OPEN",
    OPEN: "OPEN",
    PARTIALLY_FILLED: "PARTIALLY_FILLED",
    FILLED: "SETTLED",
    CANCELED: "CANCELED",
    REJECTED: "REJECTED",
  };

  return (
    <>
      <StatusPill status={statusMap[orderStatus]} compact={compact} className={className} />
      {isSim && <StatusPill status="SIM" compact={compact} className="ml-1" />}
    </>
  );
}