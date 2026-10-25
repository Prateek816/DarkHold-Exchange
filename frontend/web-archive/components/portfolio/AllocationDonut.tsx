"use client";

import React from "react";
import type { WalletHolding } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

/**
 * AllocationDonut — Thick-ring donut with rounded segment caps, soft glow,
 * centered big number. New palette: brand, mint, sell, ward.
 */
export function AllocationDonut({
  holdings,
  availableCredits,
  reservedCredits = 0,
  className,
}: {
  holdings: WalletHolding[];
  availableCredits: number;
  reservedCredits?: number;
  className?: string;
}) {
  // Brand palette matching the design system
  const HOLDING_PALETTE = [
    "#7A5CFF", // brand-500
    "#14CBAA", // mint-500
    "#E0405E", // sell-solid
    "#F2B04A", // ward
    "#A18BFF", // brand-400
    "#45E9C8", // mint-400
    "#FF6183", // sell-text
    "#C0B0FF", // brand-300
  ];

  const items = [
    { name: "Available credits", value: availableCredits, color: "#14CBAA" }, // mint
    ...(reservedCredits > 0
      ? [{ name: "Reserved credits", value: reservedCredits, color: "#F2B04A" }] // ward
      : []),
    ...holdings.map((holding, index) => ({
      name: holding.name,
      value: holding.total_units * holding.current_price,
      color: HOLDING_PALETTE[index % HOLDING_PALETTE.length],
    })),
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const denominator = total || 1;

  let cumulative = 0;
  const slices = items.map((item) => {
    const fraction = item.value / denominator;
    const startAngle = cumulative;
    cumulative += fraction * 360;
    return { ...item, fraction, startAngle };
  });

  return (
    <GlassCard glowEdge="brand" className={cn("p-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-glass-border pb-4">
        <div>
          <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
            Account composition
          </h2>
          <p className="pt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
            At last server marks · no historical valuation
          </p>
        </div>
        <p className="figure text-[20px] text-text">
          {formatCurrency(total)}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 pt-4 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label="Wallet composition ring chart"
          >
            <defs>
              <filter id="donut-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              cx="50"
              cy="50"
              r="36"
              fill="transparent"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="10"
            />

            {slices.map((slice, index) => {
              const circumference = 2 * Math.PI * 36;
              const dash = slice.fraction * circumference;
              const offset = -((slice.startAngle / 360) * circumference);
              return (
                <circle
                  key={`${slice.name}-${index}`}
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
                  strokeDashoffset={offset.toFixed(1)}
                  strokeLinecap="round"
                  filter="url(#donut-glow)"
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
              Indicative
            </span>
            <span className="pt-1 figure text-[19px] text-text">
              {formatCurrency(total)}
            </span>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.06em] text-text-dim">
              at last marks
            </span>
          </div>
        </div>

        <div className="w-full flex-1 divide-y divide-glass-border/70">
          {slices.map((slice, index) => (
            <div
              key={`${slice.name}-${index}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color, boxShadow: `0 0 8px ${slice.color}` }}
                  aria-hidden="true"
                />
                <span className="truncate text-[10.5px] text-text-muted">{slice.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[9.5px]">
                <span className="tabular-nums text-text">{formatCurrency(slice.value)}</span>
                <span className="w-10 text-right tabular-nums text-text-dim">
                  {formatPercent(slice.fraction * 100, false)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="border-t border-glass-border pt-3 font-mono text-[8.5px] leading-relaxed text-text-dim">
        Inventory is marked at the wallet's last current price. This is not an appraisal, a
        liquidation value or a promise that the mock book can absorb the quantity.
      </p>
    </GlassCard>
  );
}