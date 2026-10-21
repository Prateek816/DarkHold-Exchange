"use client";

import React from "react";
import Link from "next/link";
import { Asset } from "@/lib/types";
import { formatCurrency, formatPercent, formatQuantity, formatDataAge } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { CeilingGauge } from "./CeilingGauge";
import { AssetSparkline } from "./AssetSparkline";
import { SimBadge } from "@/components/ui/SimBadge";
import { Ticket, Shirt, Sparkles, Gavel, Clock, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
  className?: string;
}

export function AssetCard({ asset, className }: AssetCardProps) {
  const isPositive = asset.price_change_24h_pct >= 0;
  const dataAge = formatDataAge(asset.last_price_timestamp);

  let categoryLabel = "Festival Pass";
  let icon = Ticket;
  let iconVariant: "teal" | "violet" | "neutral" | "sell" | "amber" = "teal";

  if (asset.category === "LIMITED_MERCH") {
    categoryLabel = "Limited Relic";
    icon = Shirt;
    iconVariant = "violet";
  } else if (asset.category === "VIP_EXPERIENCE") {
    categoryLabel = "VIP Ritual";
    icon = Sparkles;
    iconVariant = "amber";
  }

  return (
    <Link href={`/trade/${asset.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-card">
      <GlassCard
        glowEdge={isPositive ? "teal" : "sell"}
        className={cn(
          "p-6 flex flex-col justify-between space-y-4 cursor-pointer",
          asset.is_halted && "opacity-80 border-sell/40",
          className
        )}
      >
        <div className="space-y-4">
          {/* Header Row: IconTile + Name + Category + Badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <IconTile icon={icon} variant={iconVariant} />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text truncate group-hover:text-brand-400 transition-colors">
                  {asset.name}
                </h3>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-mono font-medium text-text-dim uppercase">
                    {asset.symbol}
                  </span>
                  <span className="text-glass-border">•</span>
                  <span className="text-[11px] text-text-muted">{categoryLabel}</span>
                </div>
              </div>
            </div>

            {/* Badges Capsule */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {asset.sim_active && <SimBadge label="SIM" size="sm" />}
              {asset.has_active_auction && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-warning px-2 py-0.5 rounded-pill bg-warning/10 border border-warning/30">
                  <Gavel className="w-2.5 h-2.5" />
                  <span>Auction</span>
                </span>
              )}
              {asset.is_thin && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-warning px-1.5 py-0.2 rounded-pill bg-warning/10 border border-warning/30">
                  Thin
                </span>
              )}
              {asset.is_halted && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-sell font-bold px-1.5 py-0.2 rounded-pill bg-sell/10 border border-sell">
                  Halted
                </span>
              )}
            </div>
          </div>

          {/* Pricing & Sparkline Section */}
          <div className="flex items-end justify-between pt-1">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-text-dim font-mono block">
                Last Price
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-semibold text-text tabular-nums tracking-tight">
                  {formatCurrency(asset.last_price)}
                </span>
                <DeltaPill value={asset.price_change_24h_pct} />
              </div>

              {/* Data age indicator */}
              <div className="flex items-center gap-1 text-[11px] font-mono text-text-dim">
                <Clock className="w-3 h-3 text-text-dim" />
                <span className={cn(dataAge.isStale && "text-warning")}>{dataAge.text}</span>
              </div>
            </div>

            {/* Glowing Mini Sparkline */}
            <div className="pb-1">
              <AssetSparkline
                data={asset.sparkline_1h}
                isPositive={isPositive}
                width={100}
                height={34}
              />
            </div>
          </div>

          {/* The Ward Ceiling Gauge */}
          <CeilingGauge
            faceValue={asset.face_value}
            lastPrice={asset.last_price}
            ceilingPrice={asset.ceiling_price}
            ceilingPct={asset.ceiling_pct}
            showLabels={true}
          />
        </div>

        {/* Footer Metrics Strip */}
        <div className="pt-3 border-t border-glass-border grid grid-cols-3 gap-2 text-xs font-mono text-text-muted">
          <div>
            <span className="block text-[10px] uppercase text-text-dim">Best Bid</span>
            <span className="text-buy-text font-semibold">{formatCurrency(asset.best_bid)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-text-dim">Best Ask</span>
            <span className="text-sell font-semibold">{formatCurrency(asset.best_ask)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase text-text-dim">Ask Qty</span>
            <span className="text-text font-semibold">{formatQuantity(asset.available_ask_qty)}</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
