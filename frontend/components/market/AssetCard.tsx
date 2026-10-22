"use client";

import React from "react";
import Link from "next/link";
import { Asset } from "@/lib/types";
import { formatCurrency, formatQuantity, formatDataAge } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { CeilingGauge } from "./CeilingGauge";
import { AssetSparkline } from "./AssetSparkline";
import { SimBadge } from "@/components/ui/SimBadge";
import { Ticket, Shirt, Sparkles, Gavel, Clock, ArrowUpRight } from "lucide-react";
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
    <Link
      href={`/trade/${asset.id}`}
      className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <GlassCard
        glowEdge={isPositive ? "teal" : "sell"}
        sheen
        className={cn(
          "flex h-full cursor-pointer flex-col justify-between gap-4 p-5",
          asset.is_halted && "border-sell/40 opacity-80",
          className
        )}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <IconTile icon={icon} variant={iconVariant} size="sm" />
              <div className="min-w-0">
                <h3 className="line-clamp-2 min-h-[36px] text-[13.5px] font-semibold leading-snug tracking-tight text-text transition-colors group-hover:text-brand-300">
                  {asset.name}
                </h3>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-text-dim">
                    {asset.symbol}
                  </span>
                  <span className="h-0.5 w-0.5 rounded-full bg-text-dim" />
                  <span className="truncate text-[10.5px] text-text-muted">{categoryLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {asset.sim_active && <SimBadge label="SIM" size="sm" />}
              {asset.has_active_auction && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] text-warning">
                  <Gavel className="h-2.5 w-2.5" />
                  Auction
                </span>
              )}
              {asset.is_thin && (
                <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-warning">
                  Thin
                </span>
              )}
              {asset.is_halted && (
                <span className="rounded-full border border-sell/40 bg-sell/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-sell-text">
                  Halted
                </span>
              )}
            </div>
          </div>

          {/* Price + Sparkline */}
          <div className="flex items-end justify-between gap-2 pt-0.5">
            <div className="space-y-1">
              <span className="data-label block">Last price</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[24px] font-semibold leading-none tracking-tight text-text tabular-nums">
                  {formatCurrency(asset.last_price)}
                </span>
                <DeltaPill value={asset.price_change_24h_pct} />
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px] text-text-dim">
                <Clock className="h-2.5 w-2.5" />
                <span className={cn(dataAge.isStale && "text-warning")}>{dataAge.text}</span>
              </div>
            </div>

            <div className="pb-0.5 opacity-90 transition-opacity group-hover:opacity-100">
              <AssetSparkline
                data={asset.sparkline_1h}
                isPositive={isPositive}
                width={88}
                height={32}
              />
            </div>
          </div>

          <CeilingGauge
            faceValue={asset.face_value}
            lastPrice={asset.last_price}
            ceilingPrice={asset.ceiling_price}
            ceilingPct={asset.ceiling_pct}
            showLabels
          />
        </div>

        {/* Footer */}
        <div className="grid grid-cols-3 gap-2 border-t border-glass-border pt-3 font-mono text-[11px] text-text-muted">
          <div>
            <span className="block text-[9px] uppercase tracking-[0.1em] text-text-dim">Best bid</span>
            <span className="font-semibold tabular-nums text-buy-text">
              {formatCurrency(asset.best_bid)}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-[0.1em] text-text-dim">Best ask</span>
            <span className="font-semibold tabular-nums text-sell-text">
              {formatCurrency(asset.best_ask)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] uppercase tracking-[0.1em] text-text-dim">Ask qty</span>
            <span className="font-semibold tabular-nums text-text">
              {formatQuantity(asset.available_ask_qty)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-glass-border pt-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
            Open terminal
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-400" />
        </div>
      </GlassCard>
    </Link>
  );
}
