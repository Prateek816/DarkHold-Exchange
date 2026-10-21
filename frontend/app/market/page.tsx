"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Asset } from "@/lib/types";
import { AssetCard } from "@/components/market/AssetCard";
import { VolumeHeatmap } from "@/components/market/VolumeHeatmap";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useUiStore } from "@/lib/stores/uiStore";
import {
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  AlertOctagon,
  WifiOff,
  Flame,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketplacePage() {
  const { connectionState } = useUiStore();
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"CHANGE" | "VOLUME" | "PRICE" | "NAME">("CHANGE");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Query assets with 10s poll fallback when disconnected
  const {
    data: assets = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.getAssets(),
    refetchInterval: isDisconnected ? 10000 : 30000,
  });

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (selectedCategory === "ALL") return true;
    return asset.category === selectedCategory;
  });

  // Sort assets
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "CHANGE") {
      comparison = a.price_change_24h_pct - b.price_change_24h_pct;
    } else if (sortBy === "VOLUME") {
      comparison = a.volume_24h - b.volume_24h;
    } else if (sortBy === "PRICE") {
      comparison = a.last_price - b.last_price;
    } else if (sortBy === "NAME") {
      comparison = a.name.localeCompare(b.name);
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });

  const categories = [
    { id: "ALL", label: "All Relics" },
    { id: "FESTIVAL_PASS", label: "Festival Passes" },
    { id: "LIMITED_MERCH", label: "Limited Merch" },
  ];

  return (
    <div className="flex-1 w-full space-y-6">
      {/* Page Title & Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight font-sans">
              Marketplace
            </h1>
            {isDisconnected && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-warning px-2.5 py-1 rounded-pill bg-warning/10 border border-warning/30">
                <WifiOff className="w-3 h-3" />
                <span>REST Poll (10s)</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-muted font-normal pt-1 font-sans">
            Fair-price simulated order books enforced by The Ward price ceiling.
          </p>
        </div>

        {/* Global Controls & Refetch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-pill bg-white/[0.04] border border-glass-border text-xs font-mono text-text-muted hover:text-text hover:bg-white/[0.08] transition-all disabled:opacity-50 shadow-glass-sm"
            title="Refresh assets"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-brand-400", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* Volume Heatmap Highlights Glass Card */}
      {!isLoading && assets.length > 0 && (
        <VolumeHeatmap assets={assets} />
      )}

      {/* Filter & Sort Bar (Glass Pills) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-2">
        {/* Category Glass Pills */}
        <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-pill bg-white/[0.025] border border-glass-border">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-pill transition-all",
                selectedCategory === cat.id
                  ? "bg-white/[0.08] text-text border border-brand-500/40 font-semibold shadow-glow-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Controls as Glass Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim uppercase">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-white/[0.035] border border-glass-border rounded-pill pl-4 pr-8 py-1.5 text-text text-xs font-mono focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
            >
              <option value="CHANGE" className="bg-canvas-elevated text-text">24h Change %</option>
              <option value="VOLUME" className="bg-canvas-elevated text-text">24h Volume</option>
              <option value="PRICE" className="bg-canvas-elevated text-text">Last Price</option>
              <option value="NAME" className="bg-canvas-elevated text-text">Asset Name</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="w-8 h-8 rounded-pill bg-white/[0.035] border border-glass-border text-text-muted hover:text-text flex items-center justify-center transition-colors"
            title={`Toggle sort order (${sortOrder.toUpperCase()})`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading Skeletons matching exact card layout */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-64 w-full rounded-card" />
          ))}
        </div>
      )}

      {/* Error State with Request ID + Retry */}
      {isError && (
        <div
          role="alert"
          className="p-8 rounded-card border border-sell/40 bg-sell/5 text-center space-y-4 font-mono"
        >
          <AlertOctagon className="w-8 h-8 text-sell mx-auto" />
          <h3 className="text-sm font-semibold text-text">Failed to Load Marketplace Assets</h3>
          <p className="text-xs text-text-muted">
            The exchange registry is temporarily unreachable. Reference: REQ-ERR-4912
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 rounded-pill bg-sell hover:bg-sell/90 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(240,80,110,0.3)]"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && sortedAssets.length === 0 && (
        <LineArtEmptyState
          type="NO_ASSETS"
          title="No assets are listed yet"
          description="There are currently no trading instruments matching the selected filter criteria."
          action={
            <button
              onClick={() => setSelectedCategory("ALL")}
              className="px-4 py-1.5 rounded-pill bg-white/[0.04] border border-glass-border text-xs text-text hover:bg-white/[0.08]"
            >
              Reset Filters
            </button>
          }
        />
      )}

      {/* Asset Cards Grid (Top Assets styling) */}
      {!isLoading && !isError && sortedAssets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
