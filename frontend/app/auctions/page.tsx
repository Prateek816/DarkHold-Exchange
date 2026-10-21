"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { CreateAuctionModal } from "@/components/auctions/CreateAuctionModal";
import { SimBadge } from "@/components/ui/SimBadge";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { DutchAuction } from "@/lib/types";
import { Gavel, Clock, ArrowDownRight, Plus, RefreshCw, Hourglass } from "lucide-react";
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
    { id: "ALL", label: "All Auctions" },
    { id: "ACTIVE", label: "Active Drops" },
    { id: "SOLD", label: "Sold Out" },
    { id: "EXPIRED", label: "Concluded" },
  ];

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dutch Auctions
            </h1>
            <span className="text-[11px] uppercase tracking-wider text-brand-400 px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center gap-1 font-medium">
              <Hourglass className="w-3 h-3" />
              <span>Decaying Price Protocol</span>
            </span>
          </div>
          <p className="text-xs text-text-muted pt-1">
            Prices start at peak ceiling and tick downwards continuously until accepted or floor reached.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-12 bg-white/[0.04] border border-white/10 text-xs font-medium text-text-muted hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-12 bg-brand-500 hover:bg-brand-400 text-bg font-semibold text-xs transition-all shadow-[0_0_18px_rgba(25,203,176,0.35)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Auction</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStatus(s.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              selectedStatus === s.id
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/35 shadow-[0_0_12px_rgba(25,203,176,0.2)]"
                : "bg-white/[0.03] text-text-muted border border-white/8 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
        <LineArtEmptyState
          type="NO_AUCTIONS"
          title="No Active Auctions Found"
          description="There are currently no Dutch auction drops matching the filter criteria."
          action={
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-12 bg-white/[0.05] border border-white/10 text-xs text-white hover:bg-white/10 transition-colors"
            >
              Launch New Drop
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAuctions.map((auction) => {
            const isActive = auction.status === "ACTIVE";

            return (
              <Link
                key={auction.auction_id}
                href={`/auctions/${auction.auction_id}`}
                className={cn(
                  "relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-white/[0.01] backdrop-blur-[18px] p-6 hover:border-brand-500/40 hover:from-white/[0.07] transition-all duration-300 flex flex-col justify-between space-y-5 group shadow-[0_16px_36px_-15px_rgba(0,0,0,0.7)]",
                  !isActive && "opacity-75"
                )}
              >
                {/* Top hairline highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                <div className="space-y-4">
                  {/* Status & Sim Badge Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                        isActive
                          ? "bg-warning/10 text-warning border-warning/35 animate-pulse"
                          : auction.status === "SOLD"
                          ? "bg-buy-tint text-buy border-buy/35"
                          : "bg-white/[0.04] text-text-dim border-white/8"
                      )}
                    >
                      {auction.status}
                    </span>

                    {auction.is_sim_seller && <SimBadge label="SIM" size="sm" />}
                  </div>

                  {/* Title & Asset */}
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                      {auction.asset_name}
                    </h3>
                    <p className="text-[11px] text-text-muted pt-0.5">
                      Lot Size: {formatQuantity(auction.qty)} unit(s)
                    </p>
                  </div>

                  {/* Live Price Odometer preview */}
                  <div className="p-4 rounded-16 bg-white/[0.03] border border-white/8 flex items-center justify-between group-hover:border-white/12 transition-colors">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-dim block">
                        Current Price
                      </span>
                      <span className="text-2xl font-bold font-sans text-white group-hover:text-brand-400 tabular-nums transition-colors">
                        {formatCurrency(auction.current_price)}
                      </span>
                    </div>
                    {isActive && (
                      <div className="text-right text-[11px] text-warning flex items-center gap-1 font-mono">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span className="tabular-nums">-{formatCurrency(auction.price_decrement)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Bounds & Link */}
                <div className="pt-3 border-t border-white/6 flex items-center justify-between text-[11px] text-text-muted font-mono">
                  <div>
                    <span className="tabular-nums">Start: {formatCurrency(auction.start_price, { showCents: false })}</span>
                    <span className="mx-2 text-white/20">•</span>
                    <span className="tabular-nums">Floor: {formatCurrency(auction.floor_price, { showCents: false })}</span>
                  </div>
                  <span className="text-brand-400 font-sans font-medium text-xs group-hover:translate-x-0.5 transition-transform">
                    Inspect &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Auction Modal */}
      <CreateAuctionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        holdings={holdings}
        onAuctionCreated={() => refetch()}
      />
    </div>
  );
}
