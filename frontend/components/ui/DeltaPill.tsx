"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaPillProps {
  value: number; // percentage value e.g. 4.8 or -1.4
  showSign?: boolean;
  className?: string;
}

export function DeltaPill({ value, showSign = true, className }: DeltaPillProps) {
  const isPositive = value >= 0;
  const formatted = `${showSign && isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 h-[22px] px-2 rounded-pill text-[12px] font-semibold tabular-nums select-none border transition-colors",
        isPositive
          ? "bg-buy-bg text-buy-text border-buy/30"
          : "bg-sell-bg text-sell border-sell/30",
        className
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
      ) : (
        <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
      )}
      <span>{formatted}</span>
    </span>
  );
}
