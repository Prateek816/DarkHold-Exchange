"use client";

import React, { useState } from "react";
import { WalletHolding } from "@/lib/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { DecayCurveChart } from "./DecayCurveChart";
import { useUiStore } from "@/lib/stores/uiStore";
import { X, Gavel } from "lucide-react";
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

  if (!isOpen) return null;

  const activeHolding = holdings.find((h) => h.asset_id === selectedAssetId);
  const ceilingPrice = 27500; // Simulated ceiling

  const startPriceMinor = Math.round(parseFloat(startPriceInput || "0") * 100);
  const floorPriceMinor = Math.round(parseFloat(floorPriceInput || "0") * 100);

  const isAboveCeiling = startPriceMinor > ceilingPrice;
  const isFloorInvalid = floorPriceMinor > startPriceMinor;

  const handleCreate = () => {
    if (isAboveCeiling) {
      addToast({
        type: "error",
        title: "The Ward Rejection",
        message: "Start price exceeds the festival resale ceiling cap.",
      });
      return;
    }

    if (isFloorInvalid) {
      addToast({
        type: "error",
        title: "Invalid Floor Price",
        message: "Floor price must be less than or equal to start price.",
      });
      return;
    }

    addToast({
      type: "success",
      title: "Dutch Auction Created",
      message: `Auction launched for ${qty}x ${activeHolding?.symbol || "Relic"}. Units locked in vault reservation.`,
    });

    onClose();
    onAuctionCreated?.();
  };

  const now = Date.now();
  const endTime = now + durationMinutes * 60 * 1000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[12px] animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl rounded-24 border border-white/10 bg-[#080B10]/95 backdrop-blur-[24px] p-6 sm:p-8 font-sans text-xs shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Top hairline highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-10 bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Create Dutch Auction Dispenser
              </h3>
              <p className="text-[11px] text-text-muted">Configure automated descending price steps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Asset Selection */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">
              Select Asset From Holdings
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            >
              {holdings.map((h) => (
                <option key={h.asset_id} value={h.asset_id} className="bg-bg-2 text-white">
                  {h.name} ({h.available_units} avail)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">
              Quantity to Auction
            </label>
            <input
              type="number"
              min="1"
              max={activeHolding?.available_units || 1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Start Price */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted font-medium uppercase tracking-wider">Start Price ($)</span>
              <span className="text-warning font-mono">Cap: {formatCurrency(ceilingPrice)}</span>
            </div>
            <input
              type="number"
              step="0.50"
              value={startPriceInput}
              onChange={(e) => setStartPriceInput(e.target.value)}
              className={cn(
                "w-full bg-white/[0.04] border rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none transition-colors",
                isAboveCeiling
                  ? "border-sell bg-sell-tint animate-ward-shake text-sell"
                  : "border-white/10 focus:border-brand-500/50"
              )}
            />
          </div>

          {/* Floor Price */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">
              Floor Reserve Price ($)
            </label>
            <input
              type="number"
              step="0.50"
              value={floorPriceInput}
              onChange={(e) => setFloorPriceInput(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Step Seconds */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">
              Tick Interval
            </label>
            <select
              value={stepSeconds}
              onChange={(e) => setStepSeconds(parseInt(e.target.value, 10))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            >
              <option value={15} className="bg-bg-2 text-white">Every 15 Seconds</option>
              <option value={30} className="bg-bg-2 text-white">Every 30 Seconds</option>
              <option value={60} className="bg-bg-2 text-white">Every 60 Seconds</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-text-muted block text-[11px] font-medium uppercase tracking-wider">
              Auction Duration
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full bg-white/[0.04] border border-white/10 rounded-12 px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            >
              <option value={15} className="bg-bg-2 text-white">15 Minutes</option>
              <option value={30} className="bg-bg-2 text-white">30 Minutes</option>
              <option value={60} className="bg-bg-2 text-white">1 Hour</option>
              <option value={120} className="bg-bg-2 text-white">2 Hours</option>
            </select>
          </div>
        </div>

        {/* Live Preview of Decay Curve */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
            Live Decay Preview
          </span>
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-12 border border-white/10 text-xs font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isAboveCeiling || isFloorInvalid}
            className="px-5 py-2.5 rounded-12 bg-brand-500 hover:bg-brand-400 text-bg font-semibold text-xs font-sans transition-all shadow-[0_0_18px_rgba(25,203,176,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Launch Auction
          </button>
        </div>
      </div>
    </div>
  );
}
