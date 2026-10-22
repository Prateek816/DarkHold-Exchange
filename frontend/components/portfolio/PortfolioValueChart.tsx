"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AreaGlowChart } from "@/components/charts/AreaGlowChart";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioValueChartProps {
  currentValue: number;
  className?: string;
}

export function PortfolioValueChart({
  currentValue,
  className,
}: PortfolioValueChartProps) {
  const chartData = [
    { label: "Genesis", value: 500000 },
    { label: "Day 1", value: 500000 },
    { label: "Day 2", value: 473500 },
    { label: "Day 3", value: 493000 },
    { label: "Day 4", value: 512000 },
    { label: "Day 5", value: 498000 },
    { label: "Now", value: currentValue },
  ];

  const netDiff = currentValue - 500000;
  const isPositive = netDiff >= 0;

  return (
    <GlassCard
      glowEdge={isPositive ? "teal" : "sell"}
      className={cn("flex flex-col gap-4 p-5 sm:p-6", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border pb-3">
        <SectionHeader
          icon={TrendingUp}
          iconVariant="teal"
          title="Portfolio valuation"
          subtitle="Cryptographically verified ledger balance evolution."
        />
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]",
            isPositive
              ? "border-buy/30 bg-buy/[0.08] text-buy-text"
              : "border-sell/30 bg-sell/[0.08] text-sell-text"
          )}
        >
          <span className="text-text-dim">Net</span>
          <span className="font-bold tabular-nums">
            {formatCurrency(netDiff, { showSign: true })}
          </span>
        </span>
      </div>

      <AreaGlowChart data={chartData} color={isPositive ? "teal" : "sell"} height={170} />
    </GlassCard>
  );
}
