"use client";

import React from "react";
import { ConnectionState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  let dotColor = "bg-trade-buy";
  let pulse = false;
  let label = "Live";

  switch (state) {
    case "LIVE":
      dotColor = "bg-trade-buy";
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
      dotColor = "bg-trade-sell";
      label = "Offline";
      break;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface/90 border border-border text-[11px] font-mono text-parchment-muted select-none",
        className
      )}
      title={`WebSocket connection status: ${state}`}
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
      <span className="tracking-wide uppercase text-[10px]">{label}</span>
    </div>
  );
}
