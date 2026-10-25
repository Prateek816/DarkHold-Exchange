"use client";

import React, { useState, useEffect } from "react";
import { Asset } from "@/lib/types";
import { formatCurrency, formatDataAge } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { CeilingGauge } from "@/components/market/CeilingGauge";
import { TrendingUp, ArrowDownUp, Activity, Clock, ShieldAlert } from "lucide-react";
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
      {/* Asset identity banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-glass-border bg-gradient-to-r from-white/[0.045] via-white/[0.02] to-transparent p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-tile border border-brand-500/30 bg-gradient-to-br from-brand-500/20 to-violet-500/10 font-mono text-[13px] font-bold text-brand-300 shadow-glow-teal">
            {asset.symbol.slice(0, 3)}
            <span className="absolute inset-0 rounded-tile ring-1 ring-inset ring-white/[0.08]" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-[17px] font-semibold tracking-tight text-text">
                {asset.name}
              </h2>
              <SimBadge label="SIM" size="sm" title="Market populated by simulated bot traders" />
              {asset.is_halted && (
                <span className="rounded-full border border-sell/40 bg-sell/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-sell-text">
                  Trading halted
                </span>
              )}
              {(asset.is_configured === false || asset.status === "UNCONFIGURED") && (
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-warning">
                  Unconfigured / Untradable
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 font-mono text-[10px] text-text-dim">
              <span className="text-text-muted">{asset.symbol}</span>
              <span className="h-0.5 w-0.5 rounded-full bg-text-dim" />
              <span>Face {formatCurrency(asset.face_value)}</span>
              <span className="h-0.5 w-0.5 rounded-full bg-text-dim" />
              <span
                className="cursor-help font-medium text-warning"
                title={`Resale cap is ${asset.ceiling_pct}% of face value. Orders above it are rejected.`}
              >
                Ward cap {formatCurrency(asset.ceiling_price)} ({asset.ceiling_pct}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-text-muted">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                dataAge.isStale ? "bg-warning" : "bg-buy shadow-[0_0_6px_#22C55E]"
              )}
            />
            <Clock className="h-3 w-3 text-text-dim" />
            <span className={cn(dataAge.isStale && "font-semibold text-warning")}>
              {dataAge.text}
            </span>
          </span>
        </div>
      </div>

      {/* Four-stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          iconVariant={isPositive ? "teal" : "sell"}
          label="Last trade price"
          value={formatCurrency(asset.last_price)}
          delta={asset.price_change_24h_pct}
          glowEdge={isPositive ? "teal" : "sell"}
          className={cn(
            "transition-colors duration-200",
            lastPriceFlash === "up" && "border-buy/50 bg-buy/[0.06]",
            lastPriceFlash === "down" && "border-sell/50 bg-sell/[0.06]"
          )}
          subValue={`24h volume · ${asset.volume_24h} passes`}
        />

        <StatCard
          icon={ArrowDownUp}
          iconVariant="neutral"
          label="Best bid / best ask"
          value={`${formatCurrency(bestBid ?? asset.best_bid, {
            showCents: false,
          })} / ${formatCurrency(bestAsk ?? asset.best_ask, { showCents: false })}`}
          subValue={`Ask size · ${asset.available_ask_qty} units`}
        />

        <StatCard
          icon={Activity}
          iconVariant="amber"
          label="Order book spread"
          value={spread !== null && spread > 0 ? formatCurrency(spread) : "No spread"}
          subValue="Cross-tier matching efficiency"
        />

        <GlassCard className="flex flex-col justify-between gap-3 p-5" hoverLift={false}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <span className="data-label">The Ward invariant</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-warning">
              {asset.ceiling_pct}% cap
            </span>
          </div>

          <CeilingGauge
            faceValue={asset.face_value}
            lastPrice={asset.last_price}
            ceilingPrice={asset.ceiling_price}
            ceilingPct={asset.ceiling_pct}
            showLabels
          />
        </GlassCard>
      </div>
    </div>
  );
}
