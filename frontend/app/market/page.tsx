"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AssetCard } from "@/components/market/AssetCard";
import { VolumeHeatmap } from "@/components/market/VolumeHeatmap";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Layers,
  ArrowUpDown,
  RefreshCw,
  AlertOctagon,
  WifiOff,
  Flame,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketplacePage() {
  const { connectionState } = useUiStore();
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"CHANGE" | "VOLUME" | "PRICE" | "NAME">("CHANGE");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const filteredAssets = assets.filter((asset) => {
    if (selectedCategory === "ALL") return true;
    return asset.category === selectedCategory;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "CHANGE") comparison = a.price_change_24h_pct - b.price_change_24h_pct;
    else if (sortBy === "VOLUME") comparison = a.volume_24h - b.volume_24h;
    else if (sortBy === "PRICE") comparison = a.last_price - b.last_price;
    else if (sortBy === "NAME") comparison = a.name.localeCompare(b.name);
    return sortOrder === "desc" ? -comparison : comparison;
  });

  const stats = useMemo(() => {
    const totalVolume = assets.reduce((sum, a) => sum + a.volume_24h, 0);
    const topMover = [...assets].sort(
      (a, b) => b.price_change_24h_pct - a.price_change_24h_pct
    )[0];
    return { totalVolume, topMover };
  }, [assets]);

  const categories = [
    { id: "ALL", label: "All relics" },
    { id: "FESTIVAL_PASS", label: "Festival passes" },
    { id: "LIMITED_MERCH", label: "Limited merch" },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Exchange · Marketplace"
        title="Marketplace"
        description="Fair-price simulated order books, enforced by The Ward price ceiling."
        badge={
          isDisconnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-warning">
              <WifiOff className="h-3 w-3" />
              REST poll · 10s
            </span>
          ) : undefined
        }
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-full border border-glass-border bg-white/[0.035] px-4 py-2 font-mono text-[11px] text-text-muted shadow-glass-sm transition-all hover:border-glass-border-strong hover:bg-white/[0.07] hover:text-text disabled:opacity-50"
            title="Refresh assets"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-brand-400", isFetching && "animate-spin")} />
            <span>{isFetching ? "Syncing…" : "Sync"}</span>
          </button>
        }
      />

      {/* Market summary strip */}
      <Reveal>
        <div className="grid grid-cols-2 divide-y divide-white/[0.07] overflow-hidden rounded-[16px] border border-glass-border bg-white/[0.02] backdrop-blur-md sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {[
            {
              icon: Layers,
              label: "Listed relics",
              value: String(assets.length || "—"),
              tone: "text-brand-400",
            },
            {
              icon: Flame,
              label: "24h volume",
              value: stats.totalVolume ? formatCurrency(stats.totalVolume, { showCents: false }) : "—",
              tone: "text-warning",
            },
            {
              icon: ArrowUpDown,
              label: "Top mover",
              value: stats.topMover
                ? `${stats.topMover.symbol} ${formatPercent(stats.topMover.price_change_24h_pct)}`
                : "—",
              tone: "text-buy-text",
            },
            {
              icon: ShieldCheck,
              label: "Ward status",
              value: "Enforced",
              tone: "text-violet-300",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
              <item.icon className={cn("h-4 w-4 shrink-0", item.tone)} strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  {item.label}
                </p>
                <p className="truncate pt-0.5 font-display text-[13px] font-semibold tracking-tight text-text tabular-nums">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {!isLoading && assets.length > 0 && <VolumeHeatmap assets={assets} />}

      {/* Filter / sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          tabs={categories}
          activeId={selectedCategory}
          onChange={setSelectedCategory}
          size="sm"
          className="no-scrollbar max-w-full overflow-x-auto"
          layoutId="market-category-pill"
        />

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim sm:block">
            Sort
          </span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort assets"
              className="cursor-pointer appearance-none rounded-full border border-glass-border bg-white/[0.035] py-1.5 pl-3.5 pr-8 font-mono text-[11px] text-text transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="CHANGE" className="bg-canvas-elevated text-text">24h Change</option>
              <option value="VOLUME" className="bg-canvas-elevated text-text">24h Volume</option>
              <option value="PRICE" className="bg-canvas-elevated text-text">Last Price</option>
              <option value="NAME" className="bg-canvas-elevated text-text">Asset Name</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/[0.035] text-text-muted transition-colors hover:bg-white/[0.07] hover:text-text"
            title={`Toggle sort order (${sortOrder.toUpperCase()})`}
          >
            <ArrowUpDown className={cn("h-3.5 w-3.5", sortOrder === "asc" && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-[318px] w-full rounded-card" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="space-y-4 rounded-card border border-sell/40 bg-sell/[0.05] p-8 text-center"
        >
          <AlertOctagon className="mx-auto h-8 w-8 text-sell" />
          <h3 className="text-sm font-semibold text-text">Failed to load marketplace assets</h3>
          <p className="font-mono text-xs text-text-muted">
            The exchange registry is temporarily unreachable. Reference: REQ-ERR-4912
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-full bg-sell px-5 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(240,80,110,0.3)] transition-all hover:bg-sell/90"
          >
            Retry connection
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && sortedAssets.length === 0 && (
        <LineArtEmptyState
          type="NO_ASSETS"
          title="No assets listed yet"
          description="There are currently no trading instruments matching the selected filter criteria."
          action={
            <button
              onClick={() => setSelectedCategory("ALL")}
              className="rounded-full border border-glass-border bg-white/[0.04] px-4 py-1.5 text-xs text-text transition-colors hover:bg-white/[0.08]"
            >
              Reset filters
            </button>
          }
        />
      )}

      {/* Asset grid */}
      {!isLoading && !isError && sortedAssets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedAssets.map((asset, i) => (
            <Reveal key={asset.id} delay={Math.min(i * 0.045, 0.27)} y={14}>
              <AssetCard asset={asset} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
