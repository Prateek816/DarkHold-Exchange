"use client";

import React from "react";
import { Check, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusPillType =
  | "SETTLED"
  | "SUCCESS"
  | "MATCHED_SETTLING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "PENDING"
  | "CANCELED"
  | "REJECTED"
  | "SIM";

interface StatusPillProps {
  status: StatusPillType | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusPill({ status, label, size = "md", className }: StatusPillProps) {
  const norm = status.toUpperCase();

  let text = label || status;
  let style = "bg-white/[0.04] text-text-muted border-glass-border";
  let icon: React.ReactNode = null;
  let dot: string | null = null;

  if (norm === "SETTLED" || norm === "SUCCESS" || norm === "COMPLETED" || norm === "FILLED") {
    text = label || (norm === "FILLED" ? "Filled" : "Settled");
    style = "border-buy/35 bg-buy/10 text-buy-text";
    icon = <Check className="h-3 w-3 stroke-[3]" />;
  } else if (norm === "MATCHED_SETTLING" || norm === "MATCHED" || norm === "SETTLING") {
    text = label || "Matched, settling";
    style = "border-warning/40 bg-warning/10 text-warning";
    icon = <Clock className="h-3 w-3" />;
  } else if (norm === "OPEN" || norm === "PARTIALLY_FILLED") {
    text = label || (norm === "OPEN" ? "Open" : "Partially Filled");
    style = "border-brand-500/30 bg-brand-500/10 text-brand-300";
    dot = "bg-brand-400";
  } else if (norm === "CANCELED" || norm === "PENDING" || norm === "PENDING_SUBMIT") {
    text = label || (norm === "CANCELED" ? "Canceled" : "Pending");
    style = "border-glass-border bg-white/[0.03] text-text-dim";
    dot = "bg-text-dim";
  } else if (norm === "REJECTED" || norm === "FAILED") {
    text = label || "Rejected";
    style = "border-sell/40 bg-sell/10 text-sell-text";
    icon = <XCircle className="h-3 w-3" />;
  } else if (norm === "SIM") {
    text = label || "SIM";
    style = "border-sim-border bg-sim-bg text-violet-300";
    dot = "bg-violet-400";
  }

  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-1.5 rounded-full border font-mono transition-colors",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        style,
        className
      )}
    >
      {icon}
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      <span className="font-medium tracking-wide">{text}</span>
    </span>
  );
}
