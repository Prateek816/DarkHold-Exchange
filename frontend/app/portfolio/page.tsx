'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useUserStore, useMarketStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { MOCK_LEDGER_STUBS } from '@/mocks/fixtures';
import { LedgerStub } from '@/lib/types';
import { DimTail } from '@/components/primitives/DimTail';
import ElectricBorder from '@/components/ui/ElectricBorder';
import {
  Wallet, Layers, Clock, FileText, CheckCircle2,
  ArrowUpRight, ArrowDownRight, ShieldCheck, X, Plus,
  Minus, ArrowRight, ExternalLink, Copy, Check,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';

/* ── Interactive Value Over Time Area Chart ─────────────────── */
function PortfolioValueChart({ period }: { period: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startPanOffset, setStartPanOffset] = useState(0);

  // Dynamic sample data based on period
  const points = period === '24H'
    ? [1480, 1492, 1488, 1510, 1502, 1515, 1528, 1535, 1520, 1542]
    : period === '7D'
    ? [1350, 1380, 1410, 1395, 1450, 1480, 1510, 1525, 1542]
    : [1100, 1180, 1250, 1320, 1400, 1460, 1510, 1542];

  const min = Math.min(...points) * 0.98;
  const max = Math.max(...points) * 1.02;
  const width = 640;
  const height = 140;

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.7, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPanOffset(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.min(2.5, Math.max(0.7, +(z + delta).toFixed(2))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setStartPanOffset(panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    setPanOffset(Math.max(-180, Math.min(180, startPanOffset + dx)));
  };

  const handleMouseUp = () => setIsDragging(false);

  const baseStep = (width - 40) / (points.length - 1);
  const step = baseStep * zoom;
  const centerIdx = (points.length - 1) / 2;
  const getX = (idx: number) => (width / 2) + (idx - centerIdx) * step + panOffset;
  const getY = (val: number) => height - 20 - ((val - min) / (max - min)) * (height - 40);

  const pathD = points.reduce((acc, val, idx) => {
    const x = getX(idx);
    const y = getY(val);
    if (idx === 0) return `M ${x},${y}`;
    const prevX = getX(idx - 1);
    const prevY = getY(points[idx - 1]);
    const cp1x = prevX + (x - prevX) / 2;
    const cp2x = cp1x;
    return `${acc} C ${cp1x},${prevY} ${cp2x},${y} ${x},${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)},${height} L ${getX(0)},${height} Z`;

  return (
    <div
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-[160px] mt-2 select-none overflow-hidden ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Zoom Mini-Toolbar */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-1 bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded-lg text-[10px] font-mono text-[var(--muted)]">
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-0.5 hover:text-white transition-colors"
        >
          <ZoomOut size={11} />
        </button>
        <span className="font-bold text-white px-0.5">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-0.5 hover:text-white transition-colors"
        >
          <ZoomIn size={11} />
        </button>
        {zoom !== 1.0 && (
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="p-0.5 text-[var(--lavender)] hover:text-white transition-colors"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9A7FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#B9A7FF" stopOpacity="0.0" />
          </linearGradient>
          <clipPath id="portChartClip">
            <rect x="0" y="0" width={width} height={height} />
          </clipPath>
        </defs>

        {/* Faint baseline */}
        <line
          x1="20"
          y1={height - 15}
          x2={width - 20}
          y2={height - 15}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />

        <g clipPath="url(#portChartClip)">
          {/* Area fill */}
          <path d={areaD} fill="url(#portGrad)" />

          {/* Spline line */}
          <path
            d={pathD}
            fill="none"
            stroke="#B9A7FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data points on hover */}
          {points.map((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            const isHovered = hoverIndex === idx;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Invisible touch target */}
                <circle cx={x} cy={y} r="14" fill="transparent" />
                {/* Visible ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? '6' : '3'}
                  fill="#0A0A10"
                  stroke="#B9A7FF"
                  strokeWidth={isHovered ? '3' : '2'}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && (
        <div
          className="absolute -top-3 pointer-events-none transform -translate-x-1/2 px-2.5 py-1 rounded-md bg-[var(--raised)] border border-[var(--line)] text-[11px] font-mono font-bold text-white shadow-lg z-20"
          style={{ left: `${Math.max(10, Math.min(90, (getX(hoverIndex) / width) * 100))}%` }}
        >
          {fmt.price(points[hoverIndex] * 100)}
        </div>
      )}
    </div>
  );
}

/* ── Allocation Donut SVG ────────────────────────────────────── */
function AllocationDonut({
  holdingsVal,
  availableCash,
  reservedCash,
}: {
  holdingsVal: number;
  availableCash: number;
  reservedCash: number;
}) {
  const total = holdingsVal + availableCash + reservedCash;
  const hPct = total > 0 ? (holdingsVal / total) * 100 : 30;
  const aPct = total > 0 ? (availableCash / total) * 100 : 55;
  const rPct = total > 0 ? (reservedCash / total) * 100 : 15;

  const circumference = 2 * Math.PI * 52;
  const hStroke = (hPct / 100) * circumference;
  const aStroke = (aPct / 100) * circumference;
  const rStroke = (rPct / 100) * circumference;

  return (
    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="10"
        />
        {/* Available Cash (Lavender) */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#B9A7FF"
          strokeWidth="10"
          strokeDasharray={`${aStroke} ${circumference}`}
          strokeDashoffset="0"
          strokeLinecap="round"
        />
        {/* Holdings Value (Green) */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#3DDC6E"
          strokeWidth="10"
          strokeDasharray={`${hStroke} ${circumference}`}
          strokeDashoffset={`-${aStroke + 4}`}
          strokeLinecap="round"
        />
        {/* Reserved Cash (Amber) */}
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#FFB547"
          strokeWidth="10"
          strokeDasharray={`${rStroke} ${circumference}`}
          strokeDashoffset={`-${aStroke + hStroke + 8}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] uppercase font-mono text-[var(--muted)]">Assets</span>
        <span className="text-xs font-bold font-mono text-white">100%</span>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { wallet, setWallet, holdings, orders, cancelOrder } = useUserStore();
  const { assets } = useMarketStore();
  const pushToast = useToastStore((s) => s.push);

  const [activeTab, setActiveTab] = useState<'HOLDINGS' | 'OPEN' | 'HISTORY' | 'TRANSACTIONS'>('HOLDINGS');
  const [chartPeriod, setChartPeriod] = useState<'24H' | '7D' | '30D'>('24H');
  const [selectedReceipt, setSelectedReceipt] = useState<LedgerStub | null>(null);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const openOrders = orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  const historyOrders = orders.filter(
    (o) => o.status === 'FILLED' || o.status === 'CANCELED' || o.status === 'REJECTED'
  );

  // Compute total market value of holdings
  const holdingsValue = holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.asset_id);
    const lastPrice = asset?.last_price ?? 0;
    return sum + lastPrice * (h.available_units + h.reserved_units);
  }, 0);

  const totalValuation = (wallet?.available_balance ?? 150000) + (wallet?.reserved_balance ?? 27800) + holdingsValue;

  const handleDeposit = () => {
    if (!wallet) return;
    setWallet({
      ...wallet,
      available_balance: wallet.available_balance + 50000,
      total_balance: wallet.total_balance + 50000,
    });
    pushToast({
      variant: 'success',
      title: 'Simulated Deposit',
      body: 'Credited 500.00 SIM credits to available balance.',
    });
  };

  const handleWithdraw = () => {
    if (!wallet || wallet.available_balance < 25000) {
      pushToast({
        variant: 'error',
        title: 'Insufficient Available Credits',
        body: 'Minimum 250.00 SIM credits required to withdraw.',
      });
      return;
    }
    setWallet({
      ...wallet,
      available_balance: wallet.available_balance - 25000,
      total_balance: wallet.total_balance - 25000,
    });
    pushToast({
      variant: 'info',
      title: 'Simulated Withdrawal',
      body: 'Withdrew 250.00 SIM credits from available balance.',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 1500);
    pushToast({
      variant: 'info',
      title: 'Copied to Clipboard',
      body: text,
    });
  };

  return (
    <MockBootstrap>
      <AppShell title="Portfolio & Wallet">
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
          {/* Subtitle / Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                <ShieldCheck size={13} className="text-[var(--buy)]" />
                <span>Simulated double-entry vault · Invariant R1–R8 verified</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Portfolio & Cash Drawer
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeposit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--lav)] text-[var(--lav-dark)] hover:brightness-110 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus size={14} />
                Simulate Deposit
              </button>
              <button
                onClick={handleWithdraw}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white flex items-center gap-1.5 transition-all"
              >
                <Minus size={14} />
                Simulate Withdraw
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TOP HERO ROW: CASH DRAWER & VALUE CHART + ALLOCATION DONUT
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 8 Cols: Valuation & Value Chart with Electric Current Border */}
            <div className="lg:col-span-8">
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
                <div className="card-pod p-6 flex flex-col justify-between rounded-3xl w-full">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                        Total Valuation (Credits + Assets)
                      </span>
                      {/* Period filter pills */}
                      <div className="flex items-center gap-1 bg-[var(--inset)] p-1 rounded-full border border-[var(--line-soft)]">
                        {(['24H', '7D', '30D'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setChartPeriod(p)}
                            className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-colors ${
                              chartPeriod === p
                                ? 'bg-[var(--raised)] text-white shadow-sm'
                                : 'text-[var(--muted)] hover:text-white'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-3 mt-2">
                      <div className="font-display font-bold text-4xl text-white tracking-tight">
                        <DimTail value={fmt.price(totalValuation)} />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[rgba(61,220,110,0.12)] text-[var(--buy)] border border-[rgba(61,220,110,0.25)]">
                        +4.2%
                      </span>
                    </div>

                    {/* Recessed Cash Drawer Strip */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Available Balance</span>
                          <span className="font-bold text-[var(--lav)]">{fmt.price(wallet?.available_balance ?? 150000)}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--line-soft)]" />
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Reserved in Orders</span>
                          <span className="font-bold text-[var(--cap)]">{fmt.price(wallet?.reserved_balance ?? 27800)}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--line-soft)]" />
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Holdings Value</span>
                          <span className="font-bold text-[var(--buy)]">{fmt.price(holdingsValue)}</span>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-[var(--dim)]">
                        Account: usr-judge-buyer
                      </div>
                    </div>
                  </div>

                  {/* Area Chart */}
                  <PortfolioValueChart period={chartPeriod} />
                </div>
              </ElectricBorder>
            </div>

            {/* Right 4 Cols: Allocation Donut & Vault Breakdown */}
            <div className="lg:col-span-4 card-pod p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
                  Portfolio Allocation
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Asset & liquidity diversification</p>

                <div className="flex items-center justify-center my-4">
                  <AllocationDonut
                    holdingsVal={holdingsValue}
                    availableCash={wallet?.available_balance ?? 150000}
                    reservedCash={wallet?.reserved_balance ?? 27800}
                  />
                </div>
              </div>

              {/* Legend Pods */}
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[var(--inset)] border border-[var(--line-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--lav)]" />
                    <span className="text-white">Available Credits</span>
                  </div>
                  <span className="text-[var(--muted)]">{fmt.price(wallet?.available_balance ?? 150000)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--inset)] border border-[var(--line-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--buy)]" />
                    <span className="text-white">Passes & Merch</span>
                  </div>
                  <span className="text-[var(--muted)]">{fmt.price(holdingsValue)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--inset)] border border-[var(--line-soft)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--cap)]" />
                    <span className="text-white">Reserved Escrow</span>
                  </div>
                  <span className="text-[var(--muted)]">{fmt.price(wallet?.reserved_balance ?? 27800)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TABS CONTAINER (Holdings, Open Orders, History, Receipts)
          ═══════════════════════════════════════════════════════════ */}
          <div className="card-pod overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--line-soft)] flex items-center justify-between bg-[rgba(255,255,255,0.01)] flex-wrap gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                <button
                  onClick={() => setActiveTab('HOLDINGS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'HOLDINGS'
                      ? 'bg-[var(--raised)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Holdings ({holdings.length})
                </button>
                <button
                  onClick={() => setActiveTab('OPEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'OPEN'
                      ? 'bg-[var(--raised)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Open Orders ({openOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'HISTORY'
                      ? 'bg-[var(--raised)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Order History ({historyOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('TRANSACTIONS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'TRANSACTIONS'
                      ? 'bg-[var(--raised)] text-white shadow-sm font-semibold'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Ledger Receipts ({MOCK_LEDGER_STUBS.length})
                </button>
              </div>

              <span className="text-[11px] font-mono text-[var(--muted)]">
                Auto-synced with matching engine
              </span>
            </div>

            {/* TAB: HOLDINGS */}
            {activeTab === 'HOLDINGS' && (
              <div className="p-5">
                {holdings.length === 0 ? (
                  <div className="text-center py-12 text-sm text-[var(--muted)]">
                    No holdings in wallet. Visit the market to acquire passes or merchandise.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {holdings.map((h) => {
                      const asset = assets.find((a) => a.id === h.asset_id);
                      const mktVal = (asset?.last_price ?? 0) * (h.available_units + h.reserved_units);
                      return (
                        <div
                          key={h.asset_id}
                          className="p-5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-col justify-between hover:border-[var(--line)] transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[var(--raised)] border border-[var(--line-soft)] flex items-center justify-center font-bold text-xs text-[var(--lav)]">
                                  {h.asset_symbol.slice(0, 2)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-white">{h.asset_name}</h4>
                                  <span className="text-[10px] font-mono text-[var(--muted)]">{h.asset_symbol}</span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(61,220,110,0.12)] text-[var(--buy)] border border-[rgba(61,220,110,0.25)]">
                                Active
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--line-soft)] my-3 font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-[var(--muted)] block">Available</span>
                                <span className="font-bold text-white">{h.available_units} units</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--muted)] block">Reserved</span>
                                <span className="text-[var(--cap)]">{h.reserved_units} units</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--muted)] block">Valuation</span>
                                <span className="font-bold text-[var(--buy)]">{fmt.price(mktVal)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <Link
                              href={`/trade/${h.asset_id}`}
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white text-center transition-all flex items-center justify-center gap-1.5"
                            >
                              Trade in Terminal
                              <ArrowRight size={13} />
                            </Link>
                            <Link
                              href="/auctions"
                              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[rgba(185,167,255,0.1)] border border-[rgba(185,167,255,0.2)] text-[var(--lav)] hover:bg-[rgba(185,167,255,0.18)] text-center transition-all"
                            >
                              Create Auction
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: OPEN ORDERS */}
            {activeTab === 'OPEN' && (
              <div className="p-5">
                {openOrders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-[var(--muted)]">
                    No active open orders in the matching engine.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-4 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              o.side === 'BUY'
                                ? 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)] border border-[rgba(61,220,110,0.3)]'
                                : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)] border border-[rgba(255,90,95,0.3)]'
                            }`}
                          >
                            {o.side}
                          </span>
                          <div>
                            <div className="font-bold text-white">{o.asset_name}</div>
                            <div className="text-[11px] text-[var(--muted)] font-mono">
                              #{fmt.shortId(o.id)} · {fmt.date(o.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 font-mono">
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Limit Price</span>
                            <span className="font-bold text-white">{fmt.price(o.price)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Quantity</span>
                            <span className="text-white">{o.quantity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Reserved Escrow</span>
                            <span className="text-[var(--cap)] font-medium">{fmt.price(o.reserved_amount)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => cancelOrder(o.id)}
                          className="px-3 py-1.5 rounded-lg border border-[rgba(255,90,95,0.3)] text-[var(--sell)] hover:bg-[rgba(255,90,95,0.1)] font-semibold transition-colors"
                        >
                          Cancel Order
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ORDER HISTORY */}
            {activeTab === 'HISTORY' && (
              <div className="p-5">
                {historyOrders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-[var(--muted)]">
                    No historical order activity recorded in this session.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-4 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              o.side === 'BUY'
                                ? 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)]'
                                : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)]'
                            }`}
                          >
                            {o.side}
                          </span>
                          <div>
                            <div className="font-bold text-white">{o.asset_name}</div>
                            <div className="text-[11px] text-[var(--muted)]">
                              #{fmt.shortId(o.id)} · {fmt.date(o.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Price</span>
                            <span className="text-white">{fmt.price(o.price)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Filled</span>
                            <span className="text-white">{o.filled_quantity}/{o.quantity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--muted)] block">Status</span>
                            <span className="text-[var(--buy)] font-semibold">{o.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: LEDGER RECEIPTS */}
            {activeTab === 'TRANSACTIONS' && (
              <div className="p-5">
                <div className="space-y-3">
                  {MOCK_LEDGER_STUBS.map((stub) => (
                    <div
                      key={stub.id}
                      onClick={() => setSelectedReceipt(stub)}
                      className="p-4 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--lav)] cursor-pointer flex flex-wrap items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(61,220,110,0.12)] text-[var(--buy)] flex items-center justify-center font-bold">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">
                            {stub.asset_name || stub.asset_symbol} Settlement
                          </div>
                          <div className="text-[11px] text-[var(--muted)] font-mono">
                            Tx: {stub.tx_hash.slice(0, 14)}... · Settled at {new Date(stub.settled_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Quantity</span>
                          <span className="text-white">{stub.quantity} unit</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Total Settled</span>
                          <span className="font-bold text-[var(--buy)]">{fmt.price(stub.total_value)}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(61,220,110,0.12)] text-[var(--buy)] border border-[rgba(61,220,110,0.25)]">
                          {stub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SLIDING RIGHT-SIDE RECEIPT DRAWER
          ═══════════════════════════════════════════════════════════ */}
          {selectedReceipt && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md h-full bg-[var(--bg-0)] border-l border-[var(--line)] p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--line-soft)]">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-[var(--lav)]" />
                      <h3 className="text-base font-bold text-white">Ledger Settlement Receipt</h3>
                    </div>
                    <button
                      onClick={() => setSelectedReceipt(null)}
                      className="p-1 rounded-lg hover:bg-[var(--raised)] text-[var(--muted)] hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Cryptographic Details Pod */}
                  <div className="mt-6 space-y-4 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                      <span className="text-[10px] text-[var(--muted)] uppercase block">Transaction Hash</span>
                      <div className="flex items-center justify-between mt-1 text-white break-all">
                        <span>{selectedReceipt.tx_hash}</span>
                        <button
                          onClick={() => copyToClipboard(selectedReceipt.tx_hash)}
                          className="ml-2 text-[var(--lav)] hover:brightness-120"
                        >
                          {copiedTx === selectedReceipt.tx_hash ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Asset</span>
                        <span className="text-white font-bold">{selectedReceipt.asset_symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Execution Price</span>
                        <span className="text-white">{fmt.price(selectedReceipt.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Units Transferred</span>
                        <span className="text-white">{selectedReceipt.quantity}</span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--line-soft)] pt-2">
                        <span className="text-[var(--muted)] font-bold">Total Settled</span>
                        <span className="text-[var(--buy)] font-bold">{fmt.price(selectedReceipt.total_value)}</span>
                      </div>
                    </div>

                    {/* Double-entry Ledger Verification */}
                    <div className="p-3.5 rounded-xl bg-[rgba(61,220,110,0.06)] border border-[rgba(61,220,110,0.25)] space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[var(--buy)] font-semibold">
                        <ShieldCheck size={14} />
                        Double-Entry Verified: Invariants R1–R8 Passed
                      </div>
                      <p className="text-[var(--muted)] leading-relaxed">
                        Funds unlocked from escrow account and transferred to seller wallet in exact atomic matching block.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white transition-all mt-6"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
