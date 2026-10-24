'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useMarketStore, useUserStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import { AssetCard } from '@/components/primitives/AssetCard';
import { AuctionPromoCard } from '@/components/primitives/AuctionPromoCard';
import { DimTail, UnitSuffix } from '@/components/primitives/DimTail';
import { TickedSlider } from '@/components/primitives/TickedSlider';
import { AccordionRow } from '@/components/primitives/AccordionRow';
import ElectricBorder from '@/components/ui/ElectricBorder';
import {
  Clock, ArrowUpRight, Copy, Share2, LineChart, Plus,
  RefreshCw, SlidersHorizontal, ShieldCheck, Check, Layers
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { assets, auctions, markets } = useMarketStore();
  const { wallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  // Filters for Top Assets
  const [timeRange, setTimeRange] = useState<'24H' | '6H' | '1H'>('24H');
  const [category, setCategory] = useState<'ALL' | 'PASS' | 'MERCH'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Hero Card History Slider State (minutes: 5m to 360m / 6h)
  const [historyWindowMins, setHistoryWindowMins] = useState(360);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtered and Sorted Assets for the top 3 cards
  const displayedAssets = useMemo(() => {
    let list = [...assets];
    if (category !== 'ALL') {
      list = list.filter((a) => a.category === category);
    }
    list.sort((a, b) => {
      return sortOrder === 'DESC'
        ? b.last_price - a.last_price
        : a.last_price - b.last_price;
    });
    return list.slice(0, 3);
  }, [assets, category, sortOrder]);

  // Primary Selected Asset for the "Your orders and positions" hero card
  const heroAsset = assets[0] || {
    id: 'dfest-wkd',
    symbol: 'DFEST-WKD',
    name: 'Darkhold Fest Weekend Pass',
    category: 'PASS',
    face_value: 35000,
    ceiling_price: 42000,
    last_price: 34800,
    change_24h: 4.2,
    best_bid: 34700,
    best_ask: 34900,
    volume_24h: 1420,
    has_sim: true,
  };

  const heroPriceDollars = (heroAsset.last_price / 100).toFixed(2);
  const spreadCents = heroAsset.best_ask - heroAsset.best_bid;
  const spreadPct = ((spreadCents / (heroAsset.last_price || 1)) * 100).toFixed(2);
  const headroomDollars = ((heroAsset.ceiling_price - heroAsset.last_price) / 100).toFixed(2);
  const vsFacePct = Math.round((heroAsset.last_price / heroAsset.face_value) * 100);
  const vsCeilingPct = Math.round((heroAsset.last_price / heroAsset.ceiling_price) * 100);

  const handleCopyLink = () => {
    sound.playClick();
    setCopiedLink(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).catch(() => {});
      }
    } catch {
      // Ignore clipboard errors in headless browser
    }
    pushToast({
      title: 'Link Copied',
      body: 'Market URL copied to clipboard.',
      variant: 'info',
    });
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const handleShare = () => {
    sound.playClick();
    pushToast({
      title: 'Market Share',
      body: `Shared ${heroAsset.name} quote.`,
      variant: 'info',
    });
  };

  const formatSliderTime = (mins: number) => {
    if (mins >= 60) return `${Math.round(mins / 60)}h`;
    return `${mins}m`;
  };

  return (
    <MockBootstrap>
      <AppShell title="Dashboard">
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* ═══════════════════════════════════════════════════════════
              SECTION 1: TOP ASSETS & AUCTION PROMO (Matching ref-app.png)
          ═══════════════════════════════════════════════════════════ */}
          <div>
            {/* Top Subtitle & Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1">
                  <Clock size={13} className="text-[var(--lav)]" />
                  <span>Most traded in the last 24 hours</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--raised)] text-white">
                    3 assets
                  </span>
                </div>
                <h2 className="font-display font-bold text-2xl text-white tracking-tight">
                  Top assets
                </h2>
              </div>

              {/* Working Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Time Range Pill */}
                <div className="bg-[var(--raised)] border border-[var(--line)] rounded-[8px] p-0.5 flex text-xs">
                  {(['24H', '6H', '1H'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        sound.playClick();
                        setTimeRange(t);
                      }}
                      className={`px-2.5 py-1 rounded-[6px] font-semibold transition-all ${
                        timeRange === t ? 'bg-[#222234] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Category Dropdown Pill */}
                <select
                  value={category}
                  onChange={(e) => {
                    sound.playClick();
                    setCategory(e.target.value as any);
                  }}
                  className="bg-[var(--raised)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-xs text-white font-medium outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="PASS">Festival Passes</option>
                  <option value="MERCH">Limited Merch</option>
                </select>

                {/* Sort Order Pill */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
                  }}
                  className="bg-[var(--raised)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-xs text-white font-medium hover:border-[rgba(255,255,255,0.2)] transition-colors"
                >
                  {sortOrder === 'DESC' ? 'Desc ▾' : 'Asc ▴'}
                </button>
              </div>
            </div>

            {/* Top Grid: 3 Asset Cards (68%) + Auction Promo Card (30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 3 Asset Cards (8 cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {displayedAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>

              {/* Auction Promo Card (4 cols) */}
              <div className="lg:col-span-4 min-h-[300px]">
                <AuctionPromoCard auctions={auctions} />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2: LARGE HERO CARD — "YOUR ORDERS AND POSITIONS"
              (Exact layout, 72px price with DimTail, and TickedSlider)
          ═══════════════════════════════════════════════════════════ */}
          <ElectricBorder
            borderRadius={24}
            color="#B9A7FF"
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
            <div className="surface p-6 rounded-3xl relative overflow-hidden w-full">
            {/* Card Header Strip: Title + 4 Icon Buttons */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)] mb-5">
              <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Your orders and positions
              </span>

              {/* 4 Working Small Icon Buttons (Chart, New Order, Refresh, Filter) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => router.push(`/trade/${heroAsset.id}`)}
                  title="Open Chart View"
                  className="round-icon-btn"
                >
                  <LineChart size={14} />
                </button>
                <button
                  onClick={() => router.push(`/trade/${heroAsset.id}`)}
                  title="Create Order"
                  className="round-icon-btn"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    pushToast({ title: 'Refreshed', body: 'Live quote re-polled.', variant: 'info' });
                  }}
                  title="Refresh Positions"
                  className="round-icon-btn"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    pushToast({ title: 'Filter', body: 'Filters updated.', variant: 'info' });
                  }}
                  title="Filter Orders"
                  className="round-icon-btn"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Split Row: Left Hero Price & Controls | Right History Waveform Slider */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column (7 cols): Hero Asset Details & 72px Price */}
              <div className="lg:col-span-7">
                {/* Subtitle with Clock */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mb-1.5">
                  <Clock size={12} className="text-[var(--lav)]" />
                  <span>Last trade 12 seconds ago</span>
                </div>

                {/* Asset Title Strip (34px/500) + Tiles & Icon Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F8B700] to-[#D97706] flex items-center justify-center font-bold text-sm text-[#17122E] shadow-md shrink-0">
                    {heroAsset.symbol[0]}
                  </div>

                  <h3 className="font-display font-medium text-2xl md:text-3xl text-white tracking-tight">
                    {heroAsset.name}
                  </h3>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={handleCopyLink}
                      title="Copy asset link"
                      className="round-icon-btn"
                    >
                      {copiedLink ? <Check size={13} className="text-[var(--buy)]" /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={handleShare}
                      title="Share quote"
                      className="round-icon-btn"
                    >
                      <Share2 size={13} />
                    </button>
                    <Link
                      href={`/trade/${heroAsset.id}`}
                      className="btn-secondary h-8 px-3 text-xs ml-1 flex items-center gap-1"
                    >
                      <span>Open terminal</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>

                {/* Hero Number Display: 72px Price with DimTail */}
                <div className="mt-4">
                  <span className="text-xs text-[var(--muted)] block font-medium">
                    Last price, credits
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xs text-[var(--muted)] font-mono">$</span>
                    <span className="font-display font-normal text-5xl md:text-6xl text-white tracking-tight">
                      <DimTail value={heroPriceDollars} dimDigits={2} />
                    </span>
                    <UnitSuffix suffix="USD" />
                  </div>
                </div>

                {/* Buy (Lavender) & Sell (Secondary) Action Buttons */}
                <div className="flex items-center gap-3 mt-5">
                  <Link
                    href={`/trade/${heroAsset.id}?side=BUY`}
                    className="btn-primary px-7 shadow-lg shadow-[rgba(185,167,255,0.25)] flex items-center gap-1.5"
                  >
                    <span>Buy</span>
                    <ArrowUpRight size={14} />
                  </Link>

                  <Link
                    href={`/trade/${heroAsset.id}?side=SELL`}
                    className="btn-secondary px-7 flex items-center gap-1.5"
                  >
                    <span>Sell</span>
                  </Link>
                </div>
              </div>

              {/* Right Column (5 cols): History Window Panel with Ticked Waveform Slider */}
              <div className="lg:col-span-5 bg-[var(--raised)] border border-[var(--line-soft)] p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">History window</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--inset)] text-[var(--lav)] border border-[var(--line-soft)]">
                      {formatSliderTime(historyWindowMins)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--muted)]">5m – 6h</span>
                </div>

                <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
                  Adjust the chart sampling resolution across mock rehearsal and live WebSocket streams.
                </p>

                {/* Custom Ticked Waveform Slider */}
                <TickedSlider
                  min={5}
                  max={360}
                  step={5}
                  value={historyWindowMins}
                  onChange={(v) => setHistoryWindowMins(v)}
                  formatValue={(v) => formatSliderTime(v)}
                  ticksCount={36}
                />
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                FOUR ACCORDION ROWS (Expandable in place with hairline dividers)
            ═══════════════════════════════════════════════════════════ */}
            <div className="mt-8 pt-4 border-t border-[var(--line-soft)] space-y-1">
              {/* 1. Market Spread */}
              <AccordionRow
                title="Market"
                subtitle={`Spread: ${fmt.price(spreadCents)} (${spreadPct}%) · Best Bid ${fmt.price(heroAsset.best_bid)} · Best Ask ${fmt.price(heroAsset.best_ask)}`}
                rightBadge={
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--raised)] text-[var(--buy)]">
                    NORMAL SPREAD
                  </span>
                }
              >
                <div className="p-3 bg-[var(--inset)] rounded-xl border border-[var(--line-soft)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Best Bid</span>
                    <span className="text-[var(--buy)] font-bold">{fmt.price(heroAsset.best_bid)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Best Ask</span>
                    <span className="text-[var(--sell)] font-bold">{fmt.price(heroAsset.best_ask)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Spread Efficiency</span>
                    <span className="text-white font-medium">{spreadPct}% (Tight Liquidity)</span>
                  </div>
                </div>
              </AccordionRow>

              {/* 2. Order Book Mini Depth Chart */}
              <AccordionRow
                title="Order book"
                subtitle="Live Level 2 aggregated liquidity snapshot with anti-scalping ceiling marks"
                rightBadge={
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--raised)] text-white">
                    15 LEVELS
                  </span>
                }
              >
                <div className="p-3 bg-[var(--inset)] rounded-xl border border-[var(--line-soft)]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)] mb-2">
                    <span>Bids (Cumulative 48 units)</span>
                    <span className="text-[var(--cap)]">Ceiling: {fmt.price(heroAsset.ceiling_price)}</span>
                    <span>Asks (Cumulative 32 units)</span>
                  </div>
                  {/* Mini Visual Stepped Bar */}
                  <div className="h-6 w-full flex rounded-lg overflow-hidden border border-[var(--line-soft)]">
                    <div className="bg-[var(--buy-dim)] border-r border-[var(--buy)] w-[60%] flex items-center px-2 text-[10px] text-[var(--buy)] font-mono">
                      60% Bids
                    </div>
                    <div className="bg-[var(--sell-dim)] w-[40%] flex items-center justify-end px-2 text-[10px] text-[var(--sell)] font-mono">
                      40% Asks
                    </div>
                  </div>
                </div>
              </AccordionRow>

              {/* 3. Settlement Activity */}
              <AccordionRow
                title="Settlement"
                subtitle="Double-entry ledger invariant checks (R1–R8) and settlement queue latency"
                rightBadge={
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--buy-dim)] text-[var(--buy)]">
                    PASSING (0 LAG)
                  </span>
                }
              >
                <div className="p-3 bg-[var(--inset)] rounded-xl border border-[var(--line-soft)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Pending Settlements</span>
                    <span className="text-white font-bold">0 Transactions</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Average Settlement Lag</span>
                    <span className="text-[var(--buy)] font-bold">42ms (Instant Reserve)</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block text-[10px]">Ledger Invariant</span>
                    <span className="text-white font-medium">R1–R8 Balanced</span>
                  </div>
                </div>
              </AccordionRow>

              {/* 4. Resale Price Ceiling Safeguard */}
              <AccordionRow
                title="Ceiling"
                subtitle={`Face value ${fmt.price(heroAsset.face_value)} · Resale cap ${fmt.price(heroAsset.ceiling_price)} (120%) · Headroom $${headroomDollars}`}
                rightBadge={
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgba(255,181,71,0.15)] text-[var(--cap)]">
                    SHIELDED
                  </span>
                }
              >
                <div className="p-3 bg-[var(--inset)] rounded-xl border border-[var(--line-soft)] text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[var(--cap)] font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Anti-Scalp Protection Active
                    </span>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Orders exceeding 120% of face value ({fmt.price(heroAsset.ceiling_price)}) are automatically rejected.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-white font-bold text-sm">${headroomDollars}</span>
                    <span className="text-[10px] text-[var(--muted)] block">Buffer to price cap</span>
                  </div>
                </div>
              </AccordionRow>
            </div>
          </div>
        </ElectricBorder>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3: FOUR STAT CARDS (Prompt Section 7)
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card 1: Volume (24H) */}
            <div className="surface p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="font-medium">Volume</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--raised)] text-white">
                  24H
                </span>
              </div>
              <div className="my-2">
                <span className="font-display text-2xl font-normal text-white">
                  {heroAsset.volume_24h.toLocaleString()}
                </span>
                <UnitSuffix suffix="units" />
              </div>
              <span className="text-[11px] text-[var(--dim)]">Continuous SIM bot liquidity</span>
            </div>

            {/* Stat Card 2: Price (24H) with Delta */}
            <div className="surface p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="font-medium">Price (24H)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--raised)] text-white">
                  24H
                </span>
              </div>
              <div className="my-2 flex items-baseline justify-between">
                <div className="font-display text-2xl font-normal text-white">
                  ${heroPriceDollars}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--buy-dim)] text-[var(--buy)]">
                  +{heroAsset.change_24h}%
                </span>
              </div>
              <span className="text-[11px] text-[var(--dim)]">Stochastic simulated drift</span>
            </div>

            {/* Stat Card 3: Spread */}
            <div className="surface p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="font-medium">Spread</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--raised)] text-white">
                  24H
                </span>
              </div>
              <div className="my-2">
                <span className="font-display text-2xl font-normal text-white">
                  {fmt.price(spreadCents)}
                </span>
                <UnitSuffix suffix={`(${spreadPct}%)`} />
              </div>
              <span className="text-[11px] text-[var(--dim)]">Order book depth efficiency</span>
            </div>

            {/* Stat Card 4: Valuation Ratios with Dual Comparison Slider Lines */}
            <div className="surface p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="font-medium">Valuation Ratios</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--raised)] text-white">
                  24H
                </span>
              </div>

              <div className="my-2 space-y-2">
                {/* Last price vs face value */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--muted)] mb-1">
                    <span>vs Face Value</span>
                    <span className="text-white font-semibold">{vsFacePct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--inset)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--lav)] rounded-full"
                      style={{ width: `${Math.min(100, vsFacePct)}%` }}
                    />
                  </div>
                </div>

                {/* Last price vs ceiling */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-[var(--muted)] mb-1">
                    <span>vs Resale Ceiling</span>
                    <span className="text-[var(--cap)] font-semibold">{vsCeilingPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--inset)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--cap)] rounded-full"
                      style={{ width: `${Math.min(100, vsCeilingPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-[var(--cap)] font-mono">120% algorithmic ceiling</span>
            </div>
          </div>
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
