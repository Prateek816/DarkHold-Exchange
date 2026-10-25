'use client';

import React, { useState } from 'react';
import { useMarketStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { soundFx } from '@/lib/sound';
import { DutchAuction, Asset } from '@/lib/types';
import { Gavel, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (auction: DutchAuction) => void;
}

export function CreateAuctionModal({ isOpen, onClose, onCreated }: CreateAuctionModalProps) {
  const { assets, auctions, setAuctions } = useMarketStore();
  const pushToast = useToastStore((s) => s.push);

  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || 'dfest-wkd');
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const defaultStart = selectedAsset ? Math.round(selectedAsset.ceiling_price / 100) : 400;
  const defaultFloor = selectedAsset ? Math.round((selectedAsset.face_value || selectedAsset.ceiling_price * 0.7) / 100) : 250;

  const [startPrice, setStartPrice] = useState<number>(defaultStart);
  const [floorPrice, setFloorPrice] = useState<number>(defaultFloor);
  const [units, setUnits] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);

  if (!isOpen) return null;

  const startPriceCents = Math.round(startPrice * 100);
  const floorPriceCents = Math.round(floorPrice * 100);
  const ceilingCents = selectedAsset?.ceiling_price || 50000;

  // Invariant Rule R3: Cannot exceed 120% ceiling
  const isCeilingExceeded = startPriceCents > ceilingCents;
  const isFloorInvalid = floorPriceCents >= startPriceCents || floorPriceCents <= 0;
  const isValid = !isCeilingExceeded && !isFloorInvalid && units >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCeilingExceeded) {
      soundFx.playClick();
      pushToast({
        variant: 'error',
        title: 'Rule R3 Ceiling Rejection',
        body: `Start price ${fmt.price(startPriceCents)} exceeds 120% resale cap of ${fmt.price(ceilingCents)}.`,
      });
      return;
    }

    if (isFloorInvalid) {
      soundFx.playClick();
      pushToast({
        variant: 'error',
        title: 'Invalid Reserve Floor',
        body: 'Reserve floor price must be strictly less than starting ask and greater than $0.',
      });
      return;
    }

    const newAuction: DutchAuction = {
      id: `auc-${Date.now().toString(36)}`,
      asset_id: selectedAsset.id,
      asset_symbol: selectedAsset.symbol,
      asset_name: selectedAsset.name,
      start_price: startPriceCents,
      floor_price: floorPriceCents,
      current_price: startPriceCents,
      start_time: Date.now(),
      end_time: Date.now() + durationMinutes * 60 * 1000,
      status: 'ACTIVE',
      quantity: units,
    };

    setAuctions([newAuction, ...auctions]);
    soundFx.playSuccess();
    onClose();
    onCreated?.(newAuction);

    pushToast({
      variant: 'success',
      title: 'Auction Drop Scheduled',
      body: `Created Dutch auction for ${fmt.price(startPriceCents)} decaying to ${fmt.price(floorPriceCents)}.`,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg card-pod p-6 border border-[var(--line)] shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-2">
            <Gavel size={18} className="text-[var(--lav)]" />
            <h3 className="text-base font-bold text-white">Create Dutch Auction Drop</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--raised)] text-[var(--muted)] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white block mb-1">Select Asset</label>
            <select
              value={selectedAssetId}
              onChange={(e) => {
                const aid = e.target.value;
                setSelectedAssetId(aid);
                const ast = assets.find((a) => a.id === aid);
                if (ast) {
                  setStartPrice(Math.round(ast.ceiling_price / 100));
                  setFloorPrice(Math.round((ast.face_value || ast.ceiling_price * 0.7) / 100));
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs text-white focus:outline-none focus:border-[var(--lav)]"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.symbol}) · 120% Cap: {fmt.price(a.ceiling_price)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-white">Starting Price ($)</label>
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  Cap: {fmt.price(ceilingCents)}
                </span>
              </div>
              <input
                type="number"
                step="1"
                min="1"
                value={startPrice}
                onChange={(e) => setStartPrice(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl bg-[var(--inset)] border text-xs font-mono text-white focus:outline-none ${
                  isCeilingExceeded
                    ? 'border-[var(--sell)] focus:border-[var(--sell)]'
                    : 'border-[var(--line)] focus:border-[var(--lav)]'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-white">Floor Reserve ($)</label>
                <span className="text-[10px] font-mono text-[var(--muted)]">Min Price</span>
              </div>
              <input
                type="number"
                step="1"
                min="1"
                value={floorPrice}
                onChange={(e) => setFloorPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs font-mono text-white focus:outline-none focus:border-[var(--lav)]"
              />
            </div>
          </div>

          {/* R3 Invariant Warning Banner */}
          {isCeilingExceeded && (
            <div className="p-3 rounded-xl bg-[rgba(255,90,95,0.08)] border border-[rgba(255,90,95,0.3)] flex items-start gap-2.5 text-xs text-[var(--sell)]">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Invariant Rule R3 Violation</span>
                <span className="text-[11px] text-[var(--muted)]">
                  Starting price of {fmt.price(startPriceCents)} exceeds maximum allowed 120% face value ceiling ({fmt.price(ceilingCents)}) for {selectedAsset?.name}.
                </span>
              </div>
            </div>
          )}

          {!isCeilingExceeded && (
            <div className="p-2.5 rounded-xl bg-[rgba(61,220,110,0.05)] border border-[rgba(61,220,110,0.2)] flex items-center gap-2 text-[11px] text-[var(--buy)] font-mono">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Compliant with 120% resale ceiling rule (Cap: {fmt.price(ceilingCents)})</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Units (Quantity)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(10, Number(e.target.value))))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs font-mono text-white focus:outline-none focus:border-[var(--lav)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">Decay Window</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs text-white focus:outline-none focus:border-[var(--lav)]"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--line-soft)] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--lav)] text-[var(--lav-dark)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Schedule Auction Drop
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
