"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ConnectionState =
  | "CONNECTING"
  | "AUTHENTICATING"
  | "SYNCING"
  | "LIVE"
  | "RECONNECTING"
  | "DISCONNECTED";

interface LivePillProps {
  state: ConnectionState;
  /** Compact variant */
  compact?: boolean;
  className?: string;
}

const stateConfig: Record<ConnectionState, { label: string; color: string; pulse: boolean }> = {
  CONNECTING: { label: "Connecting…", color: "text-warning", pulse: false },
  AUTHENTICATING: { label: "Authenticating…", color: "text-warning", pulse: false },
  SYNCING: { label: "Syncing…", color: "text-warning", pulse: true },
  LIVE: { label: "Live", color: "text-buy", pulse: true },
  RECONNECTING: { label: "Reconnecting…", color: "text-warning", pulse: true },
  DISCONNECTED: { label: "Offline", color: "text-sell", pulse: false },
};

/**
 * LivePill — Connection status indicator with pulsing ring for live states.
 * Always includes text label (never color-only).
 */
export function LivePill({ state, compact = false, className }: LivePillProps) {
  const config = stateConfig[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono font-medium",
        compact ? "text-[9.5px]" : "text-[10.5px]",
        "bg-white/[0.02] border-current/20",
        className
      )}
      style={{ borderColor: `var(--${config.color.replace("text-", "")})` }}
    >
      <span
        className={cn(
          "relative flex h-3 w-3 items-center justify-center",
          config.color
        )}
      >
        {config.pulse && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: "currentColor" }} />
        )}
        <span className={cn("relative h-1.5 w-1.5 rounded-full", config.pulse ? "animate-pulse" : "")} style={{ backgroundColor: "currentColor" }} />
      </span>
      <span style={{ color: `var(--${config.color.replace("text-", "")})` }}>{config.label}</span>
    </span>
  );
}