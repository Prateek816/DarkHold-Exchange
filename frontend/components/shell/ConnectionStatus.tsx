"use client";

import React from "react";
import { ConnectionState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  let dotColor = "bg-buy";
  let pulse = false;
  let label = "Live";

  switch (state) {
    case "LIVE":
      dotColor = "bg-buy";
      label = "Live";
      break;
    case "CONNECTING":
      dotColor = "bg-warning";
      pulse = true;
      label = "Connecting";
      break;
    case "AUTHENTICATING":
      dotColor = "bg-warning";
      pulse = true;
      label = "Authenticating";
      break;
    case "SYNCING":
      dotColor = "bg-warning";
      pulse = true;
      label = "Syncing";
      break;
    case "RECONNECTING":
      dotColor = "bg-warning";
      pulse = true;
      label = "Reconnecting";
      break;
    case "DISCONNECTED":
      dotColor = "bg-sell";
      label = "Offline";
      break;
  }

  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] text-text-muted backdrop-blur-md",
        className
      )}
      title={`WebSocket connection status: ${state}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor)} />
      </span>
      <span className="uppercase tracking-[0.12em]">{label}</span>
    </div>
  );
}
