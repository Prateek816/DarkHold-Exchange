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
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    if (prefilledPrice) {
      setPriceInput((prefilledPrice / 100).toFixed(2));
      setIdempotencyKey("IDEMP-" + Math.random().toString(36).substring(2, 9));
    }
  }, [prefilledPrice]);

  const userHolding = holdings.find((h) => h.asset_id === asset.id);
  const availableUnits = userHolding?.available_units ?? 0;

  const parsedPriceMinor = Math.round(parseFloat(priceInput || "0") * 100);
  const parsedQty = parseInt(qtyInput || "0", 10);

  const isAboveCeiling =
    side === "BUY" && type === "LIMIT" && parsedPriceMinor > asset.ceiling_price;

  const estimatedCost =
    type === "LIMIT"
      ? parsedPriceMinor * parsedQty
      : (asset.best_ask ?? asset.ceiling_price) * parsedQty;

  const handleMaxClick = () => {
    if (side === "BUY") {
      const unitPrice =
        type === "LIMIT" && parsedPriceMinor > 0
          ? parsedPriceMinor
          : asset.best_ask || asset.ceiling_price;
      const maxUnits = Math.floor(availableCredits / unitPrice);
      setQtyInput(Math.max(1, maxUnits).toString());
    } else {
      setQtyInput(Math.max(1, availableUnits).toString());
    }
  };

  const handleInitialSubmit = () => {
    setErrorMessage(null);
    setFormStep("VALIDATING");

    if (parsedQty <= 0) {
      setErrorMessage("Quantity must be at least 1 unit.");
      setFormStep("EDITING");
      return;
    }

    if (type === "LIMIT" && parsedPriceMinor <= 0) {
      setErrorMessage("Price must be greater than zero.");
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

    const key = idempotencyKey || "IDEMP-" + Math.random().toString(36).substring(2, 9);
    setIdempotencyKey(key);

    if (type === "MARKET") {
      setFormStep("CONFIRMING_MARKET");
      return;
    }

    executeSubmission(key);
  };

  const executeSubmission = async (key: string) => {
    setFormStep("SUBMITTING");

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

      setTimeout(() => {
        setFormStep("EDITING");
        setIdempotencyKey("");
        onOrderSubmitted?.();
      }, 1200);
    } catch (err: any) {
      const apiErr = err as ApiErrorPayload;
      const formatted = apiErr.code
        ? formatErrorMessage(apiErr.code, apiErr.context)
        : "Failed to place order. Please retry.";

      setErrorMessage(formatted);
      setFormStep("RETRYABLE");

      addToast({
        type: "error",
        title: "Order Rejected",
        message: formatted,
        requestId: apiErr.requestId,
      });
    }
  };

  return (
    <GlassCard glowEdge={side === "BUY" ? "teal" : "sell"} className={cn("p-5 flex flex-col gap-4 font-mono text-xs", className)}>
      {/* Side Switcher (Buy / Sell) Segmented Pill with Green/Red Glow */}
      <div className="w-full">
        <SegmentedTabs
          tabs={[
            { id: "BUY", label: `Buy ${asset.symbol}` },
            { id: "SELL", label: `Sell ${asset.symbol}` },
          ]}
          activeId={side}
          onChange={(s) => {
            setSide(s as OrderSide);
            setErrorMessage(null);
          }}
          variant="buy-sell"
          className="w-full justify-stretch"
          layoutId="trade-side-pill"
        />
      </div>

      {/* Order Type Toggle (Limit / Market) & Available Balance */}
      <div className="flex items-center justify-between border-b border-glass-border pb-3">
        <div className="flex items-center gap-1.5 p-0.5 rounded-pill bg-white/[0.03] border border-glass-border">
          <button
            onClick={() => setType("LIMIT")}
            className={cn(
              "px-3 py-1 rounded-pill text-[11px] font-medium transition-all",
              type === "LIMIT"
                ? "bg-white/[0.08] text-text border border-brand-500/40 font-bold"
                : "text-text-muted hover:text-text"
            )}
          >
            Limit
          </button>
          <button
            onClick={() => setType("MARKET")}
            className={cn(
              "px-3 py-1 rounded-pill text-[11px] font-medium transition-all",
              type === "MARKET"
                ? "bg-white/[0.08] text-text border border-brand-500/40 font-bold"
                : "text-text-muted hover:text-text"
            )}
          >
            Market
          </button>
        </div>

        {/* Balance & Max Chip */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>{side === "BUY" ? "Avail:" : "Units:"}</span>
          <span className="text-text font-bold">
            {side === "BUY" ? formatCurrency(availableCredits) : formatQuantity(availableUnits)}
          </span>
          <button
            onClick={handleMaxClick}
            className="text-[10px] uppercase text-brand-400 font-bold px-1.5 py-0.5 rounded-pill bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 ml-1 transition-colors"
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
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  setErrorMessage(null);
                }}
                className={cn(
                  "w-full h-11 bg-white/[0.03] border rounded-[14px] pl-8 pr-3 text-text text-sm font-mono transition-all",
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
            onChange={(e) => {
              setQtyInput(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full h-11 bg-white/[0.03] border border-glass-border rounded-[14px] px-3.5 text-text text-sm font-mono focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
            placeholder="1"
          />
        </div>
      </div>

      {/* Financial Summary & Vault Reservation Notice */}
      <div className="p-3 rounded-[14px] bg-white/[0.02] border border-glass-border space-y-1 text-[11px]">
        <div className="flex justify-between text-text-muted">
          <span>{side === "BUY" ? "Estimated Total:" : "Estimated Proceeds:"}</span>
          <span className="text-text font-bold text-xs">{formatCurrency(estimatedCost)}</span>
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
        <div className="p-3 rounded-[14px] bg-sell/15 border border-sell/40 text-[11px] text-text flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-sell shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
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
              onClick={() => setFormStep("EDITING")}
              className="px-3 py-1 rounded-pill border border-glass-border text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
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
          onClick={handleInitialSubmit}
          disabled={formStep === "SUBMITTING" || asset.is_halted || isAboveCeiling}
          className={cn(
            "w-full h-11 rounded-pill font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 select-none",
            asset.is_halted
              ? "bg-white/[0.05] text-text-dim cursor-not-allowed border border-glass-border"
              : side === "BUY"
              ? "bg-gradient-to-r from-[#5DF2D6] to-[#0FB5A0] text-[#04201B] shadow-glow-teal hover:opacity-95 disabled:opacity-50"
              : "bg-gradient-to-r from-[#FF7A93] to-[#E0405E] text-white shadow-[0_0_20px_rgba(240,80,110,0.35)] hover:opacity-95 disabled:opacity-50"
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
