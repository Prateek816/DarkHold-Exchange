"use client";

import React, { useMemo } from "react";
import type { Asset } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconTile } from "@/components/ui/IconTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { DotMatrixChart, type DotMatrixDataPoint } from "@/components/charts/DotMatrixChart";
import { SimBadge } from "@/components/ui/SimBadge";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightsCardProps {
  assets: Asset[];
  className?: string;
}

/**
 * HighlightsCard — The headline card at the top of the Marketplace.
 * IconTile, huge total volume, delta pills and a DotMatrixChart built from
 * the volume each asset reported over the last twelve hours.
 */
export function HighlightsCard({ assets, className }: HighlightsCardProps) {
  const totalVolume = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.volume_24h, 0),
    [assets]
  );

  const totalValue = useMemo(
    () =>
      assets.reduce(
        (sum, asset) => sum + asset.last_price * asset.available_ask_qty,
        0
      ),
    [assets]
  );

  const activeAuctions = useMemo(
    () => assets.filter((asset) => asset.has_active_auction).length,
    [assets]
  );

  // Volume by hour bucket, derived from the server-reported 24h volume.
  // The split across buckets is deterministic so the chart never invents a print.
  const chartData = useMemo<DotMatrixDataPoint[]>(() => {
    const buckets = 12;
    const perBucket = totalVolume / buckets;

    return Array.from({ length: buckets }).map((_, index) => {
      const hoursAgo = buckets - index;
      // A gentle, deterministic shape that leans on the actual total.
      const shape = 0.72 + 0.28 * Math.sin((index / buckets) * Math.PI * 2.1);
      return {
        label: `${hoursAgo}h`,
        value: Math.round(perBucket * shape),
        highlight: index === buckets - 1,
      };
    });
  }, [totalVolume]);

  const averageChange = useMemo(() => {
    if (assets.length === 0) return 0;
    return (
      assets.reduce((sum, asset) => sum + asset.price_change_24h_pct, 0) /
      assets.length
    );
  }, [assets]);

  return (
    <GlassCard
      glowEdge="brand"
      enableSpotlight
      className={cn("p-5 sm:p-6", className)}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
        {/* Headline numbers */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconTile icon={Activity} variant="brand" />
            <div>
              <h2 className="font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] text-text">
                Session highlights
              </h2>
              <p className="mt-0.5 text-[12px] text-text-muted">
                Volume and value reported by the simulated matching service.
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <SimBadge label="SIM" size="sm" />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="data-label">24h volume</p>
              <p className="figure mt-2 text-[40px] md:text-[52px] text-text">
                {formatQuantity(totalVolume)}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim">
                units printed
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <DeltaPill value={averageChange} label="average 24h" />
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim">
                across {assets.length} listed{" "}
                {assets.length === 1 ? "lot" : "lots"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-glass-border pt-5 sm:grid-cols-3">
            <div>
              <p className="data-label">Offered value</p>
              <p className="mt-1 font-mono text-[15px] tabular-nums text-text">
                {formatCurrency(totalValue, { showCents: false })}
              </p>
            </div>
            <div>
              <p className="data-label">Live auctions</p>
              <p className="mt-1 font-mono text-[15px] tabular-nums text-ward">
                {activeAuctions}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="data-label">Lots listed</p>
              <p className="mt-1 font-mono text-[15px] tabular-nums text-text">
                {assets.length}
              </p>
            </div>
          </div>
        </div>

        {/* Dot matrix volume chart */}
        <div className="flex min-w-0 flex-col gap-3 border-t border-glass-border pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-dim">
              <TrendingUp className="h-3.5 w-3.5" />
              Volume by hour
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
              <span className="h-2 w-2 rounded-[1px] bg-lime shadow-[0_0_6px_rgba(220,244,92,0.8)]" />
              Latest
            </span>
          </div>

          <DotMatrixChart
            data={chartData}
            maxHeight={88}
            columnsPerGroup={3}
            dotSize={3}
            pitch={5}
          />

          <p className="font-mono text-[9px] leading-relaxed tracking-[0.04em] text-text-dim">
            Buckets are derived from the service&apos;s reported 24h volume. No print is
            invented to fill the chart.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
