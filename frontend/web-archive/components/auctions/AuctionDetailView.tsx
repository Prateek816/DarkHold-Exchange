"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, describeApiError } from "@/lib/api-client";
import { fakeWs } from "@/mocks/fake-websocket";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { OdometerPrice } from "@/components/auctions/OdometerPrice";
import { DecayCurveChart } from "@/components/auctions/DecayCurveChart";
import { SettlementReceiptModal } from "@/components/portfolio/SettlementReceiptModal";
import { SimBadge } from "@/components/ui/SimBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { formatErrorMessage } from "@/lib/errors";
import type { ApiErrorPayload } from "@/lib/errors";
import type { TransactionReceipt } from "@/lib/types";
import { USE_MOCK, DEMO_ACCOUNT_LABEL } from "@/lib/config";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Gavel,
  Loader2,
  Lock,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuctionDetailViewProps {
  auctionId: string;
}

function lotStatusLabel(status: string) {
  if (status === "CANCELLED") return "Withdrawn";
  return status;
}

export function AuctionDetailView({ auctionId }: AuctionDetailViewProps) {
  const { availableCredits, hasLoaded, setWalletFromServer } = useWalletStore();
  const { connectionState, addToast } = useUiStore();
  const queryClient = useQueryClient();
  const isDisconnected =
    connectionState === "DISCONNECTED" || connectionState === "RECONNECTING";

  const [feedPrice, setFeedPrice] = useState<number | null>(null);
  const [feedNextStep, setFeedNextStep] = useState<number | null>(null);
  const [feedStatus, setFeedStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptedReceipt, setAcceptedReceipt] = useState<TransactionReceipt | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);

  // Refs to track last synced auction data to avoid cascading renders
  const lastSyncedPriceRef = useRef<number | null>(null);
  const lastSyncedStepRef = useRef<number | null>(null);
  const lastSyncedStatusRef = useRef<string | null>(null);

  const {
    data: auction,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => api.getAuction(auctionId),
  });

  useEffect(() => {
    if (!auction) return;
    // Only sync when auction data actually changes
    if (lastSyncedPriceRef.current !== auction.current_price) {
      lastSyncedPriceRef.current = auction.current_price;
      setFeedPrice(auction.current_price);
    }
    if (lastSyncedStepRef.current !== auction.next_step_in_seconds) {
      lastSyncedStepRef.current = auction.next_step_in_seconds;
      setFeedNextStep(auction.next_step_in_seconds);
    }
    if (lastSyncedStatusRef.current !== auction.status) {
      lastSyncedStatusRef.current = auction.status;
      setFeedStatus(auction.status);
    }
  }, [auction]);

  useEffect(() => {
    if (!USE_MOCK) return;
    const channel = `auction:${auctionId}`;
    fakeWs.subscribe(channel);

    const removeListener = fakeWs.addListener((event, data) => {
      if (event !== `auction_price_update:${auctionId}`) return;
      setFeedPrice(data.current_price);
      setFeedNextStep(data.next_step_in_seconds);
      setFeedStatus(data.status);
      if (data.status && data.status !== "ACTIVE") {
        queryClient.invalidateQueries({ queryKey: ["auction", auctionId] });
        queryClient.invalidateQueries({ queryKey: ["auctions"] });
      }
    });

    return () => {
      fakeWs.unsubscribe(channel);
      removeListener();
    };
  }, [auctionId, queryClient]);

  const livePrice = feedPrice ?? auction?.current_price ?? 0;
  const effectiveStatus = feedStatus ?? auction?.status ?? "ACTIVE";
  const isOwnLot = auction?.seller_id === DEMO_ACCOUNT_LABEL;
  const isActive =
    effectiveStatus === "ACTIVE" && !hasAccepted && !acceptedReceipt && !isOwnLot;
  const totalCost = livePrice * (auction?.qty ?? 0);
  const isAffordable = hasLoaded && availableCredits >= totalCost;

  const refusalReason = useMemo(() => {
    if (isOwnLot) {
      return "This is your own lot. The mock server refuses self-acceptance.";
    }
    if (hasAccepted || acceptedReceipt) {
      return "This lot has been accepted. Nothing further can be purchased.";
    }
    if (effectiveStatus === "SOLD") {
      return "Another buyer accepted this lot first.";
    }
    if (effectiveStatus === "EXPIRED") {
      return "The clock expired before the lot was accepted.";
    }
    if (effectiveStatus === "CANCELLED") {
      return "The seller withdrew this lot.";
    }
    return null;
  }, [isOwnLot, hasAccepted, acceptedReceipt, effectiveStatus]);

  const handleAcceptAuction = async () => {
    if (!auction || !isActive) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const receipt = await api.acceptAuction(auction.auction_id, livePrice);

      const freshWallet = await api.getWallet();
      setWalletFromServer(freshWallet);
      setAcceptedReceipt(receipt);
      setHasAccepted(true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auction", auctionId] }),
        queryClient.invalidateQueries({ queryKey: ["auctions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["receipts"] }),
      ]);

      addToast({
        type: "success",
        title: "Lot accepted",
        message: `${formatQuantity(receipt.qty)}x ${receipt.asset_name} at ${formatCurrency(
          receipt.price
        )}. The mock server recorded ${formatCurrency(
          receipt.total_cost
        )} and issued a receipt.`,
      });
    } catch (caught) {
      const apiError = caught as Partial<ApiErrorPayload>;
      const code = apiError?.code;

      if (code === "PRICE_MOVED" && apiError.context?.current_price) {
        setFeedPrice(apiError.context.current_price);
      }
      if (code === "AUCTION_ALREADY_SOLD" || code === "AUCTION_NOT_ACTIVE") {
        await refetch();
      }

      const message = code
        ? formatErrorMessage(code, apiError.context)
        : "The acceptance could not be completed. Nothing was purchased.";

      setErrorMessage(message);
      addToast({
        type: "error",
        title: "Acceptance refused",
        message,
        requestId: apiError.requestId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[50vh] items-center justify-center gap-2 border border-glass-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-text-dim">
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
          Reading lot from the mock server…
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="page-shell mx-auto w-full max-w-3xl">
        <Link
          href="/auctions"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          All lots
        </Link>
        <div className="border border-glass-border bg-surface p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center border border-glass-border text-text-dim">
            <Gavel className="h-5 w-5" />
          </span>
          <h1 className="pt-4 font-display text-[32px] leading-none text-text">
            This lot is not on the board
          </h1>
          <p className="mx-auto max-w-md pt-2 text-[12px] leading-relaxed text-text-muted">
            {isError
              ? describeApiError(error)
              : `No auction with the id ${auctionId} exists in the current mock ledger. It may have been a local lot from a previous session.`}
          </p>
          <Link
            href="/auctions"
            className="mt-5 inline-flex border border-brand-500/45 bg-brand-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-brand-300 hover:bg-brand-500/15"
          >
            Return to the sale room
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link
        href="/auctions"
        className="inline-flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3 w-3" />
        All lots
      </Link>

      {isDisconnected && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-warning/35 bg-warning/[0.08] p-3 font-mono text-[10px] text-warning">
          <span className="flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5" />
            Price feed is offline. The last server quote is shown; acceptance still goes through
            REST and may be refused if the price moved.
          </span>
          <span className="uppercase tracking-[0.1em]">REST fallback</span>
        </div>
      )}

      <PageHeader
        title={auction.asset_name}
        description={`${formatQuantity(auction.qty)} unit${
          auction.qty === 1 ? "" : "s"
        } from ${auction.seller_id} · ${auction.step_seconds}s price steps · the server holds final price and fill truth.`}
        icon={Gavel}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-glass-border bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] tracking-[0.06em] text-text-muted">
              {auction.auction_id}
            </span>
            <span
              className={cn(
                "rounded-pill border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
                effectiveStatus === "ACTIVE"
                  ? "border-warning/40 bg-warning-tint text-warning"
                  : effectiveStatus === "SOLD"
                  ? "border-buy/40 bg-buy-tint text-buy"
                  : "border-glass-border bg-white/[0.03] text-text-dim"
              )}
            >
              {lotStatusLabel(effectiveStatus)}
            </span>
            {auction.is_sim_seller && <SimBadge label="SIM SELLER" size="sm" />}
            {isOwnLot && (
              <span className="rounded-pill border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-brand-300">
                Your lot
              </span>
            )}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <OdometerPrice
            currentPrice={livePrice}
            nextStepSeconds={feedNextStep ?? auction.next_step_in_seconds}
            priceDecrement={auction.price_decrement}
            isActive={effectiveStatus === "ACTIVE" && !hasAccepted}
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

          <section className="grid grid-cols-2 divide-glass-border border border-glass-border sm:grid-cols-4 sm:divide-x">
            {[
              {
                label: "Opening price",
                value: formatCurrency(auction.start_price),
              },
              {
                label: "Floor price",
                value: formatCurrency(auction.floor_price),
              },
              {
                label: "Resale cap",
                value: formatCurrency(auction.ceiling_price),
              },
              {
                label: "Step decrement",
                value: `−${formatCurrency(auction.price_decrement)}`,
              },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3.5">
                <span className="data-label block">{item.label}</span>
                <span className="mt-1 block font-mono text-[12px] tabular-nums text-text">
                  {item.value}
                </span>
              </div>
            ))}
          </section>
        </div>

        <aside className="h-fit border border-glass-border bg-surface">
          <div className="border-b border-glass-border px-5 py-4">
            <span className="keyline">Acceptance ticket</span>
            <p className="pt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
              One acceptance buys the whole lot
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-end justify-between gap-4 border-b border-dashed border-glass-border pb-4">
              <div>
                <span className="data-label block">Current cost</span>
                <span className="figure text-[32px] text-text">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <span className="font-mono text-[9px] text-text-dim">
                {formatQuantity(auction.qty)} × {formatCurrency(livePrice)}
              </span>
            </div>

            <div className="space-y-2 font-mono text-[10.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-dim">Available credits</span>
                <span
                  className={cn(
                    "tabular-nums",
                    isAffordable ? "text-buy-text" : "text-sell-text"
                  )}
                >
                  {hasLoaded ? formatCurrency(availableCredits) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-dim">After acceptance</span>
                <span className="tabular-nums text-text-muted">
                  {hasLoaded ? formatCurrency(availableCredits - totalCost) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-dim">Settlement</span>
                <span className="text-text-muted">Immediate in this mock</span>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 border border-sell/40 bg-sell/[0.07] p-3 text-[11px] leading-relaxed text-text"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sell" />
                <span>{errorMessage}</span>
              </div>
            )}

            {refusalReason && !errorMessage && (
              <div className="flex items-start gap-2 border border-glass-border bg-white/[0.02] p-3 text-[11px] leading-relaxed text-text-muted">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-dim" />
                <span>{refusalReason}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAcceptAuction}
              disabled={!isActive || isSubmitting || !hasLoaded}
              className={cn(
                "flex w-full items-center justify-center gap-2 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors",
                acceptedReceipt
                  ? "cursor-default border border-buy/40 bg-buy/10 text-buy-text"
                  : !isActive
                  ? "cursor-not-allowed border border-glass-border bg-white/[0.02] text-text-dim"
                  : "bg-brand-400 text-canvas hover:bg-brand-300 disabled:opacity-60"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Asking the server…
                </>
              ) : acceptedReceipt ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Accepted · receipt issued
                </>
              ) : !isActive ? (
                lotStatusLabel(effectiveStatus)
              ) : (
                <>Accept at {formatCurrency(livePrice)}</>
              )}
            </button>

            <p className="font-mono text-[8.5px] leading-relaxed tracking-[0.02em] text-text-dim">
              The button submits the price shown here as the expected tick. If the server has
              already stepped lower or higher, it refuses the acceptance and returns the current
              price. No optimistic fill is displayed.
            </p>
          </div>
        </aside>
      </div>

      <SettlementReceiptModal
        receipt={acceptedReceipt}
        onClose={() => setAcceptedReceipt(null)}
      />
    </div>
  );
}
