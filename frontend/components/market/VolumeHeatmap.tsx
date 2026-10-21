"use client";

import React, { useState } from "react";
import { Asset } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DotMatrixChart } from "@/components/charts/DotMatrixChart";
import { Activity, Flame, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeHeatmapProps {
  assets: Asset[];
  className?: string;
}

export function VolumeHeatmap({ assets, className }: VolumeHeatmapProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("ALL");

  const hours = Array.from({ length: 12 }, (_, i) => `${12 - i}h`);

  // Compute aggregate volume
  const totalVolume = assets.reduce((sum, a) => sum + a.volume_24h, 0);

  // Compute dot matrix columns based on active filter
  const targetAssets = selectedAssetId === "ALL"
    ? assets
    : assets.filter((a) => a.id === selectedAssetId);

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
      subLabel: `${colVol} matched units (${hour} ago)`,
    };
  });

  return (
    <GlassCard glowEdge="teal" className={cn("p-6 space-y-5", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass-border pb-4">
        <SectionHeader
          icon={Activity}
          iconVariant="teal"
          title="Exchange Volume Distribution (Last 12 Hours)"
          subtitle="Cross-asset trading density across the simulated settlement pipeline."
        />

        {/* Total volume highlight pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/[0.04] border border-glass-border font-mono text-xs">
            <span className="text-text-muted">24h Vol:</span>
            <span className="font-bold text-brand-400">{totalVolume} units</span>
          </div>

          {/* Quick asset pill filter */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-pill border border-glass-border font-mono text-xs">
            <button
              onClick={() => setSelectedAssetId("ALL")}
              className={cn(
                "px-2.5 py-0.5 rounded-pill transition-colors text-[11px]",
                selectedAssetId === "ALL"
                  ? "bg-brand-500/20 text-brand-400 font-bold border border-brand-500/40"
                  : "text-text-muted hover:text-text"
              )}
            >
              All
            </button>
            {assets.slice(0, 3).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssetId(a.id)}
                className={cn(
                  "px-2 py-0.5 rounded-pill transition-colors text-[11px]",
                  selectedAssetId === a.id
                    ? "bg-brand-500/20 text-brand-400 font-bold border border-brand-500/40"
                    : "text-text-muted hover:text-text"
                )}
              >
                {a.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dot Matrix Heatmap Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-dim">
          <span>T-12h Pipeline Volume</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/[0.85] inline-block" />
            <span>Matched Volume</span>
            <span className="w-2 h-2 rounded-full bg-lime inline-block shadow-[0_0_6px_rgba(214,242,74,0.8)]" />
            <span className="text-lime font-bold">Latest Window</span>
          </span>
        </div>

        <DotMatrixChart columns={dotColumns} maxRows={10} dotSize={3.5} dotPitch={6} />
      </div>
    </GlassCard>
  );
}
