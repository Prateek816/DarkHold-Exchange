"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronDown,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { SimBadge } from "@/components/ui/SimBadge";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PillButton, SearchField } from "@/components/ui/PillButton";
import { AssetCard } from "@/components/market/AssetCard";
import { HighlightsCard } from "@/components/market/HighlightsCard";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatCurrency, formatDataAge } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";

type SortKey = "PRICE" | "CHANGE" | "HEADROOM" | "SYMBOL";

const CATEGORY_LABELS: Record<Asset["category"], string> = {
  FESTIVAL_PASS: "Festival pass",
  LIMITED_MERCH: "Limited merch",
  VIP_EXPERIENCE: "VIP experience",
};

const CATEGORIES = [
  { id: "ALL", label: "All lots" },
  { id: "FESTIVAL_PASS", label: "Passes" },
  { id: "LIMITED_MERCH", label: "Objects" },
  { id: "VIP_EXPERIENCE", label: "VIP" },
];

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: "CHANGE", label: "24h change" },
  { id: "PRICE", label: "Last price" },
  { id: "HEADROOM", label: "Ceiling headroom" },
  { id: "SYMBOL", label: "Symbol" },
];

function headroom(asset: Asset) {
  return asset.ceiling_price - asset.last_price;
}

function spread(asset: Asset) {
  if (asset.best_bid === undefined || asset.best_ask === undefined) return null;
  return asset.best_ask - asset.best_bid;
}

export default function MarketplacePage() {
  const { connectionState } = useUiStore();
  const isDisconnected =
    connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("CHANGE");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const {
    data: assets = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.getAssets(),
    refetchInterval: isDisconnected ? 10_000 : 30_000,
  });

  const categoryTabs = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        badge:
          category.id === "ALL"
            ? assets.length
            : assets.filter((asset) => asset.category === category.id).length,
      })),
    [assets]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (selectedCategory !== "ALL" && asset.category !== selectedCategory) return false;
      if (!needle) return true;
      return [asset.name, asset.symbol, asset.id, CATEGORY_LABELS[asset.category]]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [assets, query, selectedCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "PRICE") comparison = a.last_price - b.last_price;
      else if (sortBy === "CHANGE")
        comparison = a.price_change_24h_pct - b.price_change_24h_pct;
      else if (sortBy === "HEADROOM") comparison = headroom(a) - headroom(b);
      else comparison = a.symbol.localeCompare(b.symbol);
      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [filtered, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const volume = assets.reduce((sum, asset) => sum + asset.volume_24h, 0);
    const underCap = assets.filter((asset) => asset.last_price <= asset.ceiling_price).length;
    const newest = assets.reduce(
      (latest, asset) => Math.max(latest, asset.last_price_timestamp || 0),
      0
    );
    const spreadSum = assets.reduce(
      (sum, asset) => sum + (spread(asset) ?? 0),
      0
    );
    return { volume, underCap, newest, spread: spreadSum };
  }, [assets]);

  const newestAge = formatDataAge(stats.newest || undefined);

  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.id === sortBy)?.label ?? "24h change";

  return (
    <div className="page-shell">
      <PageHeader
        title="The board"
        description="A ledger of simulated festival passes and objects. Every quote, depth figure and print comes from the mock order service."
        icon={Layers}
        badge={<SimBadge label="Simulated venue" size="md" />}
        actions={
          <PillButton
            variant="outlined"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            }
          >
            {isFetching ? "Syncing" : "Refresh"}
          </PillButton>
        }
      />

      {/* Disconnected notice */}
      {isDisconnected && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-panel border border-warning/30 bg-warning-tint px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-warning"
        >
          <WifiOff className="h-3.5 w-3.5" />
          Feed {connectionState.toLowerCase()} · polling REST every 10s · figures may lag
        </div>
      )}

      {/* Highlights */}
      {isLoading ? (
        <div className="glass-card h-[260px] animate-pulse" />
      ) : (
        <HighlightsCard assets={assets} />
      )}

      {/* Filter + sort utilities row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs
          tabs={categoryTabs}
          activeId={selectedCategory}
          onChange={setSelectedCategory}
          layoutId="market-category"
          size="sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Filter by name or symbol…"
            showShortcut={false}
            className="w-full sm:w-64"
          />

          {/* Sort dropdown — glass pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              aria-expanded={showSortMenu}
              aria-haspopup="listbox"
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-glass-border bg-white/[0.03] px-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:border-glass-border-strong hover:text-text"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {activeSortLabel}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  showSortMenu && "rotate-180"
                )}
              />
            </button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-card border border-glass-border bg-canvas-elevated/95 shadow-card backdrop-blur-xl"
                  role="listbox"
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={sortBy === option.id}
                      onClick={() => {
                        setSortBy(option.id);
                        setShowSortMenu(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] transition-colors hover:bg-white/[0.05]",
                        sortBy === option.id
                          ? "text-brand-300"
                          : "text-text-muted hover:text-text"
                      )}
                    >
                      {option.label}
                      {sortBy === option.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(124,92,255,0.8)]" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-glass-border p-2">
                    <SegmentedTabs
                      tabs={[
                        { id: "desc", label: "Highest first" },
                        { id: "asc", label: "Lowest first" },
                      ]}
                      activeId={sortOrder}
                      onChange={(id) => setSortOrder(id as "asc" | "desc")}
                      layoutId="market-sort-order"
                      size="sm"
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Board summary row */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Lots listed",
            value: isLoading ? "—" : String(assets.length).padStart(2, "0"),
            note: "Mock registry",
          },
          {
            label: "24h units",
            value: isLoading ? "—" : stats.volume.toLocaleString("en-US"),
            note: "Simulated only",
          },
          {
            label: "Within ceiling",
            value: isLoading ? "—" : `${stats.underCap}/${assets.length}`,
            note: "Checked by The Ward",
          },
          {
            label: "Latest print",
            value: isLoading ? "—" : newestAge.text,
            note: newestAge.isStale ? "Stale" : "Fresh",
            warn: newestAge.isStale,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-panel border border-glass-border bg-white/[0.02] px-4 py-3.5"
          >
            <dt className="data-label">{item.label}</dt>
            <dd className="mt-1.5 figure text-[19px] text-text">
              {item.value}
            </dd>
            <dd
              className={cn(
                "mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em]",
                item.warn ? "text-warning" : "text-text-dim"
              )}
            >
              {item.note}
            </dd>
          </div>
        ))}
      </dl>

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-panel border border-sell/35 bg-sell-tint p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-sell">
              The board could not be read
            </p>
            <p className="mt-1 text-[12.5px] text-text-muted">
              The asset service did not respond. Reference REQ-{"—"}
            </p>
          </div>
          <PillButton variant="outlined" size="sm" onClick={() => refetch()}>
            Try again
          </PillButton>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && sorted.length === 0 && (
        <LineArtEmptyState
          variant={assets.length === 0 ? "no-auctions" : "thin-market"}
          message={
            assets.length === 0
              ? "The mock registry returned no instruments. Nothing has been invented to fill the board."
              : "Clear the search or choose another category. The filters only narrow the server snapshot."
          }
          action={
            assets.length > 0 ? (
              <PillButton
                variant="outlined"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSelectedCategory("ALL");
                }}
              >
                Reset filters
              </PillButton>
            ) : undefined
          }
        />
      )}

      {/* Asset grid */}
      {!isLoading && !isError && sorted.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sorted.map((asset, index) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Board notes */}
      <section className="grid grid-cols-1 gap-6 border-t border-glass-border pt-6 sm:grid-cols-3">
        {[
          {
            label: "Minor units",
            body: "Prices are integer minor units on the wire. $1.00 is stored as 100, and tabular figures are rendered for every ledger value.",
          },
          {
            label: "The Ward",
            body: "A limit price above the resale ceiling is rejected before reservation. Ceiling headroom is last print subtracted from that cap, not a valuation.",
          },
          {
            label: "No hidden liquidity",
            body: "Bid, ask and offer depth are the mock order service's current snapshot. Nothing on this page is aggregated from an external venue.",
          },
        ].map((note) => (
          <div key={note.label}>
            <h2 className="eyebrow">{note.label}</h2>
            <p className="pt-2 text-[11px] leading-[1.7] text-text-muted">{note.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
