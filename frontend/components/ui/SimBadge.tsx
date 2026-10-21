"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SimBadgeProps {
  label?: string;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

/**
 * SIM BADGE: Reserved exclusively for simulated bot traders, simulated history,
 * and simulated liquidity indicators in violet (#7C5CFF).
 */
export function SimBadge({
  label = "SIM",
  size = "sm",
  className,
  title = "Simulated automated counterparty",
}: SimBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-400 select-none shadow-[0_0_8px_rgba(124,92,255,0.2)]",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        className
      )}
      title={title}
    >
      {label}
    </span>
  );
}
