"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { fakeWs } from "@/mocks/fake-websocket";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { OdometerPrice } from "@/components/auctions/OdometerPrice";
import { DecayCurveChart } from "@/components/auctions/DecayCurveChart";
import { SimBadge } from "@/components/ui/SimBadge";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { ArrowLeft, Check, AlertCircle, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuctionDetailViewProps {
  auctionId: string;
}

export function AuctionDetailView({ auctionId }: AuctionDetailViewProps) {
  const { availableCredits, setWalletFromServer } = useWalletStore();
  const { connectionState, addToast } = useUiStore();
  const isDisconnected = connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [livePrice, setLivePrice] = useState<number>(25800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWon, setIsWon] = useState(false);

  // Fetch auction details
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
    }
  }, [auction]);

  // Subscribe to auction WebSocket channel
  useEffect(() => {
    const channel = `auction:${auctionId}`;
    fakeWs.subscribe(channel);

    const removeListener = fakeWs.addListener((event, data) => {
      if (event === `auction_price_update:${auctionId}`) {
        setLivePrice(data.current_price);
      }
    });

    return () => {
      fakeWs.unsubscribe(channel);
      removeListener();
    };
  }, [auctionId]);

  if (isLoading || !auction) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-text-muted font-sans">
        <Loader2 className="w-5 h-5 animate-spin text-brand-400 mr-2" />
        <span>Loading Dutch Auction Details...</span>
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

      // Simulate auction purchase execution
      await new Promise((r) => setTimeout(r, 600));

      // Refresh wallet & auction
      const freshWallet = await api.getWallet();
      setWalletFromServer(freshWallet);
      refetch();

      setIsWon(true);
      addToast({
        type: "success",
        title: "Auction Won!",
        message: `Acquired ${auction.qty}x ${auction.asset_name} at ${formatCurrency(
          livePrice
        )}. Settled into vault inventory.`,
      });
    } catch (err: any) {
      if (err.code === "INSUFFICIENT_FUNDS") {
        setErrorMessage(
          `Insufficient funds: You need ${formatCurrency(err.context?.needed)} but have ${formatCurrency(
            err.context?.available
          )} available.`
        );
      } else if (err.code === "AUCTION_ALREADY_SOLD") {
        setErrorMessage("Another buyer accepted just before you.");
      } else if (err.code === "PRICE_MOVED") {
        setErrorMessage("Price moved during submission. Refreshed to latest tick. Retry.");
      } else {
        setErrorMessage("Auction transaction could not be processed. Please retry.");
      }

      addToast({
        type: "error",
        title: "Acceptance Failed",
        message: errorMessage || "Auction transaction declined.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Back Link */}
      <Link
        href="/auctions"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dutch Auctions</span>
      </Link>

      {/* Disconnected Warning */}
      {isDisconnected && (
        <div className="p-3.5 rounded-16 bg-warning/10 border border-warning/30 flex items-center justify-between text-warning text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Showing cached auction price. Accept will execute directly via REST.</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-warning/40 bg-warning/10">
            REST Fallback
          </span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {auction.asset_name}
            </h1>
            {auction.is_sim_seller && <SimBadge label="SIM" size="sm" />}
          </div>
          <p className="text-text-muted text-xs pt-1">
            Lot Size: {formatQuantity(auction.qty)} unit(s) • Seller: <span className="font-mono text-text-dim">{auction.seller_id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs uppercase font-bold tracking-wider border",
              isWon || auction.status === "SOLD"
                ? "bg-buy-tint text-buy border-buy/40"
                : isActive
                ? "bg-warning/10 text-warning border-warning/40 animate-pulse"
                : "bg-white/[0.04] text-text-dim border-white/8"
            )}
          >
            {isWon ? "WON BY YOU" : auction.status}
          </span>
        </div>
      </div>

      {/* Odometer Price Display */}
      <OdometerPrice
        currentPrice={livePrice}
        nextStepSeconds={auction.next_step_in_seconds || 12}
        priceDecrement={auction.price_decrement}
      />

      {/* Decay Curve SVG Visualization */}
      <DecayCurveChart
        startPrice={auction.start_price}
        floorPrice={auction.floor_price}
        ceilingPrice={auction.ceiling_price}
        currentPrice={livePrice}
        startTime={auction.start_time}
        endTime={auction.end_time}
        height={180}
      />

      {/* Transaction Acceptance Box */}
      <div className="relative rounded-24 border border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-white/[0.01] p-6 sm:p-8 backdrop-blur-[18px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] space-y-5">
        {/* Top hairline highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <span className="text-[10px] uppercase font-medium tracking-wider text-text-dim block">
              Total Acquisition Cost
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-sans text-white tabular-nums">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] uppercase font-medium tracking-wider text-text-dim block">
              Available Balance
            </span>
            <span
              className={cn("text-base font-semibold tabular-nums", isAffordable ? "text-buy" : "text-sell")}
            >
              {formatCurrency(availableCredits)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-16 bg-sell-tint border border-sell/40 text-text text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-sell shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleAcceptAuction}
          disabled={!isActive || isSubmitting}
          className={cn(
            "w-full py-3.5 rounded-12 font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            isWon
              ? "bg-buy text-white cursor-default"
              : !isActive
              ? "bg-white/[0.04] text-text-dim border border-white/8 cursor-not-allowed"
              : "bg-brand-500 hover:bg-brand-400 text-bg shadow-[0_0_24px_rgba(25,203,176,0.35)] disabled:opacity-50"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transacting on Ledger...</span>
            </>
          ) : isWon ? (
            <>
              <Check className="w-4 h-4" />
              <span>Auction Successfully Won</span>
            </>
          ) : !isActive ? (
            <span>Auction Closed</span>
          ) : (
            <span>Accept at Current Price ({formatCurrency(livePrice)})</span>
          )}
        </button>

        <p className="text-[11px] text-text-dim text-center">
          The displayed price is client-interpolated and display-only. Server matching engine holds authoritative final fill truth.
        </p>
      </div>
    </div>
  );
}
