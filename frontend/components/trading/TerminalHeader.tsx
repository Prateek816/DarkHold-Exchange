"use client";

import React, { useState, useEffect } from "react";
import { Asset } from "@/lib/types";
import { formatCurrency, formatPercent, formatDataAge } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { StatCard } from "@/components/ui/StatCard";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { CeilingGauge } from "@/components/market/CeilingGauge";
import { TrendingUp, ArrowDownUp, Shield, Activity, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalHeaderProps {
  asset: Asset;
  bestBid?: number;
  bestAsk?: number;
  lastPriceFlash?: "up" | "down" | null;
}

export function TerminalHeader({
  asset,
  bestBid,
  bestAsk,
  lastPriceFlash,
}: TerminalHeaderProps) {
  const [dataAge, setDataAge] = useState(formatDataAge(asset.last_price_timestamp));

  useEffect(() => {
    const timer = setInterval(() => {
      setDataAge(formatDataAge(asset.last_price_timestamp));
    }, 1000);
    return () => clearInterval(timer);
  }, [asset.last_price_timestamp]);

  const isPositive = asset.price_change_24h_pct >= 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null;

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Asset Identity Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-panel border border-glass-border bg-white/[0.025] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile border border-brand-500/30 bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold text-sm shadow-glow-teal font-mono">
            {asset.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-text tracking-tight font-sans">
                {asset.name}
              </h2>
              <SimBadge label="SIM" size="sm" title="Market populated by simulated bot traders" />
              {asset.is_halted && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-sell font-bold px-2 py-0.5 rounded-pill bg-sell/10 border border-sell">
                  Trading Halted
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-text-dim pt-0.5">
              <span className="text-text-muted">{asset.symbol}</span>
              <span>•</span>
              <span>Face: {formatCurrency(asset.face_value)}</span>
              <span>•</span>
              <span
                className="text-ward font-medium cursor-help"
                title={`Resale cap is ${asset.ceiling_pct}% of face value. Orders above it are rejected.`}
              >
                Ward Cap: {formatCurrency(asset.ceiling_price)} ({asset.ceiling_pct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Activity & Latency Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/[0.03] border border-glass-border">
            <Clock className="w-3.5 h-3.5 text-text-dim" />
            <span className={cn(dataAge.isStale ? "text-warning font-semibold" : "text-text-muted")}>
              {dataAge.text}
            </span>
          </div>
        </div>
      </div>

      {/* Top Row of 4 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* StatCard 1: Last Price */}
        <StatCard
          icon={TrendingUp}
          iconVariant={isPositive ? "teal" : "sell"}
          label="Last Trade Price"
          value={formatCurrency(asset.last_price)}
          delta={asset.price_change_24h_pct}
          glowEdge={isPositive ? "teal" : "sell"}
          className={cn(
            lastPriceFlash === "up" && "bg-buy-bg/30 border-buy/50",
            lastPriceFlash === "down" && "bg-sell-bg/30 border-sell/50"
          )}
          subValue={`24h Volume: ${asset.volume_24h} passes`}
        />

        {/* StatCard 2: Best Bid / Ask */}
        <StatCard
          icon={ArrowDownUp}
          iconVariant="neutral"
          label="Best Bid / Best Ask"
          value={`${formatCurrency(bestBid ?? asset.best_bid, { showCents: false })} / ${formatCurrency(bestAsk ?? asset.best_ask, { showCents: false })}`}
          subValue={`Available Ask Size: ${asset.available_ask_qty} units`}
        />

        {/* StatCard 3: Spread */}
        <StatCard
          icon={Activity}
          iconVariant="amber"
          label="Order Book Spread"
          value={spread !== null && spread > 0 ? formatCurrency(spread) : "No spread"}
          subValue="Cross-tier matching efficiency"
        />

        {/* StatCard 4: The Ward Ceiling Gauge */}
        <div className="rounded-card border border-glass-border bg-gradient-to-br from-white/[0.065] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-5 flex flex-col justify-between space-y-3 shadow-glass">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-ward" />
              <span className="text-xs uppercase tracking-wider text-text-muted font-medium font-mono">
                The Ward Invariant
              </span>
            </div>
            <span className="text-[11px] font-mono text-ward font-bold">
              {asset.ceiling_pct}% Cap
            </span>
          </div>

          <CeilingGauge
            faceValue={asset.face_value}
            lastPrice={asset.last_price}
            ceilingPrice={asset.ceiling_price}
            ceilingPct={asset.ceiling_pct}
            showLabels={true}
          />
        </div>
      </div>
    </div>
  );
}
