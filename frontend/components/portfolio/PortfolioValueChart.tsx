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
    <GlassCard glowEdge={isPositive ? "teal" : "sell"} className={cn("p-6 space-y-4 font-mono", className)}>
      <div className="flex items-center justify-between border-b border-glass-border pb-3">
        <SectionHeader
          icon={TrendingUp}
          iconVariant="teal"
          title="Portfolio Valuation Over Time"
          subtitle="Cryptographically verified ledger balance evolution."
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-dim">Net:</span>
          <span className={cn("font-bold tabular-nums", isPositive ? "text-buy-text" : "text-sell")}>
            {formatCurrency(netDiff, { showSign: true })}
          </span>
        </div>
      </div>

      <AreaGlowChart
        data={chartData}
        color={isPositive ? "teal" : "sell"}
        height={170}
      />
    </GlassCard>
  );
}
