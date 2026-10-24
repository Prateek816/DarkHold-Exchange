'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useMarketStore, useUserStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { DutchAuction } from '@/lib/types';
import { DimTail } from '@/components/primitives/DimTail';
import { soundFx } from '@/lib/sound';
import ElectricBorder from '@/components/ui/ElectricBorder';
import {
  Gavel, Clock, CheckCircle2, AlertCircle, ArrowDownRight,
  Plus, ShieldCheck, Flame, Zap, ArrowRight, X, Sparkles
} from 'lucide-react';

/* ── Stepped Decay Chart SVG with amber ceiling and muted floor ─ */
function SteppedDecayChart({
  startPrice,
  floorPrice,
  currentPrice,
  ceilingPrice,
  progress,
}: {
  startPrice: number;
  floorPrice: number;
  currentPrice: number;
  ceilingPrice: number;
  progress: number; // 0 to 1
}) {
  const width = 480;
  const height = 120;
  const padding = 20;

  // Generate stepped decay curve points
  const steps = 8;
  const stepPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = padding + t * (width - 2 * padding);
    // Exponential or stepped decay:
    const priceRatio = Math.exp(-1.4 * t);
    const p = floorPrice + (startPrice - floorPrice) * priceRatio;
    const y = padding + (1 - (p - floorPrice) / (startPrice - floorPrice || 1)) * (height - 2 * padding);
    stepPoints.push({ x, y });
  }

  // Construct stepped path (horizontal then vertical drop)
  let steppedPath = `M ${stepPoints[0].x},${stepPoints[0].y}`;
  for (let i = 1; i < stepPoints.length; i++) {
    steppedPath += ` H ${stepPoints[i].x} V ${stepPoints[i].y}`;
  }

  // Current marker position along progress
  const markerIndex = Math.min(steps, Math.floor(progress * steps));
  const markerX = padding + progress * (width - 2 * padding);
  const currRatio = Math.exp(-1.4 * progress);
  const currP = floorPrice + (startPrice - floorPrice) * currRatio;
  const markerY = padding + (1 - (currP - floorPrice) / (startPrice - floorPrice || 1)) * (height - 2 * padding);

  const areaPath = `${steppedPath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <div className="w-full relative my-3 select-none">
      <svg className="w-full h-28 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="auctionDecayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9A7FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B9A7FF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill under steps */}
        <path d={areaPath} fill="url(#auctionDecayGrad)" />

        {/* Resale Ceiling reference dashed line (Amber #FFB547) */}
        <line
          x1={padding}
          y1={padding - 8}
          x2={width - padding}
          y2={padding - 8}
          stroke="#FFB547"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Reserve Floor reference dashed line */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Stepped decay line in Lavender */}
        <path
          d={steppedPath}
          fill="none"
          stroke="#B9A7FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current price marker */}
        <circle cx={markerX} cy={markerY} r="7" fill="#0A0A10" stroke="#B9A7FF" strokeWidth="2.5" />
        <circle cx={markerX} cy={markerY} r="3" fill="#B9A7FF" />
      </svg>

      {/* Floating Axis Labels */}
      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--muted)] px-1 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
          Cap: {fmt.price(ceilingPrice)}
        </span>
        <span className="text-[var(--lav)] font-bold">
          Now: {fmt.price(currentPrice)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)]" />
          Floor: {fmt.price(floorPrice)}
        </span>
      </div>
    </div>
  );
}

export default function DutchAuctionsPage() {
  const { auctions, acceptAuction, assets } = useMarketStore();
  const { wallet, setWallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(auctions[0]?.id || 'auc-dfest-01');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [receiptAuction, setReceiptAuction] = useState<DutchAuction | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating a new Dutch auction
  const [newAssetId, setNewAssetId] = useState(assets[0]?.id || 'dfest-wkd');
  const [newStartPrice, setNewStartPrice] = useState(420);
  const [newFloorPrice, setNewFloorPrice] = useState(250);
  const [newUnits, setNewUnits] = useState(1);

  const activeAuction = auctions.find((a) => a.id === selectedAuctionId) || auctions[0];
  const associatedAsset = assets.find((a) => a.id === activeAuction?.asset_id) || assets[0];

  const handleAccept = (auc: DutchAuction) => {
    soundFx.playClick();
    if (wallet && wallet.available_balance < auc.current_price) {
      pushToast({
        variant: 'error',
        title: 'Insufficient Balance',
        body: `Required ${fmt.price(auc.current_price)}, but your available balance is ${fmt.price(
          wallet.available_balance
        )}.`,
      });
      return;
    }

    setAcceptingId(auc.id);
    setTimeout(() => {
      setAcceptingId(null);
      acceptAuction(auc.id, 'usr-demo-judge-buyer');
      soundFx.playSuccess();

      if (wallet) {
        setWallet({
          ...wallet,
          available_balance: wallet.available_balance - auc.current_price,
          total_balance: wallet.total_balance,
        });
      }

      setReceiptAuction(auc);

      pushToast({
        variant: 'success',
        title: 'Auction Drop Accepted',
        body: `Acquired 1 unit of ${auc.asset_name} at ${fmt.price(
          auc.current_price
        )}. Ledger settlement executed.`,
      });
    }, 600);
  };

  const handleCreateAuction = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playSuccess();
    setShowCreateModal(false);
    pushToast({
      variant: 'success',
      title: 'Auction Drop Scheduled',
      body: `Created Dutch auction for ${fmt.price(newStartPrice * 100)} decaying to ${fmt.price(newFloorPrice * 100)}.`,
    });
  };

  const elapsed = Math.max(0, Date.now() - (activeAuction?.start_time || Date.now()));
  const duration = Math.max(1, (activeAuction?.end_time || Date.now() + 600000) - (activeAuction?.start_time || Date.now()));
  const progress = Math.min(1, Math.max(0, elapsed / duration));

  return (
    <MockBootstrap>
      <AppShell title="Dutch Auction Drops">
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Subtitle / Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                <Gavel size={13} className="text-[var(--lav)]" />
                <span>Dynamic price decay engine · Anti-scalping protected</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Dutch Auction Drops
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                Create Auction Drop
              </button>
              <div className="px-3.5 py-1.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] text-xs font-mono flex items-center gap-2">
                <span className="text-[var(--muted)]">Available:</span>
                <span className="font-bold text-[var(--lav)]">
                  {fmt.price(wallet?.available_balance ?? 150000)}
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TOP AUCTION ROW: ACTIVE AUCTION ASSET CARDS
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {auctions.map((auc) => {
              const isSelected = auc.id === selectedAuctionId;
              const isActive = auc.status === 'ACTIVE';
              return (
                <div
                  key={auc.id}
                  onClick={() => setSelectedAuctionId(auc.id)}
                  className={`card-pod p-5 cursor-pointer relative transition-all ${
                    isSelected
                      ? 'border-[var(--lav)] ring-1 ring-[var(--lav)]'
                      : 'hover:border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--raised)] border border-[var(--line-soft)] flex items-center justify-center font-bold text-xs text-[var(--lav)]">
                        {auc.asset_symbol.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{auc.asset_name}</h4>
                        <span className="text-[10px] font-mono text-[var(--muted)]">{auc.asset_symbol}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        isActive
                          ? 'bg-[rgba(185,167,255,0.12)] text-[var(--lav)] border border-[rgba(185,167,255,0.25)]'
                          : 'bg-[rgba(61,220,110,0.12)] text-[var(--buy)] border border-[rgba(61,220,110,0.25)]'
                      }`}
                    >
                      {auc.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-3 font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase block">Asking Price</span>
                      <div className="text-xl font-bold text-white">
                        <DimTail value={fmt.price(auc.current_price)} />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--muted)] uppercase block">Decay Step</span>
                      <div className="text-xs font-semibold text-[var(--lav)] flex items-center gap-1 justify-end">
                        <Clock size={12} />
                        {fmt.countdown(auc.end_time)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              HERO DETAIL VIEW CARD (72px price, stepped decay chart)
          ═══════════════════════════════════════════════════════════ */}
          {activeAuction && (
            <ElectricBorder
              borderRadius={24}
              color="#19E3B1"
              glowColor="#7B2FF7"
              speed={0.4}
              chaos={0.12}
              spread={0.2}
              thickness={1.0}
              strands={2}
              glow={0.25}
              intensity={0.45}
              arcs={0}
              flicker={0.1}
              active={true}
              interactive={true}
              className="w-full"
            >
              <div className="card-pod p-8 relative overflow-hidden rounded-3xl w-full">
              {/* Radial glow subtle backdrop */}
              <div
                className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none rounded-full blur-3xl opacity-20"
                style={{ background: 'var(--lav)' }}
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left 7 cols: 72px price, live timer, and action buttons */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-[var(--raised)] border border-[var(--line-soft)] text-white flex items-center gap-1.5">
                      <Flame size={13} className="text-[var(--lav)]" />
                      Live Dutch Auction
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono text-[var(--muted)]">
                      Drop #{activeAuction.id}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                      {activeAuction.asset_name}
                    </h2>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Anti-scalp protected Dutch auction. Price drops continuously until someone accepts or reaches reserve floor.
                    </p>
                  </div>

                  {/* 72px Big Price with DimTail */}
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[var(--muted)] block mb-1">
                      Instant Clearing Price
                    </span>
                    <div className="text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight">
                      <DimTail value={fmt.price(activeAuction.current_price)} />
                    </div>
                  </div>

                  {/* Countdown chip to next step */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex items-center gap-2 text-xs font-mono text-white">
                      <Clock size={14} className="text-[var(--lav)]" />
                      <span>Next price drop in: <strong>{fmt.countdown(activeAuction.end_time)}</strong></span>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] text-xs font-mono text-[var(--muted)]">
                      Floor: {fmt.price(activeAuction.floor_price)}
                    </div>
                  </div>

                  {/* Accept action button */}
                  <div className="pt-2 flex items-center gap-3">
                    {activeAuction.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleAccept(activeAuction)}
                        disabled={acceptingId === activeAuction.id}
                        className="btn-primary px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-[rgba(185,167,255,0.2)] cursor-pointer"
                      >
                        <Gavel size={16} />
                        {acceptingId === activeAuction.id
                          ? 'Locking on Ledger...'
                          : `Accept at current price (${fmt.price(activeAuction.current_price)})`}
                      </button>
                    ) : (
                      <div className="px-5 py-3 rounded-xl bg-[rgba(61,220,110,0.12)] border border-[rgba(61,220,110,0.3)] text-[var(--buy)] font-bold text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Drop Completed: Cleared at {fmt.price(activeAuction.current_price)}
                      </div>
                    )}

                    <Link
                      href={`/trade/${activeAuction.asset_id}`}
                      className="px-4 py-3 rounded-xl text-xs font-semibold bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white flex items-center gap-1.5 transition-all"
                    >
                      View in Terminal
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Right 5 cols: Stepped Decay Chart Pod */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-white">Price Decay Trajectory</span>
                      <span className="text-[10px] font-mono text-[var(--muted)]">Anti-Scalp Monitored</span>
                    </div>
                    <SteppedDecayChart
                      startPrice={activeAuction.start_price}
                      floorPrice={activeAuction.floor_price}
                      currentPrice={activeAuction.current_price}
                      ceilingPrice={associatedAsset.ceiling_price}
                      progress={progress}
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--line-soft)] grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Initial Ask</span>
                      <span className="text-white font-medium">{fmt.price(activeAuction.start_price)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Decay Rate</span>
                      <span className="text-[var(--lav)] font-medium">-$12 / min</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] block">Reserve Floor</span>
                      <span className="text-[var(--muted)] font-medium">{fmt.price(activeAuction.floor_price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ElectricBorder>
        )}

          {/* ═══════════════════════════════════════════════════════════
              CREATE AUCTION MODAL
          ═══════════════════════════════════════════════════════════ */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg card-pod p-6 border border-[var(--line)] shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
                  <div className="flex items-center gap-2">
                    <Gavel size={18} className="text-[var(--lav)]" />
                    <h3 className="text-base font-bold text-white">Create Dutch Auction Drop</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 rounded-lg hover:bg-[var(--raised)] text-[var(--muted)] hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateAuction} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white block mb-1">Select Asset</label>
                    <select
                      value={newAssetId}
                      onChange={(e) => setNewAssetId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs text-white focus:outline-none focus:border-[var(--lav)]"
                    >
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.symbol}) · Ceiling: {fmt.price(a.ceiling_price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-white block mb-1">
                        Starting Price ($)
                      </label>
                      <input
                        type="number"
                        value={newStartPrice}
                        onChange={(e) => setNewStartPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs font-mono text-white focus:outline-none focus:border-[var(--lav)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white block mb-1">
                        Floor Reserve ($)
                      </label>
                      <input
                        type="number"
                        value={newFloorPrice}
                        onChange={(e) => setNewFloorPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs font-mono text-white focus:outline-none focus:border-[var(--lav)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newUnits}
                      onChange={(e) => setNewUnits(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs font-mono text-white focus:outline-none focus:border-[var(--lav)]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--lav)] text-[var(--lav-dark)] hover:brightness-110"
                    >
                      Launch Auction Drop
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Receipt Modal */}
          {receiptAuction && (
            <div className="p-4 rounded-xl border border-[rgba(61,220,110,0.3)] bg-[rgba(61,220,110,0.06)] flex items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--buy)] shrink-0" />
                <div>
                  <span className="font-bold text-white">Settlement Verified: #{receiptAuction.id}</span>
                  <p className="text-[11px] text-[var(--muted)]">
                    {receiptAuction.asset_name} · Settled at {fmt.price(receiptAuction.current_price)} · Double-entry R1–R8 passed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptAuction(null)}
                className="px-3 py-1 rounded-lg border border-[var(--line-soft)] text-white hover:bg-[var(--raised)]"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
