"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { CreateAuctionModal } from "@/components/auctions/CreateAuctionModal";
import { SimBadge } from "@/components/ui/SimBadge";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { Gavel, ArrowDownRight, Plus, RefreshCw, Hourglass, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuctionsPage() {
  const { holdings } = useWalletStore();
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: auctions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["auctions"],
    queryFn: () => api.getAuctions(),
  });

  const filteredAuctions = auctions.filter((a) => {
    if (selectedStatus === "ALL") return true;
    return a.status === selectedStatus;
  });

  const statuses = [
    { id: "ALL", label: "All auctions" },
    { id: "ACTIVE", label: "Active drops" },
    { id: "SOLD", label: "Sold out" },
    { id: "EXPIRED", label: "Concluded" },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Exchange · Dutch auctions"
        title="Dutch Auctions"
        description="Prices start at the peak ceiling and tick downward continuously until accepted or the floor is reached."
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/25 bg-brand-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-brand-400">
            <Hourglass className="h-3 w-3" />
            Decaying price protocol
          </span>
        }
        actions={
          <>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.04] px-3.5 py-2 font-mono text-[11px] text-text-muted transition-colors hover:bg-white/[0.07] hover:text-text disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              <span>Sync</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-brand-400 to-brand-500 px-4 py-2 text-[11.5px] font-bold text-canvas shadow-[0_8px_24px_-8px_rgba(25,203,176,0.6)] transition-all hover:-translate-y-px"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Launch auction</span>
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          tabs={statuses}
          activeId={selectedStatus}
          onChange={setSelectedStatus}
          size="sm"
          layoutId="auction-status-pill"
        />

        <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim sm:flex">
          <Gavel className="h-3 w-3" />
          {filteredAuctions.length} lots
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-[268px] rounded-card" />
          ))}
        </div>
      ) : filteredAuctions.length === 0 ? (
        <LineArtEmptyState
          type="NO_AUCTIONS"
          title="No auctions found"
          description="There are currently no Dutch auction drops matching the filter criteria."
          action={
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-[12px] border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-text transition-colors hover:bg-white/[0.09]"
            >
              Launch new drop
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAuctions.map((auction, i) => {
            const isActive = auction.status === "ACTIVE";

            return (
              <Reveal key={auction.auction_id} delay={Math.min(i * 0.06, 0.3)} y={16}>
                <Link
                  href={`/auctions/${auction.auction_id}`}
                  className={cn(
                    "group relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-card border border-glass-border p-6",
                    "bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] shadow-glass backdrop-blur-[18px]",
                    "transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-glass-lg",
                    !isActive && "opacity-80"
                  )}
                >
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
                          isActive
                            ? "border-warning/35 bg-warning/10 text-warning"
                            : auction.status === "SOLD"
                            ? "border-buy/35 bg-buy/10 text-buy-text"
                            : "border-glass-border bg-white/[0.04] text-text-dim"
                        )}
                      >
                        {isActive && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                          </span>
                        )}
                        {auction.status}
                      </span>

                      {auction.is_sim_seller && <SimBadge label="SIM" size="sm" />}
                    </div>

                    <div>
                      <h3 className="truncate text-[15px] font-semibold tracking-tight text-text transition-colors group-hover:text-brand-300">
                        {auction.asset_name}
                      </h3>
                      <p className="pt-0.5 font-mono text-[10.5px] text-text-muted">
                        Lot size · {formatQuantity(auction.qty)} unit(s)
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-panel border border-glass-border bg-white/[0.025] p-4 transition-colors group-hover:border-glass-border-strong">
                      <div>
                        <span className="data-label block">Current price</span>
                        <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-text tabular-nums transition-colors group-hover:text-brand-400">
                          {formatCurrency(auction.current_price)}
                        </span>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-warning">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          <span className="tabular-nums">
                            −{formatCurrency(auction.price_decrement)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-glass-border pt-3 font-mono text-[10px] text-text-muted">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">
                        Start {formatCurrency(auction.start_price, { showCents: false })}
                      </span>
                      <span className="h-0.5 w-0.5 rounded-full bg-text-dim" />
                      <span className="tabular-nums">
                        Floor {formatCurrency(auction.floor_price, { showCents: false })}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-brand-400 transition-transform group-hover:translate-x-0.5">
                      Inspect <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}

      <CreateAuctionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        holdings={holdings}
        onAuctionCreated={() => refetch()}
      />
    </div>
  );
}
