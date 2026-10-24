"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Asset, Order, OrderSide, OrderType } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { TheWard } from "@/components/ui/TheWard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import type { ApiErrorPayload} from "@/lib/errors";
import { formatErrorMessage } from "@/lib/errors";
import { AlertCircle, Check, Loader2, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderFormProps {
  asset: Asset;
  prefilledPrice?: number | null;
  isHalted?: boolean;
  onOrderSubmitted?: (order?: Order) => void | Promise<void>;
  className?: string;
}

type FormStep =
  | "EDITING"
  | "VALIDATING"
  | "CONFIRMING_MARKET"
  | "SUBMITTING"
  | "ACCEPTED"
  | "RETRYABLE";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `IDEMP-${crypto.randomUUID()}`;
  }
  return `IDEMP-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function acceptedCopy(order: Order, asset: Asset, side: OrderSide) {
  const reservation =
    side === "BUY" ? "Server-held credits are reserved." : "Server-held units are reserved.";
  if (order.status === "FILLED") {
    return {
      title: "Order filled",
      message: `${side} ${formatQuantity(order.matched_qty)} ${asset.symbol} matched instantly. Mock settlement is still pending.`,
      label: "Filled · settling",
    };
  }
  if (order.status === "PARTIALLY_FILLED") {
    return {
      title: "Order partially filled",
      message: `${formatQuantity(order.matched_qty)} of ${formatQuantity(order.qty)} matched; the remainder rests on the book. ${reservation}`,
      label: "Partially filled",
    };
  }
  if (order.status === "CANCELED") {
    return {
      title: "Market remainder canceled",
      message: `${formatQuantity(order.matched_qty)} of ${formatQuantity(order.qty)} matched. The unfilled remainder was not booked and its reservation was released by the server.`,
      label: "Remainder canceled",
    };
  }
  return {
    title: "Order accepted",
    message: `${side} ${formatQuantity(order.qty)} ${asset.symbol} is resting on the mock book. ${reservation}`,
    label: "Accepted · resting",
  };
}

export function OrderForm({
  asset,
  prefilledPrice,
  isHalted,
  onOrderSubmitted,
  className,
}: OrderFormProps) {
  const { availableCredits, holdings, hasLoaded } = useWalletStore();
  const { addToast } = useUiStore();

  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("LIMIT");
  const [priceInput, setPriceInput] = useState<string>((asset.last_price / 100).toFixed(2));
  const [qtyInput, setQtyInput] = useState<string>("1");
  const [formStep, setFormStep] = useState<FormStep>("EDITING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);
  const [acceptedOrder, setAcceptedOrder] = useState<Order | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [inFlight, setInFlight] = useState(false);

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPrefilledPriceRef = useRef<number | null>(null);

  const halted = isHalted ?? asset.is_halted;

  useEffect(() => {
    if (prefilledPrice && lastPrefilledPriceRef.current !== prefilledPrice) {
      lastPrefilledPriceRef.current = prefilledPrice;
      setPriceInput((prefilledPrice / 100).toFixed(2));
      setIdempotencyKey("");
      setErrorMessage(null);
      setErrorRequestId(null);
      setFormStep("EDITING");
    }
  }, [prefilledPrice]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const userHolding = holdings.find((holding) => holding.asset_id === asset.id);
  const availableUnits = userHolding?.available_units ?? 0;

  const parsedPriceMinor = Math.round(Number.parseFloat(priceInput || "0") * 100);
  const parsedQty = Number.parseInt(qtyInput || "0", 10);
  const isLocked = formStep === "SUBMITTING" || formStep === "ACCEPTED";
  const isAboveCeiling = type === "LIMIT" && parsedPriceMinor > asset.ceiling_price;

  const marketReference =
    side === "BUY"
      ? asset.best_ask ?? asset.ceiling_price
      : asset.best_bid ?? asset.last_price;

  // Market buys reserve against the cap, not against an optimistic touch price.
  const reservePrice =
    type === "MARKET" ? (side === "BUY" ? asset.ceiling_price : marketReference) : parsedPriceMinor;
  const estimatedTotal = Number.isFinite(reservePrice * parsedQty)
    ? reservePrice * parsedQty
    : 0;

  const markTicketEdited = () => {
    setErrorMessage(null);
    setErrorRequestId(null);
    setAcceptedOrder(null);
    setFormStep("EDITING");
    setIdempotencyKey("");
  };

  const handleMaxClick = () => {
    if (isLocked || halted) return;
    if (side === "BUY") {
      const unitPrice = type === "LIMIT" ? parsedPriceMinor : asset.ceiling_price;
      const maxUnits = Math.floor(availableCredits / Math.max(unitPrice || 1, 1));
      setQtyInput(Math.max(1, maxUnits).toString());
    } else {
      setQtyInput(Math.max(1, availableUnits).toString());
    }
    markTicketEdited();
  };

  const executeSubmission = async (key: string) => {
    if (inFlight) return;
    setInFlight(true);
    setFormStep("SUBMITTING");
    setErrorMessage(null);
    setErrorRequestId(null);

    try {
      const response = await api.submitOrder({
        idempotencyKey: key,
        assetId: asset.id,
        side,
        type,
        price: type === "LIMIT" ? parsedPriceMinor : 0,
        qty: parsedQty,
      });

      const order = response.data;
      const copy = acceptedCopy(order, asset, side);
      setAcceptedOrder(order);
      setFormStep("ACCEPTED");

      addToast({
        type: order.status === "FILLED" ? "success" : "info",
        title: copy.title,
        message: copy.message,
      });

      void onOrderSubmitted?.(order);

      resetTimerRef.current = setTimeout(() => {
        setFormStep("EDITING");
        setAcceptedOrder(null);
        setIdempotencyKey("");
        setInFlight(false);
      }, 1400);
    } catch (error) {
      const apiError = error as Partial<ApiErrorPayload>;
      const formatted = apiError.code
        ? formatErrorMessage(apiError.code, apiError.context)
        : "The submission could not be completed. Nothing was inferred locally.";

      setErrorMessage(formatted);
      setErrorRequestId(apiError.requestId ?? null);
      setFormStep("RETRYABLE");
      setInFlight(false);

      addToast({
        type: "error",
        title: "Order not accepted",
        message: formatted,
        requestId: apiError.requestId,
      });
    }
  };

  const handleInitialSubmit = () => {
    if (inFlight || isLocked) return;
    setErrorMessage(null);
    setErrorRequestId(null);
    setFormStep("VALIDATING");

    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      setErrorMessage("Quantity must be a whole number of at least 1 unit.");
      setFormStep("EDITING");
      return;
    }

    if (type === "LIMIT" && (!Number.isFinite(parsedPriceMinor) || parsedPriceMinor < 1)) {
      setErrorMessage("Limit price must be greater than zero.");
      setFormStep("EDITING");
      return;
    }

    if (isAboveCeiling) {
      setErrorMessage(
        `Resale cap is ${formatCurrency(asset.ceiling_price)} (${asset.ceiling_pct}% of face value ${formatCurrency(
          asset.face_value
        )}). Lower your price.`
      );
      setFormStep("EDITING");
      return;
    }

    if (side === "BUY" && estimatedTotal > availableCredits) {
      setErrorMessage(
        `Insufficient funds. The server would reserve ${formatCurrency(
          estimatedTotal
        )}, but ${formatCurrency(availableCredits)} is available.`
      );
      setFormStep("EDITING");
      return;
    }

    if (side === "SELL" && parsedQty > availableUnits) {
      setErrorMessage(
        `Insufficient holdings. You have ${formatQuantity(availableUnits)} units available.`
      );
      setFormStep("EDITING");
      return;
    }

    // The key is generated once per ticket. Safe retries reuse it; any edit
    // clears it so a changed order can never replay the old submission.
    const key = idempotencyKey || createIdempotencyKey();
    setIdempotencyKey(key);

    if (type === "MARKET") {
      setFormStep("CONFIRMING_MARKET");
      return;
    }

    void executeSubmission(key);
  };

  const submissionLabel =
    formStep === "SUBMITTING"
      ? "Submitting…"
      : formStep === "ACCEPTED"
        ? acceptedOrder
          ? acceptedCopy(acceptedOrder, asset, side).label
          : "Accepted"
        : formStep === "RETRYABLE"
          ? "Retry same submission"
          : halted
            ? "Trading halted"
            : `${side} ${asset.symbol}`;

  return (
    <section
      className={cn(
        "flex flex-col gap-4 border border-glass-border bg-surface p-4 sm:p-5",
        className
      )}
      aria-labelledby="ticket-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-glass-border pb-3">
        <div>
          <p className="keyline">Trade ticket</p>
          <h2 id="ticket-heading" className="pt-1 text-[15px] font-semibold text-text">
            Place a mock order
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
            {asset.symbol}
          </p>
          <p className="pt-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-warning">
            Cap {formatCurrency(asset.ceiling_price, { showCents: false })}
          </p>
        </div>
      </div>

      <div className={cn("space-y-3", isLocked && "pointer-events-none opacity-60")}>
        <SegmentedTabs
          tabs={[
            { id: "BUY", label: `Buy · ${asset.symbol}` },
            { id: "SELL", label: `Sell · ${asset.symbol}` },
          ]}
          activeId={side}
          onChange={(next) => {
            if (isLocked) return;
            setSide(next as OrderSide);
            markTicketEdited();
          }}
          variant="buy-sell"
          className="w-full justify-stretch"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex border border-glass-border bg-canvas-elevated p-0.5" role="group" aria-label="Order type">
            {(["LIMIT", "MARKET"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={type === option}
                onClick={() => {
                  if (isLocked) return;
                  setType(option);
                  markTicketEdited();
                }}
                disabled={isLocked}
                className={cn(
                  "px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors disabled:opacity-50",
                  type === option
                    ? "border border-brand-500/45 bg-brand-500/10 text-brand-300"
                    : "border border-transparent text-text-dim hover:text-text"
                )}
              >
                {option === "LIMIT" ? "Limit" : "Market"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-text-dim">
            <span>{side === "BUY" ? "Available" : "Units"}</span>
            <span className="font-medium tabular-nums text-text">
              {!hasLoaded
                ? "—"
                : side === "BUY"
                  ? formatCurrency(availableCredits)
                  : formatQuantity(availableUnits)}
            </span>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isLocked || halted || !hasLoaded}
              className="ml-0.5 border border-brand-500/35 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.08em] text-brand-300 transition-colors hover:border-brand-400 hover:text-brand-200 disabled:opacity-40"
            >
              Max
            </button>
          </div>
        </div>

        {type === "LIMIT" ? (
          <div>
            <label
              htmlFor="ticket-price"
              className="flex items-center justify-between pb-1 text-[10px] text-text-muted"
            >
              <span>Limit price</span>
              <span className="font-mono text-[9px] text-warning">
                Ward {formatCurrency(asset.ceiling_price)}
              </span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-text-dim">
                $
              </span>
              <input
                id="ticket-price"
                type="number"
                min="0.01"
                step="0.50"
                inputMode="decimal"
                value={priceInput}
                disabled={isLocked || halted}
                onChange={(event) => {
                  setPriceInput(event.target.value);
                  markTicketEdited();
                }}
                aria-invalid={isAboveCeiling}
                aria-describedby={isAboveCeiling ? "ticket-price-error" : undefined}
                className={cn(
                  "h-11 w-full border bg-canvas-elevated pl-8 pr-3 font-mono text-[13px] tabular-nums text-text transition-colors focus:border-brand-500/60 focus:outline-none disabled:opacity-60",
                  isAboveCeiling
                    ? "border-sell/60 bg-sell-bg"
                    : "border-glass-border hover:border-glass-border-strong"
                )}
                placeholder="0.00"
              />
            </div>
          </div>
        ) : (
          <div className="border border-glass-border bg-canvas-elevated p-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">Execution</span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-text">
                Best available levels
              </span>
            </div>
            <p className="pt-1.5 text-[10px] leading-relaxed text-text-dim">
              A market buy reserves against the {formatCurrency(asset.ceiling_price)} cap. The
              unfilled remainder cannot rest and is canceled by the server.
            </p>
          </div>
        )}

        {isAboveCeiling && (
          <div id="ticket-price-error">
            <TheWard
              ceilingPrice={asset.ceiling_price}
              faceValue={asset.face_value}
              ceilingPct={asset.ceiling_pct}
              isTriggered
              variant="banner"
            />
          </div>
        )}

        <div>
          <label htmlFor="ticket-qty" className="flex items-center justify-between pb-1 text-[10px] text-text-muted">
            <span>Quantity</span>
            <span className="font-mono text-[9px] text-text-dim">Whole units only</span>
          </label>
          <input
            id="ticket-qty"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={qtyInput}
            disabled={isLocked || halted}
            onChange={(event) => {
              setQtyInput(event.target.value);
              markTicketEdited();
            }}
            className="h-11 w-full border border-glass-border bg-canvas-elevated px-3 font-mono text-[13px] tabular-nums text-text transition-colors hover:border-glass-border-strong focus:border-brand-500/60 focus:outline-none disabled:opacity-60"
            placeholder="1"
          />
        </div>

        <dl className="space-y-1.5 border border-glass-border bg-canvas-elevated p-3 font-mono text-[10px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-dim">
              {side === "BUY"
                ? type === "MARKET"
                  ? "Reserve up to"
                  : "Estimated cost"
                : "Estimated proceeds"}
            </dt>
            <dd className="text-[12px] font-medium tabular-nums text-text">
              {formatCurrency(estimatedTotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-dim">Resale cap</dt>
            <dd className="tabular-nums text-warning">{formatCurrency(asset.ceiling_price)}</dd>
          </div>
          <div className="flex items-start gap-1.5 pt-1 text-[9px] leading-relaxed text-text-dim">
            <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0 text-warning" />
            <span>
              {side === "BUY"
                ? "Credits are reserved by the mock ledger when the order is accepted, not when this form is edited."
                : "Units are reserved by the mock ledger when a sell ticket is accepted."}
            </span>
          </div>
        </dl>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-sell/40 bg-sell-bg p-3 text-[10.5px] leading-relaxed text-text"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sell" />
          <div>
            <p>{errorMessage}</p>
            {errorRequestId && (
              <p className="pt-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
                Reference {errorRequestId}
              </p>
            )}
            {formStep === "RETRYABLE" && idempotencyKey && (
              <p className="pt-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
                Retry reuses the same submission key.
              </p>
            )}
          </div>
        </div>
      )}

      {formStep === "CONFIRMING_MARKET" && (
        <div className="space-y-2 border border-warning/40 bg-warning/[0.07] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warning">
            <ShieldAlert className="h-3.5 w-3.5" />
            Confirm market ticket
          </div>
          <p className="text-[10.5px] leading-relaxed text-text-muted">
            The server will match against eligible book levels and reserve up to{" "}
            <strong className="font-mono text-text">{formatCurrency(estimatedTotal)}</strong>. Any
            unfilled buy remainder is released immediately.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormStep("EDITING")}
              className="border border-glass-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void executeSubmission(idempotencyKey)}
              disabled={inFlight}
              className="border border-warning/50 bg-warning/15 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {formStep !== "CONFIRMING_MARKET" && (
        <button
          type="button"
          onClick={handleInitialSubmit}
          disabled={
            formStep === "SUBMITTING" ||
            formStep === "ACCEPTED" ||
            halted ||
            isAboveCeiling ||
            !hasLoaded
          }
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 border font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            halted
              ? "border-glass-border bg-canvas-elevated text-text-dim"
              : side === "BUY"
                ? "border-buy/50 bg-buy-bg text-buy-text hover:bg-buy/20"
                : "border-sell/50 bg-sell-bg text-sell-text hover:bg-sell/20"
          )}
        >
          {formStep === "SUBMITTING" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {submissionLabel}
            </>
          ) : formStep === "ACCEPTED" ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {submissionLabel}
            </>
          ) : halted ? (
            "Trading halted"
          ) : !hasLoaded ? (
            "Loading ledger…"
          ) : (
            submissionLabel
          )}
        </button>
      )}

      <p className="text-center font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.06em] text-text-dim">
        Simulated counterparties · not an offer · no real settlement
      </p>
    </section>
  );
}
