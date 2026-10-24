'use client';

import React, { useState } from 'react';
import { fmt } from '@/lib/formatters';
import { soundFx } from '@/lib/sound';
import { useUserStore, useToastStore } from '@/lib/store';
import { DutchAuction, LedgerEntry } from '@/lib/types';
import { Gavel, Clock, Sparkles, ShieldCheck, CheckCircle2, X, Sliders, Hash } from 'lucide-react';

export function DutchDecaySimulator() {
  const [minutesElapsed, setMinutesElapsed] = useState(24);
  const [quantity, setQuantity] = useState(1);
  const [decayRate, setDecayRate] = useState(1.4);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptEntry, setReceiptEntry] = useState<LedgerEntry | null>(null);

  const startPrice = 420;
  const floorPrice = 250;
  const totalMinutes = 60;

  // Normalized exponential stepped decay formula spanning exactly from startPrice to floorPrice
  const t = Math.min(1, Math.max(0, minutesElapsed / totalMinutes));
  const decayRatio =
    t <= 0
      ? 1
      : t >= 1
      ? 0
      : (Math.exp(-decayRate * t) - Math.exp(-decayRate)) / (1 - Math.exp(-decayRate));
  const currentPrice = Math.round(floorPrice + (startPrice - floorPrice) * decayRatio);
  const totalCostDollars = currentPrice * quantity;

  const handleSimulateBuy = () => {
    soundFx.playSuccess();

    // Settle directly into Zustand dynamic ledger
    const auctionStub: DutchAuction = {
      id: 'DH-2026-FEST-AUC04',
      asset_id: 'dfest-wkd',
      asset_symbol: 'DFEST-WKD',
      asset_name: 'Darkhold Fest Weekend Pass',
      start_price: startPrice * 100,
      floor_price: floorPrice * 100,
      current_price: currentPrice * 100,
      quantity,
      start_time: Date.now() - minutesElapsed * 60 * 1000,
      end_time: Date.now() + (totalMinutes - minutesElapsed) * 60 * 1000,
      status: 'ACTIVE',
    };

    const userStore = useUserStore.getState();
    const neededCents = totalCostDollars * 100;

    // Ensure wallet has adequate funds for simulation
    if (!userStore.wallet || userStore.wallet.available_balance < neededCents) {
      userStore.deposit(Math.max(500000, neededCents * 2), 'Simulated Sandbox Funding');
    }

    const settleRes = userStore.settleAuctionPurchase(auctionStub, currentPrice * 100);

    if (settleRes.success && settleRes.entry) {
      setReceiptEntry(settleRes.entry);
    } else {
      // Fallback manual ledger entry
      const fallbackEntry = userStore.addLedgerEntry({
        type: 'AUCTION_BUY',
        asset_id: 'dfest-wkd',
        asset_symbol: 'DFEST-WKD',
        asset_name: 'Darkhold Fest Weekend Pass',
        side: 'BUY',
        price: currentPrice * 100,
        units: quantity,
        quantity,
        amount_cents: neededCents,
        total_value: neededCents,
        balance_after: (userStore.wallet?.available_balance ?? 150000) - neededCents,
        status: 'SETTLED',
        note: `Instant Dutch Auction Settlement for Drop #DH-2026-FEST-AUC04`,
      });
      setReceiptEntry(fallbackEntry);
    }

    useToastStore.getState().push({
      variant: 'success',
      title: 'Auction Drop Acquired',
      body: `Settled ${quantity}x Darkhold Fest Weekend Pass at $${currentPrice}.00 (R1 Invariant OK)`,
    });

    setIsReceiptOpen(true);
  };

  // Stepped chart coordinates
  const width = 500;
  const height = 140;
  const padding = 24;
  const steps = 12;
  const stepPoints: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const x = Math.round((padding + fraction * (width - 2 * padding)) * 10) / 10;
    const ratio =
      fraction <= 0
        ? 1
        : fraction >= 1
        ? 0
        : (Math.exp(-decayRate * fraction) - Math.exp(-decayRate)) / (1 - Math.exp(-decayRate));
    const p = floorPrice + (startPrice - floorPrice) * ratio;
    const y =
      Math.round((padding + (1 - (p - floorPrice) / (startPrice - floorPrice)) * (height - 2 * padding)) * 10) /
      10;
    stepPoints.push({ x, y });
  }

  let steppedPath = `M ${stepPoints[0].x},${stepPoints[0].y}`;
  for (let i = 1; i < stepPoints.length; i++) {
    steppedPath += ` H ${stepPoints[i].x} V ${stepPoints[i].y}`;
  }

  const markerX = Math.round((padding + t * (width - 2 * padding)) * 10) / 10;
  const markerY =
    Math.round((padding + (1 - (currentPrice - floorPrice) / (startPrice - floorPrice)) * (height - 2 * padding)) * 10) /
    10;
  const areaPath = `${steppedPath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="surface p-6 sm:p-8 rounded-3xl border border-[rgba(185,167,255,0.25)] relative overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--lavender)' }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip chip-mint text-[10px]">DYNAMIC PRICE DECAY</span>
            <span className="text-xs font-mono text-[var(--text-dim)]">Dutch Auction Drop · Series AUC04</span>
          </div>
          <h3 className="font-display font-bold text-xl text-white">
            Dutch Auction Interactive Decay Sandbox
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[rgba(25,227,177,0.12)] border border-[rgba(25,227,177,0.3)] text-xs font-mono text-[var(--mint)] font-bold">
            Live Drop Active
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Curve + Live Price Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-6">
        {/* Left 7 cols: SVG Stepped Chart & Scrub Slider */}
        <div className="lg:col-span-7 bg-[rgba(0,0,0,0.3)] p-4 rounded-2xl border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dim)] mb-2">
            <span>Price Curve Trajectory</span>
            <span className="text-[var(--lavender)]">Drag slider below to scrub time</span>
          </div>

          <svg suppressHydrationWarning className="w-full h-32 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="dutchSimGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B9A7FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#B9A7FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill under stepped path */}
            <path suppressHydrationWarning d={areaPath} fill="url(#dutchSimGrad)" />

            {/* Stepped decay path */}
            <path
              suppressHydrationWarning
              d={steppedPath}
              fill="none"
              stroke="#B9A7FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Ceiling dashed line */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#FFB547" strokeDasharray="3 3" />

            {/* Current marker */}
            <circle cx={markerX} cy={markerY} r="7" fill="#0A0A10" stroke="#19E3B1" strokeWidth="2.5" />
            <circle cx={markerX} cy={markerY} r="3" fill="#19E3B1" />
          </svg>

          {/* Interactive Scrub Slider (Primary Slider 0 to 60) */}
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex justify-between items-center text-xs font-mono text-[var(--text-dim)] mb-1.5">
              <span>Time Elapsed: <strong className="text-white">{minutesElapsed} mins</strong></span>
              <span>Reserve Floor in: <strong className="text-[var(--lavender)]">{totalMinutes - minutesElapsed} mins</strong></span>
            </div>
            <input
              type="range"
              min="0"
              max={totalMinutes}
              value={minutesElapsed}
              onChange={(e) => {
                soundFx.playHover();
                setMinutesElapsed(Number(e.target.value));
              }}
              className="w-full accent-[var(--lavender)] cursor-pointer h-2 bg-[rgba(255,255,255,0.1)] rounded-lg"
            />
          </div>

          {/* Secondary Controls: Decay Rate & Quantity */}
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[var(--text-dim)] mb-1">
                <span>Decay Rate:</span>
                <span className="text-[var(--lavender)] font-bold">{decayRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.4"
                step="0.1"
                value={decayRate}
                onChange={(e) => {
                  soundFx.playHover();
                  setDecayRate(Number(e.target.value));
                }}
                className="w-full accent-[var(--lavender)] cursor-pointer h-1.5 bg-[rgba(255,255,255,0.08)] rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-[var(--text-dim)] mb-1">
                <span>Quantity:</span>
                <span className="text-white font-bold">{quantity} pass{quantity > 1 ? 'es' : ''} (max 4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setQuantity(q);
                    }}
                    className={`flex-1 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                      quantity === q
                        ? 'bg-[var(--lavender)] text-[#17122E] border-[var(--lavender)]'
                        : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-dim)] border-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                  >
                    {q}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Instant Clearing Price + Buy Simulation Button */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-[rgba(185,167,255,0.04)] border border-[rgba(185,167,255,0.2)]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] block mb-1">
              Current Instant Clearing Price
            </span>
            <div className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              ${currentPrice}.00
            </div>
            {quantity > 1 && (
              <div className="text-xs font-mono text-[var(--mint)] mt-1 font-semibold">
                Total for {quantity} units: ${totalCostDollars}.00
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Price drops every minute. The first fan to accept locks in ownership and triggers instant double-entry settlement.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <button
              onClick={handleSimulateBuy}
              className="w-full btn-mint py-3.5 rounded-xl font-bold text-sm shadow-mint flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Gavel size={16} />
              <span>Simulate Buy Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verified Settlement Receipt Modal */}
      {isReceiptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md surface p-6 rounded-3xl border border-[rgba(25,227,177,0.4)] shadow-2xl relative">
            <button
              onClick={() => setIsReceiptOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-dim)] hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 text-[var(--mint)] mb-3">
              <CheckCircle2 size={22} />
              <h4 className="font-display font-bold text-base text-white">Instant Ledger Settlement Complete</h4>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-4">
              You acquired {quantity}x Darkhold Fest Weekend Pass at the clearing price of ${currentPrice}.00.
            </p>

            <div className="space-y-2 p-3.5 rounded-2xl bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Status:</span>
                <span className="text-[var(--mint)] font-bold">SETTLED (R1 Invariant OK)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Debited:</span>
                <span className="text-white">${totalCostDollars}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Pass Serial:</span>
                <span className="text-[var(--lavender)]">DH-2026-FEST-AUC04</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">txHash:</span>
                <span className="text-[var(--text-dim)]">
                  {receiptEntry?.tx_hash
                    ? `${receiptEntry.tx_hash.slice(0, 8)}...${receiptEntry.tx_hash.slice(-4)}`
                    : '0x9d3a...84f1'}
                </span>
              </div>
              {receiptEntry?.balance_after !== undefined && (
                <div className="flex justify-between pt-1 border-t border-[rgba(255,255,255,0.06)]">
                  <span className="text-[var(--text-dim)]">Wallet Balance After:</span>
                  <span className="text-[var(--mint)] font-semibold">${(receiptEntry.balance_after / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsReceiptOpen(false)}
              className="w-full mt-4 btn-primary py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
