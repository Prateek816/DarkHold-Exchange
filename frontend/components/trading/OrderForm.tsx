"use client";

import React, { useState, useEffect } from "react";
import { Asset, OrderSide, OrderType } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { TheWard } from "@/components/ui/TheWard";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatErrorMessage, ApiErrorPayload } from "@/lib/errors";
import { Lock, ShieldAlert, AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderFormProps {
  asset: Asset;
  prefilledPrice?: number | null;
  onOrderSubmitted?: () => void;
  className?: string;
}

type FormStep =
  | "EDITING"
  | "VALIDATING"
  | "CONFIRMING_MARKET"
  | "SUBMITTING"
  | "ACCEPTED"
  | "RETRYABLE";

export function OrderForm({
  asset,
  prefilledPrice,
  onOrderSubmitted,
  className,
}: OrderFormProps) {
  const { availableCredits, holdings } = useWalletStore();
  const { addToast } = useUiStore();

  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("LIMIT");
  const [priceInput, setPriceInput] = useState<string>((asset.last_price / 100).toFixed(2));
  const [qtyInput, setQtyInput] = useState<string>("1");
  const [formStep, setFormStep] = useState<FormStep>("EDITING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    if (prefilledPrice) {
      setPriceInput((prefilledPrice / 100).toFixed(2));
      setIdempotencyKey("");
      setErrorMessage(null);
      setRequestId(null);
      setFormStep("EDITING");
    }
  }, [prefilledPrice]);

  const userHolding = holdings.find((h) => h.asset_id === asset.id);
  const availableUnits = userHolding?.available_units ?? 0;

  const parsedPriceMinor = Math.round(parseFloat(priceInput || "0") * 100);
  const parsedQty = parseInt(qtyInput || "0", 10);
  const isLocked = formStep === "SUBMITTING" || formStep === "ACCEPTED";

  // Engine configuration status
  const isConfigured =
    asset.is_configured !== false &&
    asset.is_tradable !== false &&
    asset.status !== "UNCONFIGURED";

  // The Ward caps every resale price, on either side of the book.
  const isAboveCeiling = type === "LIMIT" && parsedPriceMinor > asset.ceiling_price;

  const marketReference =
    side === "BUY"
      ? asset.best_ask ?? asset.ceiling_price
      : asset.best_bid ?? asset.last_price;

  const estimatedCost =
    type === "LIMIT" ? parsedPriceMinor * parsedQty : marketReference * parsedQty;

  /** Any edit starts a new order attempt, so a previous idempotency key must not be reused. */
  const markTicketEdited = () => {
    setErrorMessage(null);
    setRequestId(null);
    setFormStep("EDITING");
    setIdempotencyKey("");
  };

  const handleMaxClick = () => {
    if (isLocked) return;
    if (side === "BUY") {
      const unitPrice =
        type === "LIMIT" && parsedPriceMinor > 0 ? parsedPriceMinor : marketReference;
      const maxUnits = Math.floor(availableCredits / Math.max(unitPrice, 1));
      setQtyInput(Math.max(1, maxUnits).toString());
    } else {
      setQtyInput(Math.max(1, availableUnits).toString());
    }
    markTicketEdited();
  };

  const handleInitialSubmit = () => {
    setErrorMessage(null);
    setRequestId(null);
    setFormStep("VALIDATING");

    if (!asset || !asset.id) {
      setErrorMessage("Valid asset is required.");
      setFormStep("EDITING");
      return;
    }

    if (!isConfigured) {
      setErrorMessage(`Asset is not configured for trading on the matching engine: ${asset.symbol} (${asset.id})`);
      setFormStep("EDITING");
      return;
    }

    if (side !== "BUY" && side !== "SELL") {
      setErrorMessage("Side must be BUY or SELL.");
      setFormStep("EDITING");
      return;
    }

    if (type !== "LIMIT" && type !== "MARKET") {
      setErrorMessage("Order type must be LIMIT or MARKET.");
      setFormStep("EDITING");
      return;
    }

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage("Quantity must be at least 1 unit.");
      setFormStep("EDITING");
      return;
    }

    if (type === "LIMIT") {
      if (isNaN(parsedPriceMinor) || parsedPriceMinor <= 0) {
        setErrorMessage("Price must be greater than zero.");
        setFormStep("EDITING");
        return;
      }
      if (parsedPriceMinor % 10 !== 0) {
        setErrorMessage("Price must be aligned to tick size ($0.10).");
        setFormStep("EDITING");
        return;
      }
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

    if (side === "BUY" && estimatedCost > availableCredits) {
      setErrorMessage(
        `Insufficient funds. You need ${formatCurrency(estimatedCost)} but have ${formatCurrency(
          availableCredits
        )} available.`
      );
      setFormStep("EDITING");
      return;
    }

    if (side === "SELL" && parsedQty > availableUnits) {
      setErrorMessage(`Insufficient holdings. You have ${formatQuantity(availableUnits)} units available.`);
      setFormStep("EDITING");
      return;
    }

    const key =
      idempotencyKey ||
      `idemp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(key);

    if (type === "MARKET") {
      setFormStep("CONFIRMING_MARKET");
      return;
    }

    executeSubmission(key);
  };

  const executeSubmission = async (key: string) => {
    if (formStep === "SUBMITTING") return;
    setFormStep("SUBMITTING");

    if (process.env.NODE_ENV !== "production") {
      console.log("[OrderForm] Submitting order:", {
        asset: asset.symbol,
        assetId: asset.id,
        side,
        type,
        qty: parsedQty,
        price: type === "LIMIT" ? parsedPriceMinor : 0,
        idempotencyKey: key,
      });
    }

    try {
      const res = await api.submitOrder({
        idempotencyKey: key,
        assetId: asset.id,
        side,
        type,
        price: type === "LIMIT" ? parsedPriceMinor : 0,
        qty: parsedQty,
      });

      setFormStep("ACCEPTED");
      addToast({
        type: "success",
        title: "Order Accepted by Engine",
        message: `${side} ${parsedQty}x ${asset.symbol} submitted. Funds reserved in vault.`,
      });

      // Synchronize wallet immediately to reflect reservation
      try {
        const freshWallet = await api.getWallet();
        useWalletStore.getState().setWalletFromServer(freshWallet);
      } catch (walletErr) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[OrderForm] Wallet refresh after submission failed:", walletErr);
        }
      }

      setTimeout(() => {
        setFormStep("EDITING");
        setIdempotencyKey("");
        onOrderSubmitted?.();
      }, 1000);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[OrderForm] Order submission error:", err);
      }
      const apiErr = err as ApiErrorPayload;
      const reqId = apiErr.requestId || apiErr.context?.request_id || null;
      const formatted = apiErr.code
        ? formatErrorMessage(apiErr.code, apiErr.context, apiErr.message)
        : (apiErr.message || "Failed to place order. Please retry.");

      setErrorMessage(formatted);
      setRequestId(reqId);
      setFormStep("RETRYABLE");

      addToast({
        type: "error",
        title: "Order Rejected",
        message: formatted,
        requestId: reqId || undefined,
      });
    }
  };

  return (
    <GlassCard glowEdge={side === "BUY" ? "teal" : "sell"} className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="eyebrow">Trade ticket</span>
          <h3 className="pt-0.5 font-display text-[15px] font-semibold tracking-tight text-text">
            Place order
          </h3>
        </div>
        <span className="rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
          {asset.symbol}
        </span>
      </div>

      {/* Side Switcher (Buy / Sell) */}
      <div className={cn("w-full", isLocked && "pointer-events-none opacity-60")}>
        <SegmentedTabs
          tabs={[
            { id: "BUY", label: `Buy ${asset.symbol}` },
            { id: "SELL", label: `Sell ${asset.symbol}` },
          ]}
          activeId={side}
          onChange={(s) => {
            if (isLocked) return;
            setSide(s as OrderSide);
            markTicketEdited();
          }}
          variant="buy-sell"
          className="w-full justify-stretch"
          layoutId="trade-side-pill"
        />
      </div>

      {/* Order Type Toggle (Limit / Market) & Available Balance */}
      <div className="flex items-center justify-between border-b border-glass-border pb-3">
        <div className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] p-0.5">
          <button
            onClick={() => {
              if (isLocked) return;
              setType("LIMIT");
              markTicketEdited();
            }}
            disabled={isLocked}
            className={cn(
              "rounded-full px-3 py-1 font-mono text-[10px] font-medium transition-all disabled:opacity-50",
              type === "LIMIT"
                ? "border border-brand-500/40 bg-white/[0.08] font-bold text-text"
                : "text-text-muted hover:text-text"
            )}
          >
            Limit
          </button>
          <button
            onClick={() => {
              if (isLocked) return;
              setType("MARKET");
              markTicketEdited();
            }}
            disabled={isLocked}
            className={cn(
              "rounded-full px-3 py-1 font-mono text-[10px] font-medium transition-all disabled:opacity-50",
              type === "MARKET"
                ? "border border-brand-500/40 bg-white/[0.08] font-bold text-text"
                : "text-text-muted hover:text-text"
            )}
          >
            Market
          </button>
        </div>

        {/* Balance & Max Chip */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
          <span>{side === "BUY" ? "Avail" : "Units"}</span>
          <span className="font-bold tabular-nums text-text">
            {side === "BUY" ? formatCurrency(availableCredits) : formatQuantity(availableUnits)}
          </span>
          <button
            onClick={handleMaxClick}
            disabled={isLocked}
            className="ml-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-brand-400 transition-colors hover:bg-brand-500/20 disabled:opacity-50"
          >
            Max
          </button>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        {type === "LIMIT" ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-text-dim">
              <span>Limit Price (USD)</span>
              <span className="text-ward font-medium">Cap: {formatCurrency(asset.ceiling_price)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-text-dim">$</span>
              <input
                type="number"
                step="0.50"
                value={priceInput}
                disabled={isLocked}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  markTicketEdited();
                }}
                className={cn(
                  "w-full h-11 bg-white/[0.03] border rounded-[14px] pl-8 pr-3 text-text text-sm font-mono transition-all disabled:opacity-60",
                  "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent",
                  isAboveCeiling
                    ? "border-ward bg-ward/10 animate-ward-shake"
                    : "border-glass-border"
                )}
                placeholder="0.00"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-[14px] bg-white/[0.025] border border-glass-border text-[11px] text-text-muted space-y-1">
            <div className="flex justify-between">
              <span>Execution Mode:</span>
              <span className="text-text font-semibold">Best Available Market Fill</span>
            </div>
            <p className="text-[10px] text-text-dim">
              Buys are protected and strictly capped at The Ward ceiling ({formatCurrency(asset.ceiling_price)}).
            </p>
          </div>
        )}

        {/* The Ward Banner if above ceiling */}
        {isAboveCeiling && (
          <TheWard
            ceilingPrice={asset.ceiling_price}
            faceValue={asset.face_value}
            ceilingPct={asset.ceiling_pct}
            isTriggered={true}
            variant="banner"
          />
        )}

        {/* Quantity Input */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-text-dim">
            <span>Quantity (Units)</span>
            <span>Tick: 1 unit</span>
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={qtyInput}
            disabled={isLocked}
            onChange={(e) => {
              setQtyInput(e.target.value);
              markTicketEdited();
            }}
            className="h-11 w-full rounded-[12px] border border-glass-border bg-white/[0.03] px-3.5 font-mono text-sm text-text transition-all focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
            placeholder="1"
          />
        </div>
      </div>

      {/* Financial Summary & Vault Reservation Notice */}
      <div className="p-3 rounded-[14px] bg-white/[0.02] border border-glass-border space-y-1 text-[11px]">
        <div className="flex justify-between text-text-muted">
          <span>{side === "BUY" ? "Estimated Total:" : "Estimated Proceeds:"}</span>
          <span className="font-mono text-xs font-bold tabular-nums text-text">{formatCurrency(estimatedCost)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-dim pt-0.5">
          <Lock className="w-2.5 h-2.5 text-warning shrink-0" />
          <span>
            {side === "BUY"
              ? "Funds locked in Vault reservation upon acceptance until settlement."
              : "Units locked in Vault reservation upon acceptance until settlement."}
          </span>
        </div>
      </div>

      {/* Error Announcement */}
      {errorMessage && (
        <div className="p-3 rounded-[14px] bg-sell/15 border border-sell/40 text-[11px] text-text flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-sell shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          {requestId && (
            <div className="pl-5 font-mono text-[9px] text-text-dim">
              Reference: <span className="text-text-muted">{requestId}</span>
            </div>
          )}
        </div>
      )}

      {/* Unconfigured Notice */}
      {!isConfigured && (
        <div className="p-3 rounded-[14px] bg-warning/10 border border-warning/30 text-[11px] text-warning flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <span>
            This asset ({asset.symbol}) is not configured for matching engine execution. Order submission is currently disabled.
          </span>
        </div>
      )}

      {/* Market Order Confirmation Modal */}
      {formStep === "CONFIRMING_MARKET" && (
        <div className="p-3.5 rounded-[14px] bg-white/[0.05] border border-warning space-y-2">
          <div className="flex items-center gap-1.5 text-warning text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Confirm Market Order</span>
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            Worst acceptable cost will reserve up to{" "}
            <strong className="text-text">{formatCurrency(estimatedCost)}</strong>.
            Matches instantly against top book levels.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormStep("EDITING")}
              className="px-3 py-1 rounded-pill border border-glass-border text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => executeSubmission(idempotencyKey)}
              className="px-3.5 py-1 rounded-pill bg-warning text-canvas text-xs font-bold font-mono shadow-glow-ward"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      )}

      {/* Primary CTA (Mint Gradient for Buy, Rose-Red Gradient for Sell) */}
      {formStep !== "CONFIRMING_MARKET" && (
        <button
          type="button"
          id="trade-submit-button"
          onClick={handleInitialSubmit}
          disabled={
            formStep === "SUBMITTING" ||
            formStep === "ACCEPTED" ||
            asset.is_halted ||
            !isConfigured ||
            isAboveCeiling
          }
          className={cn(
            "flex h-11 w-full select-none items-center justify-center gap-2 rounded-[12px] text-[11.5px] font-bold uppercase tracking-[0.08em] transition-all duration-200",
            asset.is_halted || !isConfigured
              ? "cursor-not-allowed border border-glass-border bg-white/[0.05] text-text-dim"
              : side === "BUY"
              ? "bg-gradient-to-r from-brand-400 to-brand-500 text-canvas shadow-glow-teal hover:-translate-y-px disabled:opacity-50"
              : "bg-gradient-to-r from-sell-text to-sell text-white shadow-[0_0_20px_rgba(240,80,110,0.35)] hover:-translate-y-px disabled:opacity-50"
          )}
        >
          {formStep === "SUBMITTING" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Submitting to Engine...</span>
            </>
          ) : formStep === "ACCEPTED" ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Accepted (202)</span>
            </>
          ) : !isConfigured ? (
            <span>Trading Unavailable</span>
          ) : formStep === "RETRYABLE" ? (
            <span>Retry Submission</span>
          ) : asset.is_halted ? (
            <span>Trading Halted</span>
          ) : (
            <span>
              {side} {parsedQty} {asset.symbol}
            </span>
          )}
        </button>
      )}
    </GlassCard>
  );
}
