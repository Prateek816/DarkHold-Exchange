"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { CreateAuctionModal } from "@/components/auctions/CreateAuctionModal";
import { SimBadge } from "@/components/ui/SimBadge";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { PillButton, IconButton } from "@/components/ui/PillButton";
import { formatCurrency, formatQuantity, formatTimestamp } from "@/lib/format";
import { IconTile } from "@/components/ui/IconTile";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Gavel,
  Hourglass,
  Plus,
  RefreshCw,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All lots" },
  { id: "ACTIVE", label: "On the block" },
  { id: "SOLD", label: "Sold" },
  { id: "EXPIRED", label: "Expired" },
  { id: "CANCELLED", label: "Withdrawn" },
];

function statusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-warning/40 bg-warning-tint text-warning";
    case "SOLD":
      return "border-buy/40 bg-buy-tint text-buy";
    default:
      return "border-glass-border bg-white/[0.03] text-text-dim";
  }
}

export default function AuctionsPage() {
  const { holdings } = useWalletStore();
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    data: auctions = [],
    isLoading,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => api.getAuctions(),
    refetchInterval: 5_000,
  });

  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: auctions.length };
    for (const auction of auctions) {
      result[auction.status] = (result[auction.status] ?? 0) + 1;
    }
    return result;
  }, [auctions]);

  const filteredAuctions = auctions.filter(
    (auction) => selectedStatus === "ALL" || auction.status === selectedStatus
  );

  const activeLots = auctions.filter((auction) => auction.status === "ACTIVE");
  const activeUnits = activeLots.reduce((sum, auction) => sum + auction.qty, 0);
  const lowestActive = activeLots.reduce<number | null>(
    (lowest, auction) =>
      lowest === null ? auction.current_price : Math.min(lowest, auction.current_price),
    null
  );

  const tabs = STATUS_FILTERS.map((filter) => ({
    ...filter,
    badge: counts[filter.id] ?? 0,
  }));

  return (
    <div className="page-shell">
      <PageHeader
        title="The Dutch room"
        description="Here the price falls on a schedule. Each lot opens at its ceiling and steps down toward a stated floor until someone accepts, the clock expires, or the seller withdraws."
        icon={Gavel}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ward/40 bg-ward-tint px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ward">
            <Hourglass className="h-3 w-3" />
            Descending price
          </span>
        }
        actions={
          <>
            <PillButton
              variant="outlined"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              leftIcon={
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              }
            >
              {isFetching ? "Reading" : "Refresh"}
            </PillButton>

            <PillButton
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              List a lot
            </PillButton>
          </>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Active lots",
            value: String(activeLots.length).padStart(2, "0"),
            note: "Accepting bids",
            icon: Gavel,
            variant: "amber" as const,
          },
          {
            label: "Units on the block",
            value: formatQuantity(activeUnits),
            note: "Reserved by sellers",
            icon: Hourglass,
            variant: "mint" as const,
          },
          {
            label: "Lowest open price",
            value: lowestActive === null ? "—" : formatCurrency(lowestActive, { showCents: false }),
            note: "Current tick",
            icon: ArrowDownRight,
            variant: "brand" as const,
          },
          {
            label: "Board read",
            value: dataUpdatedAt ? formatTimestamp(dataUpdatedAt) : "—",
            note: "Server reprices on read",
            icon: ArrowUpRight,
            variant: "mint" as const,
          },
        ].map((item, index) => (
          <div key={item.label} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <IconTile icon={item.icon} variant={item.variant} size="sm" />
              <span className="data-label truncate">{item.label}</span>
            </div>
            <span className="figure text-[25px] text-text">
              {item.value}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
              {item.note}
            </span>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          tabs={tabs}
          activeId={selectedStatus}
          onChange={setSelectedStatus}
          size="sm"
          layoutId="auction-status-pill"
        />

        <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          {filteredAuctions.length} lot{filteredAuctions.length === 1 ? "" : "s"} shown
        </span>
      </div>

      {/* Loading skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      ) : filteredAuctions.length === 0 ? (
        <LineArtEmptyState
          variant="no-auctions"
          message="Nothing on the board matches this filter. Try another state, or list a lot from your own vault."
          action={
            <PillButton
              variant="outlined"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              List a lot
            </PillButton>
          }
        />
      ) : (
        <div className="border-y border-glass-border divide-y divide-glass-border">
          {filteredAuctions.map((auction) => {
            const isActive = auction.status === "ACTIVE";
            const isOwnLot = auction.seller_id === "trader_01";

            return (
              <Link
                key={auction.auction_id}
                href={`/auctions/${auction.auction_id}`}
                className={cn(
                  "group relative block p-5 transition-colors hover:bg-white/[0.03]",
                  "lg:grid lg:grid-cols-[64px_minmax(0,1.65fr)_112px_92px_140px_minmax(150px,1fr)_36px] lg:items-center lg:gap-4",
                  !isActive && "opacity-80"
                )}
              >
                <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-dim lg:block">
                  {auction.auction_id.replace("AUC-", "")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[13.5px] font-medium text-text transition-colors group-hover:text-brand-300">
                      {auction.asset_name}
                    </h2>
                    {auction.is_sim_seller && <SimBadge label="SIM SELLER" size="sm" />}
                    {isOwnLot && (
                      <span className="inline-flex items-center rounded-pill border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-brand-300">
                        Your lot
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.06em] text-text-dim">
                    {auction.asset_id} · seller {auction.seller_id} · {auction.step_seconds}s steps
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:hidden">
                    <span className="font-mono text-[17px] tabular-nums text-text">
                      {formatCurrency(auction.current_price)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-pill border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]",
                        statusStyle(auction.status)
                      )}
                    >
                      {auction.status === "CANCELLED" ? "Withdrawn" : auction.status}
                    </span>
                  </div>
                </div>

                <span className="hidden lg:block">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]",
                      statusStyle(auction.status)
                    )}
                  >
                    {auction.status === "CANCELLED" ? "Withdrawn" : auction.status}
                  </span>
                </span>

                <span className="hidden font-mono text-[11px] tabular-nums text-text-muted lg:block">
                  {formatQuantity(auction.qty)} unit{auction.qty === 1 ? "" : "s"}
                </span>

                <div className="hidden lg:block">
                  <span className="block font-mono text-[12.5px] tabular-nums text-text">
                    {formatCurrency(auction.current_price)}
                  </span>
                  {isActive ? (
                    <span className="mt-0.5 flex items-center gap-1 font-mono text-[8.5px] text-warning">
                      <ArrowDownRight className="h-2.5 w-2.5" />
                      −{formatCurrency(auction.price_decrement, { showCents: false })} / step
                    </span>
                  ) : (
                    <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
                      Final tick
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-glass-border/60 pt-3 font-mono text-[9.5px] text-text-dim lg:mt-0 lg:block lg:border-0 lg:pt-0">
                  <span className="lg:block">
                    Floor{" "}
                    <span className="tabular-nums text-text-muted">
                      {formatCurrency(auction.floor_price, { showCents: false })}
                    </span>
                  </span>
                  <span className="lg:mt-0.5 lg:block">
                    Cap{" "}
                    <span className="tabular-nums text-ward">
                      {formatCurrency(auction.ceiling_price, { showCents: false })}
                    </span>
                  </span>
                  <span className="lg:hidden">
                    Qty {formatQuantity(auction.qty)}
                  </span>
                </div>

                <span className="hidden justify-self-end text-text-dim transition-all group-hover:translate-x-0.5 group-hover:text-brand-400 lg:block">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 border-t border-glass-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <p className="font-mono text-[9px] leading-relaxed tracking-[0.03em] text-text-dim">
          <span className="text-text-muted">Reading the board.</span> Prices come from the mock
          server and are recomputed whenever this page polls. No client-side countdown changes an
          amount you can accept.
        </p>
        <p className="font-mono text-[9px] leading-relaxed tracking-[0.03em] text-text-dim">
          <span className="text-text-muted">Acceptance is final.</span> The server checks the
          current tick and your available credits before it moves anything. A moved price returns
          an error rather than a fill.
        </p>
        <p className="font-mono text-[9px] leading-relaxed tracking-[0.03em] text-text-dim">
          <span className="text-text-muted">Fictional venue.</span> Sellers, buyers, credits and
          receipts are simulated. Ceilings are enforced by this demo, not by a real box office.
        </p>
      </div>

      <CreateAuctionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        holdings={holdings}
        onAuctionCreated={() => refetch()}
      />
    </div>
  );
}