"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "no-sellers"
  | "no-buyers"
  | "no-holdings"
  | "no-auctions"
  | "no-trades"
  | "thin-market"
  | "asset-halted"
  | "disconnected";

interface LineArtEmptyStateProps {
  variant: EmptyStateVariant;
  /** Custom message override */
  message?: string;
  /** Custom action */
  action?: React.ReactNode;
  className?: string;
}

const illustrations: Record<EmptyStateVariant, { title: string; defaultMessage: string; svg: React.ReactNode }> = {
  "no-sellers": {
    title: "No sellers",
    defaultMessage: "No one is offering this asset right now. Limit buys will rest until a seller appears.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-text-dim opacity-60">
        <path d="M60 20a25 25 0 1 0 0 50 25 25 0 0 0 0-50z" />
        <path d="M60 45v25" strokeDasharray="4 4" />
        <path d="M45 60h30" strokeDasharray="4 4" />
        <circle cx="60" cy="70" r="8" fill="currentColor" opacity="0.3" />
        <path d="M60 78v12" />
        <path d="M54 84h12" />
      </svg>
    ),
  },
  "no-buyers": {
    title: "No buyers",
    defaultMessage: "No bids exist for this asset. Limit sells will rest until a buyer appears.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-text-dim opacity-60">
        <path d="M60 20a25 25 0 1 0 0 50 25 25 0 0 0 0-50z" />
        <path d="M60 45v25" strokeDasharray="4 4" />
        <path d="M45 60h30" strokeDasharray="4 4" />
        <circle cx="60" cy="70" r="8" fill="currentColor" opacity="0.3" />
        <path d="M60 78v12" />
        <path d="M54 84h12" />
        <path d="M60 78v0" strokeWidth={3} />
      </svg>
    ),
  },
  "no-holdings": {
    title: "No holdings yet",
    defaultMessage: "You don't own any assets. Browse the marketplace to start building your portfolio.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-text-dim opacity-60">
        <rect x="15" y="30" width="90" height="70" rx="6" />
        <path d="M15 50h90" strokeDasharray="4 4" />
        <rect x="30" y="40" width="60" height="25" rx="3" fill="currentColor" opacity="0.15" />
        <path d="M45 52.5h30" strokeWidth={1.5} />
        <path d="M60 40v10" strokeWidth={1.5} />
        <circle cx="90" cy="42" r="6" fill="currentColor" opacity="0.3" />
        <path d="M90 39v-6" strokeWidth={1.5} />
        <path d="M87 42h6" strokeWidth={1.5} />
      </svg>
    ),
  },
  "no-auctions": {
    title: "No active auctions",
    defaultMessage: "There are no Dutch auctions running at the moment. Check back later or create your own.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-text-dim opacity-60">
        <path d="M60 15v90" strokeDasharray="6 6" />
        <path d="M15 60h90" strokeDasharray="6 6" />
        <path d="M60 30a25 25 0 0 1 25 25" strokeWidth={2} />
        <path d="M60 30a25 25 0 0 0 -25 25" strokeWidth={2} />
        <circle cx="60" cy="60" r="6" fill="currentColor" opacity="0.3" />
        <path d="M60 54v12" strokeWidth={2} />
        <path d="M54 60h12" strokeWidth={2} />
      </svg>
    ),
  },
  "no-trades": {
    title: "No trades for 3m",
    defaultMessage: "No trades have occurred recently. The chart shows the last known price.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-text-dim opacity-60">
        <path d="M15 90L35 70L50 78L65 55L80 65L95 40" strokeWidth={2} />
        <circle cx="95" cy="40" r="5" fill="currentColor" opacity="0.3" />
        <path d="M95 40v15" strokeDasharray="4 4" />
        <path d="M90 55h10" strokeDasharray="4 4" />
        <text x="105" y="50" fontSize="10" fontFamily="monospace" fill="currentColor" opacity="0.5">3m</text>
      </svg>
    ),
  },
  "thin-market": {
    title: "Thin market",
    defaultMessage: "Low liquidity — prices may be volatile and spreads wide.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-warning opacity-60">
        <path d="M60 15L25 95h70Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M60 15L25 95h70Z" />
        <path d="M50 50h20" strokeWidth={2} />
        <path d="M55 65h10" strokeWidth={2} />
        <circle cx="60" cy="80" r="4" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  "asset-halted": {
    title: "Trading halted",
    defaultMessage: "This asset has been halted by the operator. No new orders can be placed.",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-sell opacity-60">
        <rect x="20" y="25" width="80" height="70" rx="8" />
        <path d="M35 50h50" strokeWidth={2} />
        <path d="M35 70h50" strokeWidth={2} />
        <circle cx="60" cy="50" r="12" strokeWidth={2} />
        <path d="M60 44v12" strokeWidth={2.5} />
        <path d="M54 50h12" strokeWidth={2.5} />
      </svg>
    ),
  },
  "disconnected": {
    title: "Disconnected",
    defaultMessage: "Live data connection lost. Reconnecting automatically…",
    svg: (
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-warning opacity-60">
        <path d="M30 90a30 30 0 0 1 60 0" strokeDasharray="8 4" />
        <path d="M30 90a30 30 0 0 0 60 0" strokeDasharray="8 4" />
        <path d="M60 30v60" strokeWidth={2} strokeDasharray="6 6" />
        <circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.2" />
        <path d="M55 55l10 10" strokeWidth={2} />
        <path d="M65 55l-10 10" strokeWidth={2} />
      </svg>
    ),
  },
};

/**
 * LineArtEmptyState — Original small illustrations for empty/error states.
 * Never generic — each tailored to the specific situation.
 */
export function LineArtEmptyState({
  variant,
  message,
  action,
  className,
}: LineArtEmptyStateProps) {
  const illustration = illustrations[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-8 text-center border border-glass-border bg-white/[0.015] rounded-panel",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-2" style={{ color: "inherit" }}>
        {illustration.svg}
        <h3 className="font-display text-[18px] font-semibold tracking-tight text-text">
          {illustration.title}
        </h3>
      </div>
      <p className="max-w-sm text-[12.5px] leading-relaxed text-text-muted">
        {message ?? illustration.defaultMessage}
      </p>
      {action && (
        <div className="mt-2">{action}</div>
      )}
    </div>
  );
}