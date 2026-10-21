"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateType =
  | "NO_ASSETS"
  | "NO_SELLERS"
  | "NO_BUYERS"
  | "NO_HOLDINGS"
  | "NO_AUCTIONS"
  | "NO_TRADES"
  | "NO_ORDERS";

interface LineArtEmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function LineArtEmptyState({
  type,
  title,
  description,
  action,
  className,
}: LineArtEmptyStateProps) {
  let defaultTitle = "";
  let defaultDesc = "";

  switch (type) {
    case "NO_ASSETS":
      defaultTitle = "No Assets Listed";
      defaultDesc = "No festival passes or artifacts are currently open for trading.";
      break;
    case "NO_SELLERS":
      defaultTitle = "No Sellers on the Book";
      defaultDesc = "The ask ladder is empty. Place a limit bid to establish liquidity.";
      break;
    case "NO_BUYERS":
      defaultTitle = "No Buyers on the Book";
      defaultDesc = "The bid ladder is empty. Be the first to place an offer.";
      break;
    case "NO_HOLDINGS":
      defaultTitle = "Vault Inventory Empty";
      defaultDesc = "You do not own any passes or relics yet. Purchase units on the exchange.";
      break;
    case "NO_AUCTIONS":
      defaultTitle = "No Active Dutch Auctions";
      defaultDesc = "All descending price drops have concluded. Check back soon.";
      break;
    case "NO_TRADES":
      defaultTitle = "No Recent Trades";
      defaultDesc = "The matching engine has not executed any matches in the last 3 minutes.";
      break;
    case "NO_ORDERS":
      defaultTitle = "No Open Orders";
      defaultDesc = "You have no resting orders locking funds in the vault.";
      break;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-3 font-sans",
        className
      )}
    >
      {/* Delicate Line-Art SVG Illustration */}
      <div className="w-16 h-16 rounded-20 border border-white/8 bg-white/[0.03] backdrop-blur-[12px] flex items-center justify-center p-3 text-text-muted shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)]">
        {type === "NO_SELLERS" || type === "NO_BUYERS" ? (
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full stroke-current stroke-[1.5]">
            <rect x="8" y="10" width="32" height="28" rx="2" strokeDasharray="3 3" />
            <line x1="14" y1="20" x2="34" y2="20" />
            <line x1="14" y1="28" x2="26" y2="28" />
            <circle cx="34" cy="28" r="2" fill="#19CBB0" />
          </svg>
        ) : type === "NO_HOLDINGS" ? (
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full stroke-current stroke-[1.5]">
            <polygon points="24,6 40,16 40,32 24,42 8,32 8,16" strokeDasharray="2 2" />
            <circle cx="24" cy="24" r="5" stroke="#F2F5F7" />
            <line x1="24" y1="19" x2="24" y2="29" stroke="#19CBB0" />
          </svg>
        ) : type === "NO_AUCTIONS" ? (
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full stroke-current stroke-[1.5]">
            <path d="M14 8 L34 8 L24 24 L34 40 L14 40 L24 24 Z" stroke="rgba(255,255,255,0.4)" />
            <circle cx="24" cy="34" r="2" fill="#19CBB0" />
          </svg>
        ) : (
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full stroke-current stroke-[1.5]">
            <circle cx="24" cy="24" r="16" stroke="rgba(255,255,255,0.15)" />
            <line x1="16" y1="24" x2="32" y2="24" stroke="#F2F5F7" />
            <line x1="24" y1="16" x2="24" y2="32" stroke="#19CBB0" />
          </svg>
        )}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
          {title || defaultTitle}
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          {description || defaultDesc}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
