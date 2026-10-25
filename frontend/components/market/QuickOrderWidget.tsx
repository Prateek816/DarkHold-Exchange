'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Asset } from '@/lib/types';
import { useMarketStore, useUserStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import { ArrowRight, ShieldCheck, CheckCircle2, ChevronDown } from 'lucide-react';

const NOTCHES = [0, 25, 50, 75, 100];

const FALLBACK_ASSET: Asset = {
  id: 'dfest-wkd',
  symbol: 'DFEST-WKD',
  name: 'Darkhold Fest Weekend Pass',
  category: 'PASS',
  face_value: 35000,
  ceiling_price: 42000,
  holding_cap: 4,
  last_price: 34800,
  change_24h: 12.4,
  high_24h: 36000,
  low_24h: 33500,
  best_bid: 34700,
  best_ask: 34900,
  total_asks: 24,
  volume_24h: 1420,
  has_sim: true,
  is_halted: false,
};

export function QuickOrderWidget() {
  const { assets } = useMarketStore();
  const { wallet, upsertOrder, setWallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  const [selectedAssetId, setSelectedAssetId] = useState('dfest-wkd');
  const [sliderPct, setSliderPct] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0] || FALLBACK_ASSET;
  const availableBal = wallet?.available_balance ?? 150000;

  // Spend Minor Units (cents)
  const spendCents = Math.round((availableBal * sliderPct) / 100);
  const unitPrice = selectedAsset?.last_price ?? 35000;
  const targetUnits = unitPrice > 0 ? Math.max(1, Math.floor(spendCents / unitPrice)) : 1;
  const isCeilingBreached = (selectedAsset?.last_price ?? 0) >= (selectedAsset?.ceiling_price ?? Infinity);

  const handleNotchClick = (pct: number) => {
    setSliderPct(pct);
    sound.playClick();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPct(Number(e.target.value));
    sound.playHover();
  };

  const handleQuickBuy = () => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    sound.playClick();

    // Place buy order into user store
    setTimeout(() => {
      upsertOrder({
        id: `ord-quick-${Date.now()}`,
        asset_id: selectedAsset.id,
        asset_symbol: selectedAsset.symbol,
        asset_name: selectedAsset.name,
        side: 'BUY',
        type: 'LIMIT',
        price: selectedAsset.last_price,
        quantity: targetUnits,
        filled_quantity: targetUnits,
        reserved_amount: spendCents,
        status: 'FILLED',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      if (wallet) {
        setWallet({
          ...wallet,
          available_balance: Math.max(0, wallet.available_balance - spendCents),
          total_balance: wallet.total_balance,
        });
      }

      pushToast({
        title: 'Instant Reserve Settled',
        body: `Reserved ${targetUnits}× ${selectedAsset.symbol} at ${fmt.price(selectedAsset.last_price)}. Double-entry ledger verified.`,
        variant: 'success',
      });

      sound.playChime(660);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="surface p-5 rounded-2xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-base text-white">Quick Order</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Instant Ledger Reservation</p>
          </div>
          <span className="chip chip-sim text-[10px]">DIRECT SETTLEMENT</span>
        </div>

        {/* 1. Spend Section */}
        <div className="surface-2 p-3.5 rounded-xl border border-[var(--border)] mb-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Spend (Credits)</span>
            <span className="font-mono tabular text-[11px]">
              Available: <strong className="text-white">{fmt.price(availableBal)}</strong>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono tabular text-2xl font-bold text-white">
              {fmt.price(spendCents)}
            </span>
            <span className="chip chip-lav font-mono text-xs font-semibold">SIM USD</span>
          </div>
        </div>

        {/* 2. Interactive Ticked Slider */}
        <div className="my-5 px-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-dim)] mb-2">
            <span>Allocation</span>
            <span className="text-[#38BDF8] font-bold text-xs">{sliderPct}%</span>
          </div>

          {/* Slider input with glowing cyan-blue track (ref-app.jpg style) */}
          <div className="relative py-1">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sliderPct}
              onChange={handleSliderChange}
              className="w-full accent-[#188CF1] cursor-pointer h-2 bg-[#090C16] border border-[rgba(255,255,255,0.08)] rounded-lg appearance-none shadow-inner"
            />
            {/* Visual Ruler Ticks */}
            <div className="flex justify-between px-1 -mt-1 pointer-events-none opacity-30 text-[8px] font-mono">
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
          </div>

          {/* Clickable Ticked Notches */}
          <div className="flex justify-between items-center mt-2.5">
            {NOTCHES.map((notch) => {
              const active = sliderPct === notch;
              return (
                <button
                  key={notch}
                  type="button"
                  onClick={() => handleNotchClick(notch)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    active
                      ? 'bg-[#188CF1] text-white font-bold shadow-md shadow-[rgba(24,140,241,0.45)]'
                      : 'text-[var(--text-dim)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  {notch}%
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Receive Asset Dropdown & Calculation */}
        <div className="surface-2 p-3.5 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span>Receive Asset</span>
            <div className="flex items-center gap-1 text-[var(--buy)] text-[11px] font-semibold">
              <ShieldCheck size={12} />
              <span>Face Value Shielded</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-mono tabular text-2xl font-bold text-white">
                {targetUnits} {targetUnits === 1 ? 'Unit' : 'Units'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)] mt-0.5">
                Est. {fmt.price(selectedAsset?.last_price ?? 0)} / unit
              </span>
            </div>

            {/* Asset Dropdown */}
            <select
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                sound.playClick();
              }}
              className="bg-[rgba(255,255,255,0.06)] border border-[var(--border)] rounded-lg text-xs font-mono text-white px-2.5 py-1.5 outline-none cursor-pointer hover:border-[rgba(255,255,255,0.2)]"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#0A0A11] text-white">
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price Ceiling warning if at or near cap */}
        {isCeilingBreached && (
          <div className="mt-3 p-2.5 rounded-lg bg-[rgba(255,181,71,0.08)] border border-[rgba(255,181,71,0.3)] text-[11px] text-[var(--ceiling)] flex items-center gap-2">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Anti-scalp ceiling active ({fmt.price(selectedAsset.ceiling_price)} max limit).</span>
          </div>
        )}
      </div>

      {/* 4. Action Buttons */}
      <div className="mt-5 space-y-2">
        <button
          onClick={handleQuickBuy}
          disabled={isSubmitting || spendCents <= 0}
          className="w-full py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#188CF1] to-[#0284C7] hover:brightness-110 text-white shadow-lg shadow-[rgba(24,140,241,0.3)] transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Settling to Ledger…
            </span>
          ) : (
            <>
              Instant Reserve ({targetUnits} {selectedAsset.symbol})
              <CheckCircle2 size={16} />
            </>
          )}
        </button>

        <Link
          href={`/trade/${selectedAsset.id}`}
          className="w-full py-2 text-xs font-medium text-[var(--text-muted)] hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          Open in Advanced Terminal <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
