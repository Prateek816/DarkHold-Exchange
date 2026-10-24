"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/types";
import { formatCurrency, formatDataAge, formatPercent } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { CeilingGauge } from "@/components/market/CeilingGauge";
import { AssetSparkline } from "@/components/market/AssetSparkline";
import { cn } from "@/lib/utils";
import { Clock, ShieldAlert, TrendingUp, ArrowLeftRight, Gauge, Activity } from "lucide-react";
import Link from "next/link";

interface TerminalHeaderProps {
  asset: Asset;
  bestBid?: number;
  bestAsk?: number;
  lastPrice?: number;
  lastTradeAt?: number;
  lastPriceFlash?: "up" | "down" | null;
  bookSeq?: number;
}

const CATEGORY_LABELS: Record<Asset["category"], string> = {
  FESTIVAL_PASS: "Festival pass",
  LIMITED_MERCH: "Limited merch",
  VIP_EXPERIENCE: "VIP experience",
};

export function TerminalHeader({
  asset,
  bestBid,
  bestAsk,
  lastPrice,
  lastTradeAt,
  lastPriceFlash,
  bookSeq,
}: TerminalHeaderProps) {
  const [dataAge, setDataAge] = useState(formatDataAge(lastTradeAt));
  const lastSyncedTradeAtRef = useRef(lastTradeAt);

  useEffect(() => {
    if (lastSyncedTradeAtRef.current !== lastTradeAt) {
      lastSyncedTradeAtRef.current = lastTradeAt;
      setDataAge(formatDataAge(lastTradeAt));
    }
    const timer = setInterval(() => setDataAge(formatDataAge(lastTradeAt)), 1000);
    return () => clearInterval(timer);
  }, [lastTradeAt]);

  const spread =
    bestBid !== undefined && bestAsk !== undefined && bestAsk >= bestBid
      ? bestAsk - bestBid
      : null;
  const mid =
    bestBid !== undefined && bestAsk !== undefined ? (bestBid + bestAsk) / 2 : null;
  const spreadBps = spread !== null && mid ? (spread / mid) * 10_000 : null;
  const headroom = asset.ceiling_price - (lastPrice ?? asset.last_price);
  const isPositive = asset.price_change_24h_pct >= 0;
  const livePrice = lastPrice ?? asset.last_price;

  return (
    <header className="space-y-4">
      {/* Identity band */}
      <div className="flex flex-col gap-4 border-b border-glass-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile border border-brand-500/35 bg-brand-500/[0.08] font-mono text-[12px] tracking-[0.02em] text-brand-300">
            {asset.symbol.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 className="truncate font-display text-[clamp(1.9rem,3vw,2.6rem)] font-semibold leading-none tracking-tight text-text">
                {asset.name}
              </h1>
              <SimBadge label="SIM" title="Simulated instrument, book and counterparties" />
              {asset.is_thin && <SimBadge label="Thin" title="Thin mock order book" />}
              {asset.is_halted && (
                <span className="inline-flex items-center rounded-pill border border-sell/45 bg-sell-tint px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-sell">
                  Trading halted
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.09em] text-text-dim">
              <span className="text-text-muted">{asset.symbol}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[asset.category]}</span>
              <span aria-hidden="true">·</span>
              <span>Face {formatCurrency(asset.face_value)}</span>
              <span aria-hidden="true">·</span>
              <span title="Sequence number of the last accepted book snapshot">
                Book seq {bookSeq?.toLocaleString("en-US") ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Outlined pill actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]",
              dataAge.isStale
                ? "border-warning/40 bg-warning-tint text-warning"
                : "border-glass-border bg-white/[0.03] text-text-muted"
            )}
            title="Time since the last trade print"
          >
            <Clock className="h-3 w-3" />
            Last print {dataAge.text}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ward/40 bg-ward-tint px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ward">
            <ShieldAlert className="h-3 w-3" />
            Ward cap {formatCurrency(asset.ceiling_price)}
          </span>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 rounded-pill border border-glass-border bg-white/[0.03] px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-muted transition-colors hover:border-glass-border-strong hover:text-text"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Board
          </Link>
        </div>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1 — Last price with mini area chart */}
        <GlassCard glowEdge={lastPriceFlash === "down" ? "sell" : "mint"} enableSpotlight className="flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconTile icon={TrendingUp} variant="mint" size="sm" />
              <span className="data-label truncate">Last mock print</span>
            </div>
            <DeltaPill value={asset.price_change_24h_pct} label="24h" />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "figure text-[30px] transition-colors duration-150",
                  lastPriceFlash === "up"
                    ? "text-buy"
                    : lastPriceFlash === "down"
                      ? "text-sell"
                      : "text-text"
                )}
              >
                {formatCurrency(livePrice)}
              </p>
              <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
                {formatPercent(asset.price_change_24h_pct)} over 24h
              </p>
            </div>
            <AssetSparkline
              data={asset.sparkline_1h}
              isPositive={isPositive}
              width={92}
              height={38}
            />
          </div>
        </GlassCard>

        {/* 2 — Best bid / ask */}
        <GlassCard enableSpotlight className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Activity} variant="brand" size="sm" />
            <span className="data-label truncate">Best bid / ask</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
                Bid
              </p>
              <p className="figure mt-1.5 text-[18px] text-buy">
                {formatCurrency(bestBid ?? asset.best_bid ?? 0, { showCents: false })}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
                Ask
              </p>
              <p className="figure mt-1.5 text-[18px] text-sell">
                {formatCurrency(bestAsk ?? asset.best_ask ?? 0, { showCents: false })}
              </p>
            </div>
          </div>

          <div className="border-t border-glass-border pt-3 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
            {asset.available_ask_qty.toLocaleString("en-US")} units offered
          </div>
        </GlassCard>

        {/* 3 — Spread */}
        <GlassCard enableSpotlight className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconTile icon={ArrowLeftRight} variant="neutral" size="sm" />
            <span className="data-label truncate">Spread</span>
          </div>

          <div>
            <p className="figure text-[30px] text-text">
              {spread === null ? "—" : formatCurrency(spread)}
            </p>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
              {spreadBps === null
                ? "No two-sided quote"
                : `${spreadBps.toFixed(1)} bps of mid`}
            </p>
          </div>

          <div className="border-t border-glass-border pt-3 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
            Mid {mid === null ? "—" : formatCurrency(mid)}
          </div>
        </GlassCard>

        {/* 4 — Ceiling gauge */}
        <GlassCard glowEdge="ward" enableSpotlight className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Gauge} variant="amber" size="sm" />
            <span className="data-label truncate">The Ward</span>
          </div>

          <div>
            <p className="figure text-[30px] text-ward">
              {formatCurrency(asset.ceiling_price)}
            </p>
            <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
              {asset.ceiling_pct}% of face value
            </p>
          </div>

          <div className="border-t border-glass-border pt-3">
            <CeilingGauge
              faceValue={asset.face_value}
              ceilingPrice={asset.ceiling_price}
              ceilingPct={asset.ceiling_pct}
              lastPrice={livePrice}
              showLabels={false}
            />
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-dim">
              Headroom{" "}
              <span className={headroom >= 0 ? "text-text" : "text-sell"}>
                {headroom >= 0
                  ? formatCurrency(headroom, { showCents: false })
                  : `-${formatCurrency(Math.abs(headroom), { showCents: false })}`}
              </span>
            </p>
          </div>
        </GlassCard>
      </div>
    </header>
  );
}
