"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WalletHolding } from "@/lib/types";
import type { ApiErrorPayload } from "@/lib/errors";
import { formatErrorMessage } from "@/lib/errors";
import { api } from "@/lib/api-client";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { PillButton } from "@/components/ui/PillButton";
import { DecayCurveChart } from "./DecayCurveChart";
import { TheWard } from "@/components/ui/TheWard";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Gavel,
  Hourglass,
  Loader2,
  Lock,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: WalletHolding[];
  onAuctionCreated?: () => void;
}

const makeKey = () =>
  `auc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function CreateAuctionModal({
  isOpen,
  onClose,
  holdings,
  onAuctionCreated,
}: CreateAuctionModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useUiStore();
  const { setWalletFromServer } = useWalletStore();

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [startPriceInput, setStartPriceInput] = useState<string>("");
  const [floorPriceInput, setFloorPriceInput] = useState<string>("");
  const [stepSeconds, setStepSeconds] = useState<number>(15);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>("");
  const fingerprintRef = useRef<string>("");
  const lastSyncedHoldingsRef = useRef<string>("");
  const [modalOpenTime] = useState(() => Date.now());

  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.getAssets(),
  });

  const activeHolding = holdings.find((h) => h.asset_id === selectedAssetId);
  const activeAsset = assets.find((asset) => asset.id === selectedAssetId);
  const ceilingPrice = activeAsset?.ceiling_price ?? 0;
  const availableUnits = activeHolding?.available_units ?? 0;

  // Keep the selected holding valid if the vault loads or changes while mounted.
  // Uses a ref to track last synced holdings to avoid cascading renders.
  useEffect(() => {
    if (holdings.length === 0) return;
    const holdingsKey = holdings.map((h) => h.asset_id).sort().join(",");
    if (lastSyncedHoldingsRef.current === holdingsKey) return;
    lastSyncedHoldingsRef.current = holdingsKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!holdings.some((holding) => holding.asset_id === selectedAssetId)) {
      setSelectedAssetId(holdings[0].asset_id);
    }
  }, [holdings, selectedAssetId]);

  // Seed the ticket from the selected asset's actual ceiling. These are only
  // form defaults; the server validates the submitted values again.
  const assetSeededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeAsset) return;
    if (assetSeededRef.current === activeAsset.id) return;
    assetSeededRef.current = activeAsset.id;
    const ceilingDollars = activeAsset.ceiling_price / 100;
    const floorDollars = Math.round(ceilingDollars * 0.9 * 100) / 100;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartPriceInput(ceilingDollars.toFixed(2));
    setFloorPriceInput(floorDollars.toFixed(2));
    setQty(1);
    setErrorMessage(null);
  }, [activeAsset?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isSubmitting, onClose]);

  // A retry of the same ticket reuses its key; editing any field creates a new
  // intent and therefore a new key. The server refuses conflicting reuse.
  useEffect(() => {
    const fingerprint = JSON.stringify([
      isOpen,
      selectedAssetId,
      qty,
      startPriceInput,
      floorPriceInput,
      stepSeconds,
      durationMinutes,
    ]);
    if (fingerprintRef.current !== fingerprint || !idempotencyKeyRef.current) {
      fingerprintRef.current = fingerprint;
      idempotencyKeyRef.current = makeKey();
    }
  }, [
    isOpen,
    selectedAssetId,
    qty,
    startPriceInput,
    floorPriceInput,
    stepSeconds,
    durationMinutes,
  ]);

  const parseMinor = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };

  const startPriceMinor = parseMinor(startPriceInput);
  const floorPriceMinor = parseMinor(floorPriceInput);

  const isAboveCeiling = ceilingPrice > 0 && startPriceMinor > ceilingPrice;
  const isFloorInvalid = floorPriceMinor <= 0 || floorPriceMinor > startPriceMinor;
  const isQuantityInvalid = qty < 1 || qty > availableUnits;
  const canLaunch =
    Boolean(activeHolding && activeAsset) &&
    !isLoadingAssets &&
    !isAboveCeiling &&
    !isFloorInvalid &&
    !isQuantityInvalid &&
    !isSubmitting;

  const handleCreate = async () => {
    if (!activeHolding || !activeAsset) {
      setErrorMessage("You need a holding in this asset before you can list a lot.");
      return;
    }
    if (isAboveCeiling) {
      setErrorMessage(
        `Start price is above the ${formatCurrency(ceilingPrice)} resale cap for this asset.`
      );
      return;
    }
    if (isFloorInvalid) {
      setErrorMessage("Floor price must be positive and no higher than the start price.");
      return;
    }
    if (isQuantityInvalid) {
      setErrorMessage(
        `You can auction between 1 and ${availableUnits} unit${
          availableUnits === 1 ? "" : "s"
        }.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await api.createAuction({
        idempotencyKey: idempotencyKeyRef.current,
        assetId: activeAsset.id,
        qty,
        startPrice: startPriceMinor,
        floorPrice: floorPriceMinor,
        stepSeconds,
        durationMinutes,
      });

      const wallet = await api.getWallet();
      setWalletFromServer(wallet);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auctions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);

      addToast({
        type: "success",
        title: "Lot listed in the mock server",
        message: `${formatQuantity(created.qty)}x ${created.asset_name} listed from ${formatCurrency(
          created.start_price
        )} down to ${formatCurrency(created.floor_price)}. Those units are now reserved.`,
      });

      onAuctionCreated?.();
      onClose();
      router.push(`/auctions/${created.auction_id}`);
    } catch (caught) {
      const apiError = caught as Partial<ApiErrorPayload>;
      const message = apiError?.code
        ? formatErrorMessage(apiError.code, apiError.context)
        : "The lot could not be listed. Nothing was reserved.";

      setErrorMessage(message);
      addToast({
        type: "error",
        title: "Listing refused",
        message,
        requestId: apiError.requestId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const endTimeRef = useRef<number>(0);
  const [endTime, setEndTime] = useState(() => Date.now() + durationMinutes * 60 * 1000);

  useEffect(() => {
    const newEndTime = Date.now() + durationMinutes * 60 * 1000;
    endTimeRef.current = newEndTime;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndTime(newEndTime);
  }, [durationMinutes]);

  const inputClass =
    "w-full rounded-pill border border-glass-border bg-white/[0.03] px-4 py-2.5 font-mono text-[11.5px] text-text transition-colors placeholder:text-text-dim focus:border-brand-500/60 focus:outline-none";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-auction-title"
          aria-describedby="create-auction-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={() => {
            if (!isSubmitting) onClose();
          }}
        >
<motion.div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-glass-border bg-white/[0.02] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-glass-border bg-canvas-elevated/50 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand-500/35 text-brand-400">
                    <Gavel className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div>
                    <span className="keyline">Seller ticket</span>
                    <h2
                      id="create-auction-title"
                      className="pt-1 font-display text-[27px] leading-none text-text"
                    >
                      List a lot
                    </h2>
                    <p
                      id="create-auction-description"
                      className="max-w-md pt-1.5 text-[11px] leading-relaxed text-text-muted"
                    >
                      Choose units from your wallet, set the opening price under the resale cap,
                      and name the floor where the descent stops.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  aria-label="Close create auction dialog"
                  className="flex h-8 w-8 items-center justify-center border border-glass-border text-text-muted transition-colors hover:text-text disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="auction-asset"
                    className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                  >
                    Asset from your wallet
                  </label>
                  <select
                    id="auction-asset"
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className={inputClass}
                  >
                    {holdings.length === 0 && <option value="">No holdings available</option>}
                    {holdings.map((holding) => (
                      <option key={holding.asset_id} value={holding.asset_id}>
                        {holding.name} — {formatQuantity(holding.available_units)} available
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="auction-qty"
                      className="font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                    >
                      Units to list
                    </label>
                    <span className="font-mono text-[9px] text-text-dim">
                      {formatQuantity(availableUnits)} free
                    </span>
                  </div>
                  <input
                    id="auction-qty"
                    type="number"
                    min="1"
                    max={Math.max(availableUnits, 1)}
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
                    className={cn(inputClass, isQuantityInvalid && "border-sell/60 text-sell-text")}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="auction-start-price"
                      className="font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                    >
                      Opening price ($)
                    </label>
                    <span className="font-mono text-[9px] text-warning">
                      Cap {ceilingPrice ? formatCurrency(ceilingPrice) : "—"}
                    </span>
                  </div>
                  <input
                    id="auction-start-price"
                    type="number"
                    step="0.50"
                    min="0"
                    value={startPriceInput}
                    onChange={(e) => setStartPriceInput(e.target.value)}
                    className={cn(
                      inputClass,
                      isAboveCeiling && "animate-ward-shake border-sell/60 text-sell-text"
                    )}
                  />
                  {isAboveCeiling && (
                    <p className="flex items-center gap-1 text-[10px] text-sell-text">
                      <ShieldAlert className="h-3 w-3" /> Above the resale cap for this asset.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="auction-floor-price"
                    className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                  >
                    Floor price ($)
                  </label>
                  <input
                    id="auction-floor-price"
                    type="number"
                    step="0.50"
                    min="0"
                    value={floorPriceInput}
                    onChange={(e) => setFloorPriceInput(e.target.value)}
                    className={cn(inputClass, isFloorInvalid && "border-sell/60 text-sell-text")}
                  />
                  {isFloorInvalid && (
                    <p className="text-[10px] text-sell-text">
                      Floor must be positive and no higher than the opening price.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="auction-step"
                    className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                  >
                    Price step interval
                  </label>
                  <select
                    id="auction-step"
                    value={stepSeconds}
                    onChange={(e) => setStepSeconds(parseInt(e.target.value, 10))}
                    className={inputClass}
                  >
                    <option value={15}>Every 15 seconds</option>
                    <option value={30}>Every 30 seconds</option>
                    <option value={60}>Every 60 seconds</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="auction-duration"
                    className="block font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim"
                  >
                    Time on the block
                  </label>
                  <select
                    id="auction-duration"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className={inputClass}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              {activeAsset && (
                <TheWard
                  ceilingPrice={activeAsset.ceiling_price}
                  faceValue={activeAsset.face_value}
                  ceilingPct={activeAsset.ceiling_pct}
                  currentInputPrice={startPriceMinor}
                />
              )}

              {activeAsset && (
                <TheWard
                  ceilingPrice={activeAsset.ceiling_price}
                  faceValue={activeAsset.face_value}
                  ceilingPct={activeAsset.ceiling_pct}
                  currentInputPrice={startPriceMinor}
                />
              )}

              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-glass-border">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                    <Hourglass className="h-3 w-3 text-brand-400" />
                    Illustrative descent
                  </span>
                  <span className="font-mono text-[9px] text-text-dim">
                    {stepSeconds}s steps · {durationMinutes}m
                  </span>
                </div>
                <DecayCurveChart
                  startPrice={startPriceMinor}
                  floorPrice={floorPriceMinor}
                  ceilingPrice={ceilingPrice}
                  currentPrice={startPriceMinor}
                  startTime={modalOpenTime}
                  endTime={endTime}
                  height={120}
                />
              </div>

              <div className="glass-card p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3 font-mono text-[9.5px]">
                  <div className="flex flex-col gap-1 p-3 rounded-tile border border-glass-border bg-white/[0.03]">
                    <span className="text-text-dim">Units reserved on listing</span>
                    <span className="tabular-nums text-text">
                      {formatQuantity(qty)} unit{qty === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-tile border border-glass-border bg-white/[0.03]">
                    <span className="text-text-dim">Opening takings</span>
                    <span className="tabular-nums text-text">
                      {formatCurrency(startPriceMinor * qty)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-tile border border-glass-border bg-white/[0.03]">
                    <span className="text-text-dim">Floor takings</span>
                    <span className="tabular-nums text-text">
                      {formatCurrency(floorPriceMinor * qty)}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-pill border border-sell/40 bg-sell-tint p-3 text-[11px] leading-relaxed text-text"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sell" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-pill border border-brand-500/25 bg-brand-500/10 p-3 text-[10px] leading-relaxed text-text-muted">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                <span>
                  Mock-only action. Listing succeeds against the in-memory server and reserves the
                  units immediately. A deployed backend has no auction-creation endpoint, so real
                  mode returns <span className="font-mono text-brand-300">BACKEND_UNSUPPORTED</span>{" "}
                  instead of pretending to list.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="font-mono text-[9px] text-text-dim">
                  {activeHolding
                    ? `${formatQuantity(availableUnits)} free unit${
                        availableUnits === 1 ? "" : "s"
                      } before this listing`
                    : "No eligible holdings"}
                </span>
                <div className="flex items-center gap-2">
                  <PillButton
                    variant="outlined"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </PillButton>
                  <PillButton
                    variant="primary"
                    size="sm"
                    onClick={handleCreate}
                    disabled={!canLaunch}
                    loading={isSubmitting}
                    leftIcon={<Gavel className="h-3.5 w-3.5" />}
                  >
                    {isSubmitting ? "Reserving units…" : "Launch lot"}
                  </PillButton>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
