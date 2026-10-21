"use client";

import React from "react";
import { Check, Clock, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
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

export function StatusPill({
  status,
  label,
  size = "md",
  className,
}: StatusPillProps) {
  const norm = status.toUpperCase();

  let text = label || status;
  let style = "bg-white/5 text-text-muted border-glass-border";
  let icon = null;

  if (norm === "SETTLED" || norm === "SUCCESS" || norm === "COMPLETED" || norm === "FILLED") {
    text = label || (norm === "FILLED" ? "Filled" : "Settled");
    style = "bg-buy text-canvas font-bold border-buy/80 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
    icon = <Check className="w-3 h-3 stroke-[3]" />;
  } else if (norm === "MATCHED_SETTLING" || norm === "MATCHED" || norm === "SETTLING") {
    text = label || "Matched, settling";
    style = "border-warning text-warning bg-warning/10 animate-pulse";
    icon = <Clock className="w-3 h-3" />;
  } else if (norm === "OPEN" || norm === "PARTIALLY_FILLED") {
    text = label || (norm === "OPEN" ? "Open" : "Partially Filled");
    style = "bg-brand-500/15 text-brand-400 border-brand-500/30";
  } else if (norm === "CANCELED" || norm === "PENDING" || norm === "PENDING_SUBMIT") {
    text = label || (norm === "CANCELED" ? "Canceled" : "Pending");
    style = "bg-white/[0.04] text-text-muted border-glass-border";
  } else if (norm === "REJECTED" || norm === "FAILED") {
    text = label || "Rejected";
    style = "bg-sell/15 text-sell border-sell/40";
    icon = <XCircle className="w-3 h-3" />;
  } else if (norm === "SIM") {
    text = label || "SIM";
    style = "bg-sim-bg text-sim border-sim-border font-bold shadow-[0_0_8px_rgba(124,92,255,0.25)]";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-mono border select-none transition-colors",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        style,
        className
      )}
    >
      {icon}
      <span>{text}</span>
    </span>
  );
}
