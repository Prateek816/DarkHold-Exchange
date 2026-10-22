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
  let tone = "border-buy/30 bg-buy/10 text-buy-text";
  let dot = "bg-buy";
  let label = "Live";
  let pulse = true;

  if (state === "DISCONNECTED") {
    tone = "border-sell/40 bg-sell/10 text-sell-text";
    dot = "bg-sell";
    label = "Offline";
    pulse = false;
  } else if (state === "RECONNECTING" || state === "SYNCING" || state === "CONNECTING") {
    tone = "border-warning/35 bg-warning/10 text-warning";
    dot = "bg-warning";
    label = state === "RECONNECTING" ? "Reconnecting" : "Syncing";
  } else if (state === "AUTHENTICATING") {
    tone = "border-warning/35 bg-warning/10 text-warning";
    dot = "bg-warning";
    label = "Auth";
  }

  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-2 rounded-full border px-2.5 py-1 backdrop-blur-md transition-colors",
        tone,
        className
      )}
      title={`Connection state: ${state}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping", dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot)} />
      </span>

      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      <Radio className="h-3 w-3 opacity-55" />
    </div>
  );
}
