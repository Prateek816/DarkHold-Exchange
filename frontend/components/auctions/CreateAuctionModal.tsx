"use client";

import React, { useEffect, useState } from "react";
import { WalletHolding } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { DecayCurveChart } from "./DecayCurveChart";
import { useUiStore } from "@/lib/stores/uiStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gavel, ShieldAlert, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: WalletHolding[];
  onAuctionCreated?: () => void;
}

export function CreateAuctionModal({
  isOpen,
  onClose,
  holdings,
  onAuctionCreated,
}: CreateAuctionModalProps) {
  const { addToast } = useUiStore();

  const [selectedAssetId, setSelectedAssetId] = useState(
    holdings[0]?.asset_id || "DARKHOLD-PASS-2026"
  );
  const [qty, setQty] = useState<number>(1);
  const [startPriceInput, setStartPriceInput] = useState<string>("270.00");
  const [floorPriceInput, setFloorPriceInput] = useState<string>("230.00");
  const [stepSeconds, setStepSeconds] = useState<number>(15);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  // Keep the selected holding valid if the vault loads or changes while mounted.
  useEffect(() => {
    if (
      holdings.length > 0 &&
      !holdings.some((holding) => holding.asset_id === selectedAssetId)
    ) {
      setSelectedAssetId(holdings[0].asset_id);
    }
  }, [holdings, selectedAssetId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const activeHolding = holdings.find((h) => h.asset_id === selectedAssetId);
  const ceilingPrice = 27500; // Simulated ceiling
  const availableUnits = activeHolding?.available_units ?? 0;

  const parseMinor = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };

  const startPriceMinor = parseMinor(startPriceInput);
  const floorPriceMinor = parseMinor(floorPriceInput);

  const isAboveCeiling = startPriceMinor > ceilingPrice;
  const isFloorInvalid = floorPriceMinor > startPriceMinor || floorPriceMinor <= 0;
  const isQuantityInvalid = qty < 1 || qty > availableUnits;
  const canLaunch = Boolean(activeHolding) && !isAboveCeiling && !isFloorInvalid && !isQuantityInvalid;

  const handleCreate = () => {
    if (!activeHolding) {
      addToast({
        type: "error",
        title: "No units available",
        message: "Acquire a pass or relic before launching an auction.",
      });
      return;
    }

    if (isAboveCeiling) {
      addToast({
        type: "error",
        title: "The Ward rejection",
        message: "Start price exceeds the festival resale ceiling cap.",
      });
      return;
    }

    if (isFloorInvalid) {
      addToast({
        type: "error",
        title: "Invalid floor price",
        message: "Floor price must be positive and less than or equal to the start price.",
      });
      return;
    }

    if (isQuantityInvalid) {
      addToast({
        type: "error",
        title: "Invalid quantity",
        message: `You can auction between 1 and ${availableUnits} unit(s).`,
      });
      return;
    }

    addToast({
      type: "success",
      title: "Dutch auction created",
      message: `Auction launched for ${qty}x ${activeHolding.symbol || "relic"}. Units locked in vault reservation.`,
    });

    onClose();
    onAuctionCreated?.();
  };

  const now = Date.now();
  const endTime = now + durationMinutes * 60 * 1000;

  const inputClass =
    "w-full rounded-[11px] border border-glass-border bg-white/[0.035] px-3.5 py-2.5 font-mono text-xs text-text transition-colors placeholder:text-text-dim focus:border-brand-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-brand-500/40";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-auction-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[12px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-[22px] border border-glass-border-strong bg-canvas-elevated/95 p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-[24px] sm:p-7 no-scrollbar"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-glass-border pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-brand-500/30 bg-brand-500/10 text-brand-400 shadow-glow-teal">
                  <Gavel className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <h3
                    id="create-auction-title"
                    className="font-display text-[16px] font-semibold tracking-tight text-text"
                  >
                    Create Dutch auction
                  </h3>
                  <p className="pt-0.5 text-[11px] text-text-muted">
                    Configure automated descending price steps.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close create auction dialog"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/[0.04] text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="auction-asset"
                  className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                >
                  Asset from holdings
                </label>
                <select
                  id="auction-asset"
                  value={activeHolding ? selectedAssetId : ""}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    setQty(1);
                  }}
                  className={inputClass}
                >
                  {holdings.length === 0 && <option value="">No holdings available</option>}
                  {holdings.map((h) => (
                    <option
                      key={h.asset_id}
                      value={h.asset_id}
                      className="bg-canvas-elevated text-text"
                    >
                      {h.name} ({formatQuantity(h.available_units)} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auction-qty"
                    className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                  >
                    Quantity to auction
                  </label>
                  <span className="font-mono text-[9px] text-text-dim">
                    {formatQuantity(availableUnits)} avail
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
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auction-start-price"
                    className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                  >
                    Start price ($)
                  </label>
                  <span className="font-mono text-[9px] text-warning">
                    Cap {formatCurrency(ceilingPrice)}
                  </span>
                </div>
                <input
                  id="auction-start-price"
                  type="number"
                  step="0.50"
                  value={startPriceInput}
                  onChange={(e) => setStartPriceInput(e.target.value)}
                  className={cn(
                    inputClass,
                    isAboveCeiling && "animate-ward-shake border-sell/60 bg-sell/[0.07] text-sell-text"
                  )}
                />
                {isAboveCeiling && (
                  <p className="flex items-center gap-1 text-[10px] text-sell-text">
                    <ShieldAlert className="h-3 w-3" /> Above The Ward ceiling.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auction-floor-price"
                  className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                >
                  Floor reserve price ($)
                </label>
                <input
                  id="auction-floor-price"
                  type="number"
                  step="0.50"
                  value={floorPriceInput}
                  onChange={(e) => setFloorPriceInput(e.target.value)}
                  className={cn(inputClass, isFloorInvalid && "border-sell/60 text-sell-text")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auction-step"
                  className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                >
                  Tick interval
                </label>
                <select
                  id="auction-step"
                  value={stepSeconds}
                  onChange={(e) => setStepSeconds(parseInt(e.target.value, 10))}
                  className={inputClass}
                >
                  <option value={15} className="bg-canvas-elevated text-text">Every 15 seconds</option>
                  <option value={30} className="bg-canvas-elevated text-text">Every 30 seconds</option>
                  <option value={60} className="bg-canvas-elevated text-text">Every 60 seconds</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auction-duration"
                  className="block font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim"
                >
                  Auction duration
                </label>
                <select
                  id="auction-duration"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  className={inputClass}
                >
                  <option value={15} className="bg-canvas-elevated text-text">15 minutes</option>
                  <option value={30} className="bg-canvas-elevated text-text">30 minutes</option>
                  <option value={60} className="bg-canvas-elevated text-text">1 hour</option>
                  <option value={120} className="bg-canvas-elevated text-text">2 hours</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2 rounded-panel border border-glass-border bg-white/[0.015] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  <Hourglass className="h-3 w-3 text-brand-400" />
                  Live decay preview
                </span>
                <span className="font-mono text-[9px] text-text-dim">
                  {stepSeconds}s ticks · {durationMinutes}m
                </span>
              </div>
              <DecayCurveChart
                startPrice={startPriceMinor}
                floorPrice={floorPriceMinor}
                ceilingPrice={ceilingPrice}
                currentPrice={startPriceMinor}
                startTime={now}
                endTime={endTime}
                height={130}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-4">
              <span className="font-mono text-[10px] text-text-dim">
                {activeHolding
                  ? `Floor proceeds ${formatCurrency(floorPriceMinor * qty)} · cap-safe`
                  : "No eligible holdings"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  className="rounded-[11px] border border-glass-border px-4 py-2.5 text-[11.5px] font-medium text-text-muted transition-colors hover:bg-white/[0.05] hover:text-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canLaunch}
                  className="rounded-[11px] bg-gradient-to-r from-brand-400 to-brand-500 px-5 py-2.5 text-[11.5px] font-bold text-canvas shadow-[0_8px_24px_-8px_rgba(25,203,176,0.55)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Launch auction
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
