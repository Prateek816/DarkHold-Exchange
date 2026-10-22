"use client";

import React from "react";
import { SettlementStatus, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TheSealProps {
  orderStatus: OrderStatus;
  settlementStatus: SettlementStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

/**
 * THE SEAL: Order lifecycle sigil (Reserved -> Matched -> Settled)
 * - 1/3 lit: Reserved (funds/units locked)
 * - 2/3 lit: Matched, settling ("Matched and final, settlement in progress.")
 * - 3/3 lit: Settled (SettlementCompleted)
 * - Amber/Delayed: Settlement delayed, funds remain reserved.
 */
export function TheSeal({
  orderStatus,
  settlementStatus,
  size = "md",
  className,
  showLabel = false,
}: TheSealProps) {
  // Determine state level
  const isFailed = settlementStatus === "FAILED" || orderStatus === "REJECTED";
  const isSettled = settlementStatus === "COMPLETED" || orderStatus === "FILLED";
  const isMatched =
    orderStatus === "PARTIALLY_FILLED" ||
    (orderStatus === "FILLED" && settlementStatus !== "COMPLETED") ||
    settlementStatus === "PENDING";
  const isReserved =
    orderStatus === "OPEN" || orderStatus === "PENDING_SUBMIT" || isMatched || isSettled;

  let tooltipText = "Funds reserved in vault.";
  let statusText = "Reserved";

  if (isFailed) {
    tooltipText = "Settlement delayed, funds remain reserved.";
    statusText = "Settlement Delayed";
  } else if (isSettled) {
    tooltipText = "Settlement complete. Ledger updated.";
    statusText = "Settled";
  } else if (isMatched) {
    tooltipText = "Matched and final, settlement in progress.";
    statusText = "Matched (Settling)";
  } else if (orderStatus === "CANCELED") {
    tooltipText = "Order canceled. Reserved funds returned.";
    statusText = "Canceled";
  }

  const dimension = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 group relative cursor-help", className)}
      title={tooltipText}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      >
        {/* Outer Ring */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={isFailed ? "#F5B544" : isSettled ? "#22C55E" : "rgba(255,255,255,0.12)"}
          strokeWidth="1.5"
          className="transition-colors duration-300"
        />

        {/* Step 1 Arc: Reserved (0 to 120 deg) */}
        <path
          d="M 12 2 A 10 10 0 0 1 20.66 17"
          stroke={
            isFailed
              ? "#F5B544"
              : isReserved
              ? isSettled
                ? "#22C55E"
                : "#F2F5F7"
              : "rgba(255,255,255,0.1)"
          }
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Step 2 Arc: Matched (120 to 240 deg) */}
        <path
          d="M 20.66 17 A 10 10 0 0 1 3.34 17"
          stroke={
            isFailed
              ? "#F5B544"
              : isMatched || isSettled
              ? isSettled
                ? "#22C55E"
                : "#F2F5F7"
              : "rgba(255,255,255,0.1)"
          }
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Step 3 Arc: Settled (240 to 360 deg) */}
        <path
          d="M 3.34 17 A 10 10 0 0 1 12 2"
          stroke={
            isFailed
              ? "#F5B544"
              : isSettled
              ? "#22C55E"
              : "rgba(255,255,255,0.1)"
          }
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Center Sigil Diamond */}
        <polygon
          points="12,7 17,12 12,17 7,12"
          fill={
            isFailed
              ? "#F5B544"
              : isSettled
              ? "#22C55E"
              : isMatched
              ? "#F2F5F7"
              : "transparent"
          }
          stroke={isFailed ? "#F5B544" : isSettled ? "#22C55E" : "rgba(255,255,255,0.2)"}
          strokeWidth="1"
          className="transition-colors duration-300"
        />
      </svg>

      {showLabel && (
        <span
          className={cn(
            "text-[11px] font-mono tracking-wider uppercase",
            isFailed
              ? "text-warning"
              : isSettled
              ? "text-buy"
              : isMatched
              ? "text-text"
              : "text-text-muted"
          )}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}
