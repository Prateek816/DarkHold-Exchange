"use client";

import React from "react";
import Link from "next/link";
import type { Asset } from "@/lib/types";
import { formatCurrency, formatQuantity, formatDataAge } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { CeilingGauge } from "./CeilingGauge";
import { AssetSparkline } from "./AssetSparkline";
import { SimBadge } from "@/components/ui/SimBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { Ticket, Shirt, Sparkles, Gavel, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
  className?: string;
}

const CATEGORY_LABELS: Record<Asset["category"], string> = {
  FESTIVAL_PASS: "Festival pass",
  LIMITED_MERCH: "Limited merch",
  VIP_EXPERIENCE: "VIP experience",
};

export function AssetCard({ asset, className }: AssetCardProps) {
  const isPositive = asset.price_change_24h_pct >= 0;
  const dataAge = formatDataAge(asset.last_price_timestamp);

  let icon = Ticket;
  let iconVariant: "brand" | "mint" | "neutral" | "sell" | "amber" = "mint";

  if (asset.category === "LIMITED_MERCH") {
    icon = Shirt;
    iconVariant = "brand";
  } else if (asset.category === "VIP_EXPERIENCE") {
    icon = Sparkles;
    iconVariant = "amber";
  }

  return (
    <Link
      href={`/trade/${asset.id}`}
      className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <GlassCard
        glowEdge={asset.is_halted ? "sell" : isPositive ? "mint" : "sell"}
        enableSpotlight
        className={cn(
          "flex h-full cursor-pointer flex-col justify-between gap-4",
          asset.is_halted && "opacity-85"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <IconTile icon={icon} variant={iconVariant} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[16px] font-semibold leading-tight tracking-[-0.02em] text-text transition-colors group-hover:text-brand-200">
              {asset.name}
            </h3>
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
              {asset.symbol}
              <span className="mx-1.5 text-text-dim/60" aria-hidden="true">/</span>
              {CATEGORY_LABELS[asset.category]}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {asset.is_halted && <StatusPill status="REJECTED" label="Halted" compact />}
          {!asset.is_halted && asset.has_active_auction && (
            <span className="inline-flex items-center gap-1 rounded-pill border border-ward/35 bg-ward-tint px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] text-ward">
              <Gavel className="h-2.5 w-2.5" />
              Auction
            </span>
          )}
          {asset.sim_active && <SimBadge label="SIM" size="sm" />}
          {asset.is_thin && (
            <span
              className="inline-flex items-center rounded-pill border border-warning/35 bg-warning-tint px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] text-warning"
              title="Low liquidity — wide spreads and volatile prints"
            >
              Thin market
            </span>
          )}
        </div>

        {/* Price + Delta */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="figure text-[27px] text-text">
              {formatCurrency(asset.last_price)}
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-[10px] uppercase tracking-[0.08em]",
                dataAge.isStale ? "text-warning" : "text-text-dim"
              )}
              title="Time since the last trade print"
            >
              {dataAge.text}
            </p>
          </div>
          <DeltaPill value={asset.price_change_24h_pct} label="24h" />
        </div>

        {/* Sparkline */}
        <div className="-mx-1">
          <AssetSparkline data={asset.sparkline_1h} isPositive={isPositive} />
        </div>

        {/* Ceiling Gauge */}
        <CeilingGauge
          faceValue={asset.face_value}
          ceilingPrice={asset.ceiling_price}
          ceilingPct={asset.ceiling_pct}
          lastPrice={asset.last_price}
        />

        {/* Book summary */}
        <div className="grid grid-cols-3 gap-3 border-t border-glass-border pt-4">
          <div>
            <p className="data-label">Best bid</p>
            <p className="mt-1 font-mono text-[12px] tabular-nums text-buy">
              {asset.best_bid ? formatCurrency(asset.best_bid, { showCents: false }) : "—"}
            </p>
          </div>
          <div>
            <p className="data-label">Best ask</p>
            <p className="mt-1 font-mono text-[12px] tabular-nums text-sell">
              {asset.best_ask ? formatCurrency(asset.best_ask, { showCents: false }) : "—"}
            </p>
          </div>
          <div>
            <p className="data-label">Offers</p>
            <p className="mt-1 font-mono text-[12px] tabular-nums text-text">
              {formatQuantity(asset.available_ask_qty)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-glass-border pt-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-dim">
            {asset.is_halted ? "Halted by operator" : `${asset.volume_24h.toLocaleString("en-US")} units / 24h`}
          </span>

          <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim transition-colors group-hover:text-brand-300">
            Open terminal
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
