"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { marketDataService } from "@/lib/market-data";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { OdometerPrice } from "@/components/auctions/OdometerPrice";
import { DecayCurveChart } from "@/components/auctions/DecayCurveChart";
import { SimBadge } from "@/components/ui/SimBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ArrowLeft, Check, AlertCircle, Loader2, WifiOff, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuctionDetailViewProps {
  auctionId: string;
}

export function AuctionDetailView({ auctionId }: AuctionDetailViewProps) {
  const queryClient = useQueryClient();
  const { availableCredits, setWalletFromServer } = useWalletStore();
  const { connectionState, addToast } = useUiStore();
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [livePrice, setLivePrice] = useState<number>(25800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWon, setIsWon] = useState(false);
  const isWonRef = useRef(isWon);
  isWonRef.current = isWon;

  const {
    data: auction,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => api.getAuction(auctionId),
  });

  useEffect(() => {
    if (auction) {
      setLivePrice(auction.current_price);
      if (auction.status === "SOLD" && auction.winning_buyer_id === "trader_01") {
        setIsWon(true);
      }
    }
  }, [auction]);

  useEffect(() => {
    const channel = `auction:${auctionId}`;
    marketDataService.subscribe(channel);

    const removeListener = marketDataService.addListener((event, data) => {
      if (event === `auction_price_update:${auctionId}` || event === `auction:${auctionId}`) {
        if (!isWonRef.current && auction?.status === "ACTIVE" && data) {
          const nextPrice = data.current_price || data.price;
          if (typeof nextPrice === "number") {
            setLivePrice(nextPrice);
          }
        }
      }
    });

    return () => {
      marketDataService.unsubscribe(channel);
      removeListener();
    };
  }, [auctionId, auction?.status]);

  if (isLoading || !auction) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-sans text-text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-400" />
        <span className="text-sm">Loading Dutch auction details…</span>
      </div>
    );
  }

  const totalCost = livePrice * auction.qty;
  const isAffordable = availableCredits >= totalCost;
  const isActive = auction.status === "ACTIVE" && !isWon;

  const handleAcceptAuction = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (!isAffordable) {
        throw {
          code: "INSUFFICIENT_FUNDS",
          context: { needed: totalCost, available: availableCredits },
        };
      }

      const res = await api.buyAuction({
        auctionId,
        maxPrice: livePrice,
      });

      const freshWallet = await api.getWallet();
      setWalletFromServer(freshWallet);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });

      setIsWon(true);
      setLivePrice(res.auction.current_price);
      addToast({
        type: "success",
        title: "Auction won",
        message: `Acquired ${res.auction.qty}x ${res.auction.asset_name} at ${formatCurrency(
          res.auction.current_price
        )}. Settled into vault inventory.`,
      });
    } catch (err: any) {
      let message = "Auction transaction could not be processed. Please retry.";

      if (err.code === "INSUFFICIENT_FUNDS") {
        message = `Insufficient funds: you need ${formatCurrency(
          err.context?.needed
        )} but have ${formatCurrency(err.context?.available)} available.`;
      } else if (err.code === "AUCTION_ALREADY_SOLD") {
        message = "Another buyer accepted just before you.";
      } else if (err.code === "PRICE_MOVED") {
        message = "Price moved during submission. Refreshed to the latest tick — retry.";
      } else if (err.message) {
        message = err.message;
      }

      setErrorMessage(message);
      addToast({
        type: "error",
        title: "Acceptance failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell mx-auto w-full max-w-5xl">
      <Link
        href="/auctions"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.025] px-3 py-1.5 font-mono text-[10px] text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text"
      >
        <ArrowLeft className="h-3 w-3" />
        <span>Back to Dutch auctions</span>
      </Link>

      {isDisconnected && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-warning/30 bg-warning/[0.08] p-3.5 text-xs text-warning">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Showing cached auction price. Accept will execute directly via REST.</span>
          </div>
          <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
            REST fallback
          </span>
        </div>
      )}

      <PageHeader
        eyebrow={`Dutch auction · ${auction.auction_id}`}
        title={auction.asset_name}
        description={`Lot size ${formatQuantity(auction.qty)} unit(s) · Seller ${auction.seller_id}`}
        icon={Gavel}
        badge={auction.is_sim_seller ? <SimBadge label="SIM" size="sm" /> : undefined}
        actions={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
              isWon || auction.status === "SOLD"
                ? "border-buy/40 bg-buy/10 text-buy-text"
                : isActive
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-glass-border bg-white/[0.04] text-text-dim"
            )}
          >
            {isActive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
              </span>
            )}
            {isWon ? "Won by you" : auction.status}
          </span>
        }
      />

      <OdometerPrice
        currentPrice={livePrice}
        nextStepSeconds={auction.next_step_in_seconds || 12}
        priceDecrement={auction.price_decrement}
      />

      <DecayCurveChart
        startPrice={auction.start_price}
        floorPrice={auction.floor_price}
        ceilingPrice={auction.ceiling_price}
        currentPrice={livePrice}
        startTime={auction.start_time}
        endTime={auction.end_time}
        height={180}
      />

      <GlassCard glowEdge={isActive ? "teal" : "none"} className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-glass-border pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="data-label block">Total acquisition cost</span>
            <span className="font-display text-[28px] font-semibold leading-none tracking-tight text-text tabular-nums sm:text-[32px]">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="sm:text-right">
            <span className="data-label block">Available balance</span>
            <span
              className={cn(
                "font-mono text-base font-semibold tabular-nums",
                isAffordable ? "text-buy-text" : "text-sell-text"
              )}
            >
              {formatCurrency(availableCredits)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-panel border border-sell/40 bg-sell/[0.08] p-3.5 text-xs text-text">
            <AlertCircle className="h-4 w-4 shrink-0 text-sell" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleAcceptAuction}
          disabled={!isActive || isSubmitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[12px] py-3.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-all sm:text-[13px]",
            isWon
              ? "cursor-default bg-buy/15 text-buy-text"
              : !isActive
              ? "cursor-not-allowed border border-glass-border bg-white/[0.04] text-text-dim"
              : "bg-gradient-to-r from-brand-400 to-brand-500 text-canvas shadow-[0_10px_28px_-8px_rgba(25,203,176,0.5)] hover:-translate-y-px disabled:opacity-50"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transacting on ledger…</span>
            </>
          ) : isWon ? (
            <>
              <Check className="h-4 w-4" />
              <span>Auction successfully won</span>
            </>
          ) : !isActive ? (
            <span>Auction closed</span>
          ) : (
            <span>Accept at current price · {formatCurrency(livePrice)}</span>
          )}
        </button>

        <p className="text-center text-[10.5px] leading-relaxed text-text-dim">
          The displayed price is client-interpolated and display-only. The server matching engine
          holds authoritative final fill truth.
        </p>
      </GlassCard>
    </div>
  );
}
