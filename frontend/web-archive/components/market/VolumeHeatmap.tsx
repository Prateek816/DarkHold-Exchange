"use client";

import React, { useState } from "react";
import type { Asset } from "@/lib/types";
import { formatQuantity } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DotMatrixChart } from "@/components/charts/DotMatrixChart";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeHeatmapProps {
  assets: Asset[];
  className?: string;
}

export function VolumeHeatmap({ assets, className }: VolumeHeatmapProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("ALL");

  const hours = Array.from({ length: 12 }, (_, i) => `${12 - i}h`);
  const totalVolume = assets.reduce((sum, a) => sum + a.volume_24h, 0);

  const targetAssets =
    selectedAssetId === "ALL" ? assets : assets.filter((a) => a.id === selectedAssetId);

  const dotColumns = hours.map((hour, hIdx) => {
    let colVol = 0;
    targetAssets.forEach((a, aIdx) => {
      const baseVol = Math.floor(a.volume_24h / 24);
      const synthetic = (Math.sin(aIdx * 3 + hIdx * 1.5) + 1) * baseVol;
      colVol += Math.max(0, Math.round(synthetic));
    });

    return {
      id: hour,
      label: hour,
      value: colVol,
      subLabel: `${formatQuantity(colVol)} units · ${hour} ago`,
    };
  });

  return (
    <GlassCard glowEdge="mint" className={cn("flex flex-col gap-4 p-5 sm:p-6", className)}>
      <div className="flex flex-col justify-between gap-4 border-b border-glass-border pb-4 sm:flex-row sm:items-center">
        <SectionHeader
          icon={<Activity className="h-5.5 w-5.5" />}
          title="Volume distribution"
          subtitle="Cross-asset trading density over the last twelve hours."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] px-3 py-1 font-mono text-[10px]">
            <span className="text-text-muted">24h vol</span>
            <span className="font-bold tabular-nums text-brand-400">
              {formatQuantity(totalVolume)}
            </span>
          </span>

          <SegmentedTabs
            tabs={[
              { id: "ALL", label: "All" },
              ...assets.slice(0, 3).map((a) => ({ id: a.id, label: a.symbol })),
            ]}
            activeId={selectedAssetId}
            onChange={setSelectedAssetId}
            size="sm"
            layoutId="volume-asset-pill"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span>T−12h pipeline volume</span>
          <span className="flex items-center gap-3 normal-case tracking-normal">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400/80" />
              Matched
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_5px_rgba(214,242,74,0.7)]" />
              Latest window
            </span>
          </span>
        </div>

        <DotMatrixChart data={dotColumns} />
      </div>
    </GlassCard>
  );
}
