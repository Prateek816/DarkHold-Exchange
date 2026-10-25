"use client";

import React from "react";
import { SettlementStatus, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TheSealProps {
  orderStatus: OrderStatus | string;
  settlementStatus?: SettlementStatus | string;
  matchedQty?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

/**
 * THE SEAL: Order lifecycle sigil (Reserved -> Matched -> Settled)
 * - 1/3 lit: Reserved (funds/units locked, waiting for match)
 * - 2/3 lit: Matched, settling ("Matched and final, settlement in progress.")
 * - 3/3 lit: Settled (SettlementCompleted)
 * - Amber/Delayed: Settlement delayed, funds remain reserved.
 */
export function TheSeal({
  orderStatus,
  settlementStatus,
  matchedQty = 0,
  size = "md",
  className,
  showLabel = false,
}: TheSealProps) {
  // Normalize casing & values
  const normStatus = (orderStatus || "").toUpperCase().trim();
  const normSettlement = (settlementStatus || "").toUpperCase().trim();
  const matched = typeof matchedQty === "number" ? matchedQty : 0;

  const isRejected = normStatus === "REJECTED";
  const isCanceled = normStatus === "CANCELED";
  const isFailed = normSettlement === "FAILED";
  const isSettled = normSettlement === "COMPLETED";

  // MATCHED (SETTLING) is displayed ONLY when backend data confirms a matched quantity > 0 and settlement is in progress
  const isMatched =
    matched > 0 &&
    !isSettled &&
    !isFailed &&
    !isRejected &&
    !isCanceled;

  const isFilled = normStatus === "FILLED";
  const isOpen = (normStatus === "OPEN" || normStatus === "PENDING_SUBMIT") && matched === 0;
  const isReserved = isOpen || isMatched || isSettled || isFilled;

  let tooltipText = "Funds reserved in vault.";
  let statusText = "OPEN / WAITING FOR MATCH";

  if (isRejected) {
    tooltipText = "Order rejected. Check the order and wallet ledger for reservation release.";
    statusText = "REJECTED";
  } else if (isCanceled) {
    tooltipText = "Order canceled. Reserved funds returned.";
    statusText = "CANCELED";
  } else if (isFailed) {
    tooltipText = "Settlement failed. Check the settlement record and ledger.";
    statusText = "SETTLEMENT FAILED";
  } else if (isSettled) {
    tooltipText = "Settlement complete. Ledger updated.";
    statusText = isFilled ? "FILLED" : "SETTLED";
  } else if (isFilled) {
    tooltipText = "Order completely filled. Settlement in progress.";
    statusText = "FILLED";
  } else if (isMatched) {
    tooltipText = "Matched and final, settlement in progress.";
    statusText = "MATCHED (SETTLING)";
  } else if (isOpen) {
    tooltipText = "Order resting in book. Waiting for matching.";
    statusText = "OPEN / WAITING FOR MATCH";
  } else {
    statusText = normStatus || "OPEN / WAITING FOR MATCH";
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
          stroke={isFailed ? "#F5B544" : isRejected ? "#EF4444" : isSettled ? "#22C55E" : "rgba(255,255,255,0.12)"}
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
              : isRejected
              ? "text-sell-text"
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
