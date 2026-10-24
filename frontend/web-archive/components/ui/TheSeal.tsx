"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "PENDING_SUBMIT"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED";

export type SettlementStatus = "PENDING" | "COMPLETED" | "FAILED";

interface TheSealProps {
  orderStatus: OrderStatus;
  settlementStatus: SettlementStatus;
  /** Show text label */
  showLabel?: boolean;
  /** Compact size */
  compact?: boolean;
  className?: string;
}

/**
 * TheSeal — Sigil per order/trade that fills in 3 steps:
 * Reserved → Matched → Settled.
 * "Matched, settling" = half-filled with tooltip.
 * Completes only on SettlementCompleted.
 * Failed = amber.
 */
export function TheSeal({
  orderStatus,
  settlementStatus,
  showLabel = false,
  compact = false,
  className,
}: TheSealProps) {
  // Determine fill state
  const isTerminal = ["FILLED", "CANCELED", "REJECTED"].includes(orderStatus);
  const isMatched = ["PARTIALLY_FILLED", "FILLED"].includes(orderStatus);
  const isSettled = settlementStatus === "COMPLETED";
  const isSettling = settlementStatus === "PENDING" && isMatched;
  const isFailed = settlementStatus === "FAILED";

  // Fill stages: 0 = reserved, 1 = matched, 2 = settled
  let fillStage = 0;
  if (isMatched) fillStage = 1;
  if (isSettled) fillStage = 2;

  const size = compact ? 28 : 36;
  const strokeWidth = compact ? 2 : 2.5;

  // Colors per stage
  const stageColors = {
    0: "var(--brand-500)",     // Reserved - violet
    1: "var(--warning)",       // Matched - amber
    2: "var(--buy-solid)",     // Settled - mint
    failed: "var(--sell-solid)", // Failed - rose
  };

  const currentColor = isFailed ? stageColors.failed : stageColors[fillStage as keyof typeof stageColors];

  const labelMap: Record<OrderStatus, string> = {
    PENDING_SUBMIT: "Reserved",
    OPEN: "Reserved",
    PARTIALLY_FILLED: "Matched",
    FILLED: "Settled",
    CANCELED: "Canceled",
    REJECTED: "Rejected",
  };

  const settlementLabelMap: Record<SettlementStatus, string> = {
    PENDING: isMatched ? "Matched, settling" : "Reserved",
    COMPLETED: "Settled",
    FAILED: "Settlement failed",
  };

  const label = showLabel ? (isFailed ? "Settlement failed" : settlementLabelMap[settlementStatus]) : "";

  const tooltip = isSettling
    ? "Matched and final, settlement in progress."
    : isFailed
    ? "Settlement delayed, funds remain reserved."
    : isSettled
    ? "Fully settled on ledger."
    : isMatched
    ? "Matched, awaiting settlement."
    : "Funds/units reserved.";

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-1.5", className)}
      title={tooltip}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="relative"
        role="img"
        aria-label={tooltip}
      >
        <defs>
          <filter id="seal-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Stage 1: Reserved (violet) - always shown when order exists */}
        {fillStage >= 0 && (
          <path
            d="M18 3 a15 15 0 0 1 0 30 a15 15 0 0 1 0 -30"
            fill="none"
            stroke={stageColors[0]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="94.25"
            strokeDashoffset={fillStage >= 0 ? 0 : 94.25}
            filter="url(#seal-glow)"
            style={{ transition: "stroke-dashoffset 400ms var(--ease-smooth)" }}
          />
        )}

        {/* Stage 2: Matched (amber) - half circle from top to bottom */}
        {fillStage >= 1 && (
          <path
            d="M18 3 a15 15 0 0 1 0 30"
            fill="none"
            stroke={stageColors[1]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="47.12 94.25"
            strokeDashoffset={fillStage >= 1 ? 0 : 47.12}
            filter="url(#seal-glow)"
            style={{ transition: "stroke-dashoffset 400ms var(--ease-smooth) 150ms" }}
          />
        )}

        {/* Stage 3: Settled (mint) - full circle completion */}
        {fillStage >= 2 && (
          <path
            d="M18 33 a15 15 0 0 1 0 -30"
            fill="none"
            stroke={stageColors[2]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="47.12 94.25"
            strokeDashoffset={fillStage >= 2 ? 0 : 47.12}
            filter="url(#seal-glow)"
            style={{ transition: "stroke-dashoffset 400ms var(--ease-smooth) 300ms" }}
          />
        )}

        {/* Failed state - red X */}
        {isFailed && (
          <g stroke={stageColors.failed} strokeWidth={strokeWidth + 0.5} strokeLinecap="round">
            <line x1="12" y1="12" x2="24" y2="24" filter="url(#seal-glow)" />
            <line x1="24" y1="12" x2="12" y2="24" filter="url(#seal-glow)" />
          </g>
        )}

        {/* Center dot */}
        <circle
          cx="18"
          cy="18"
          r={compact ? 2.5 : 3}
          fill={currentColor}
          filter="url(#seal-glow)"
        />
      </svg>

      {showLabel && (
        <span className={cn("font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim", compact && "text-[8px]")}>
          {label}
        </span>
      )}
    </div>
  );
}