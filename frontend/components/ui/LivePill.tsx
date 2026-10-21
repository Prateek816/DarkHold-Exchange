"use client";

import React from "react";
import { ConnectionState } from "@/lib/types";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePillProps {
  state: ConnectionState;
  className?: string;
}

export function LivePill({ state, className }: LivePillProps) {
  let color = "bg-buy text-buy-text border-buy/30";
  let dotColor = "bg-buy";
  let label = "Live";
  let pulse = true;

  if (state === "DISCONNECTED") {
    color = "bg-sell-bg text-sell border-sell/40";
    dotColor = "bg-sell";
    label = "Offline";
    pulse = false;
  } else if (state === "RECONNECTING" || state === "SYNCING" || state === "CONNECTING") {
    color = "bg-warning/15 text-warning border-warning/40";
    dotColor = "bg-warning";
    label = state === "RECONNECTING" ? "Reconnecting" : "Syncing";
    pulse = true;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-pill border bg-white/[0.035] backdrop-blur-md",
        "font-mono text-xs select-none transition-colors",
        className
      )}
      title={`Connection state: ${state}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              dotColor
            )}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)} />
      </span>

      <Radio className="w-3 h-3 text-text-muted" />
      <span className="font-semibold uppercase tracking-wider text-[11px] text-text">
        {label}
      </span>
    </div>
  );
}
