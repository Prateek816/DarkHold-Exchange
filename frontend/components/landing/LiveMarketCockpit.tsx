'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/formatters';
import { soundFx } from '@/lib/sound';
import {
  TrendingUp, TrendingDown, ArrowUpRight, BarChart2,
  Sliders, ShieldCheck, Zap, Activity, Clock,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';

interface AssetOption {
  id: string;
  name: string;
  symbol: string;
  lastPrice: number;
  change24h: number;
  faceValue: number;
  ceilingPrice: number;
  candles: { t: string; open: number; high: number; low: number; close: number; vol: number }[];
  bids: { price: number; amount: number; total: number }[];
  asks: { price: number; amount: number; total: number }[];
}

const DEMO_ASSETS: AssetOption[] = [
  {
    id: 'dfest-wkd',
    name: 'Darkhold Fest Weekend Pass',
    symbol: 'DFEST-WKD',
    lastPrice: 13850,
    change24h: 4.2,
    faceValue: 12000,
    ceilingPrice: 14400,
    candles: [
      { t: '16:00', open: 13200, high: 13450, low: 13150, close: 13400, vol: 14 },
      { t: '16:15', open: 13400, high: 13600, low: 13350, close: 13550, vol: 22 },
      { t: '16:30', open: 13550, high: 13750, low: 13500, close: 13680, vol: 35 },
      { t: '16:45', open: 13680, high: 13900, low: 13620, close: 13800, vol: 28 },
      { t: '17:00', open: 13800, high: 14050, low: 13780, close: 13850, vol: 41 },
    ],
    bids: [
      { price: 13800, amount: 4, total: 4 },
      { price: 13750, amount: 6, total: 10 },
      { price: 13700, amount: 12, total: 22 },
      { price: 13650, amount: 8, total: 30 },
    ],
    asks: [
      { price: 13900, amount: 3, total: 3 },
      { price: 13950, amount: 5, total: 8 },
      { price: 14000, amount: 9, total: 17 },
      { price: 14200, amount: 4, total: 21 },
    ],
  },
  {
    id: 'moon-ga',
    name: 'Moonrise GA Pass',
    symbol: 'MOON-GA',
    lastPrice: 8800,
    change24h: 2.1,
    faceValue: 8500,
    ceilingPrice: 10200,
    candles: [
      { t: '16:00', open: 8400, high: 8600, low: 8350, close: 8500, vol: 8 },
      { t: '16:15', open: 8500, high: 8700, low: 8450, close: 8650, vol: 15 },
      { t: '16:30', open: 8650, high: 8750, low: 8600, close: 8700, vol: 18 },
      { t: '16:45', open: 8700, high: 8850, low: 8680, close: 8780, vol: 24 },
      { t: '17:00', open: 8780, high: 8900, low: 8750, close: 8800, vol: 30 },
    ],
    bids: [
      { price: 8750, amount: 5, total: 5 },
      { price: 8700, amount: 7, total: 12 },
      { price: 8650, amount: 10, total: 22 },
      { price: 8600, amount: 15, total: 37 },
    ],
    asks: [
      { price: 8850, amount: 4, total: 4 },
      { price: 8900, amount: 8, total: 12 },
      { price: 9000, amount: 11, total: 23 },
      { price: 9200, amount: 6, total: 29 },
    ],
  },
  {
    id: 'df-hoodie',
    name: 'Darkhold Hoodie Limited',
    symbol: 'DF-HOODIE',
    lastPrice: 12500,
    change24h: -1.5,
    faceValue: 12500,
    ceilingPrice: 15000,
    candles: [
      { t: '16:00', open: 12800, high: 12900, low: 12650, close: 12700, vol: 5 },
      { t: '16:15', open: 12700, high: 12750, low: 12600, close: 12620, vol: 9 },
      { t: '16:30', open: 12620, high: 12680, low: 12550, close: 12580, vol: 12 },
      { t: '16:45', open: 12580, high: 12600, low: 12480, close: 12520, vol: 8 },
      { t: '17:00', open: 12520, high: 12550, low: 12450, close: 12500, vol: 14 },
    ],
    bids: [
      { price: 12450, amount: 3, total: 3 },
      { price: 12400, amount: 4, total: 7 },
      { price: 12350, amount: 6, total: 13 },
      { price: 12300, amount: 8, total: 21 },
    ],
    asks: [
      { price: 12550, amount: 2, total: 2 },
      { price: 12600, amount: 5, total: 7 },
      { price: 12700, amount: 7, total: 14 },
      { price: 12800, amount: 10, total: 24 },
    ],
  },
];

export function LiveMarketCockpit() {
  const [selectedAsset, setSelectedAsset] = useState<AssetOption>(DEMO_ASSETS[0]);
  const [viewMode, setViewMode] = useState<'chart' | 'orderbook'>('chart');
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [clickedLevel, setClickedLevel] = useState<{ side: 'BID' | 'ASK'; price: number } | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startPanOffset, setStartPanOffset] = useState(0);

  const activeCandle = hoveredCandle !== null ? selectedAsset.candles[hoveredCandle] : selectedAsset.candles[selectedAsset.candles.length - 1];

  const chartWidth = 560;
  const chartHeight = 200;
  const paddingX = 36;
  const paddingY = 24;

  const handleZoomIn = () => {
    soundFx.playClick();
    setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    soundFx.playClick();
    setZoom((z) => Math.max(0.65, +(z - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    soundFx.playClick();
    setZoom(1.0);
    setPanOffset(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.min(2.5, Math.max(0.65, +(z + delta).toFixed(2))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setStartPanOffset(panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    setPanOffset(Math.max(-200, Math.min(200, startPanOffset + dx)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const minPrice = Math.min(...selectedAsset.candles.map((c) => c.low)) * 0.985;
  const maxPrice = Math.max(selectedAsset.ceilingPrice, Math.max(...selectedAsset.candles.map((c) => c.high)) * 1.015);

  const getY = (p: number) => {
    return chartHeight - paddingY - ((p - minPrice) / (maxPrice - minPrice)) * (chartHeight - 2 * paddingY);
  };

  const ceilingY = getY(selectedAsset.ceilingPrice);

  return (
    <div className="surface p-6 sm:p-8 rounded-3xl border border-[rgba(185,167,255,0.25)] relative overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Radial Glow Ambient */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--lavender)' }}
      />

      {/* Header Strip: Asset Selectors + View Mode + Terminal Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip chip-mint text-[10px]">LIVE MARKET COCKPIT</span>
            <span className="text-xs font-mono text-[var(--text-dim)]">WebSocket: Connected (100ms)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {DEMO_ASSETS.map((asset) => {
              const isSelected = asset.id === selectedAsset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedAsset(asset);
                    setHoveredCandle(null);
                    setClickedLevel(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--lavender)] text-[#17122E] shadow-md shadow-[rgba(185,167,255,0.25)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  {asset.symbol}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs font-semibold text-white flex items-center gap-2">
            <span className="text-[var(--lavender)] font-mono">{selectedAsset.symbol}</span>
            <span className="text-[var(--text-dim)]">·</span>
            <span>{selectedAsset.name}</span>
          </div>
        </div>

        {/* View Mode Switcher + Open Full Terminal Button */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[rgba(0,0,0,0.4)] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('chart');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'chart' ? 'bg-[rgba(255,255,255,0.12)] text-white font-bold' : 'text-[var(--text-dim)] hover:text-white'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setViewMode('orderbook');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'orderbook' ? 'bg-[rgba(255,255,255,0.12)] text-white font-bold' : 'text-[var(--text-dim)] hover:text-white'
              }`}
            >
              Order Book
            </button>
          </div>

          <Link
            href={`/trade/${selectedAsset.id}`}
            className="btn-primary text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <span>Trade Full</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Main Content: Chart or Order Book */}
      {viewMode === 'chart' ? (
        <div className="pt-5">
          {/* Top Ticker Bar: Last Price, 24h Change, Face Value, Ceiling */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                {fmt.price(selectedAsset.lastPrice)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                  selectedAsset.change24h >= 0
                    ? 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)]'
                    : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)]'
                }`}
              >
                {selectedAsset.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {selectedAsset.change24h >= 0 ? `+${selectedAsset.change24h}%` : `${selectedAsset.change24h}%`}
              </span>
            </div>

            {/* Timeframe Selector Pills & Zoom Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-dim)]">
                {['1m', '5m', '15m', '1H'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedTimeframe(tf);
                    }}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      selectedTimeframe === tf ? 'bg-[var(--lavender)] text-[#17122E] font-bold' : 'hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 pl-2 border-l border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.3)] p-0.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-dim)] hover:text-white transition-colors"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold text-white px-1 select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  aria-label="Zoom In"
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-dim)] hover:text-white transition-colors"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                  className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-[var(--lavender)] hover:text-white transition-colors ml-0.5 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span className="text-[10px] font-mono">Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Scrubbable Candlestick SVG */}
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative w-full overflow-hidden select-none bg-[rgba(0,0,0,0.25)] rounded-2xl border border-[rgba(255,255,255,0.06)] p-2 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Live Hover Tooltip */}
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dim)] px-2 pt-1 pb-2 border-b border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">T: {activeCandle.t}</span>
                <span>O: <strong className="text-white">{fmt.price(activeCandle.open)}</strong></span>
                <span>H: <strong className="text-[var(--buy)]">{fmt.price(activeCandle.high)}</strong></span>
                <span>L: <strong className="text-[var(--sell)]">{fmt.price(activeCandle.low)}</strong></span>
                <span>C: <strong className="text-white">{fmt.price(activeCandle.close)}</strong></span>
              </div>
              <span className="hidden sm:inline text-[var(--text-dim)]">Scroll or drag to pan · Scrub candles</span>
            </div>

            <svg
              className="w-full h-48 overflow-visible mt-2 pointer-events-auto"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <clipPath id="cockpitCandleClip">
                  <rect x={paddingX - 10} y={0} width={chartWidth - 2 * paddingX + 20} height={chartHeight} />
                </clipPath>
              </defs>

              {/* Amber Ceiling Dashed Line */}
              <line
                x1={paddingX}
                y1={ceilingY}
                x2={chartWidth - paddingX}
                y2={ceilingY}
                stroke="#FFB547"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={chartWidth - paddingX - 4}
                y={ceilingY - 5}
                fill="#FFB547"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                120% CEILING CAP: {fmt.price(selectedAsset.ceilingPrice)}
              </text>

              {/* Render Candlesticks inside Clipped Group with Zoom & Pan */}
              <g clipPath="url(#cockpitCandleClip)">
                {selectedAsset.candles.map((c, i) => {
                  const baseSpacing = (chartWidth - 2 * paddingX) / (selectedAsset.candles.length - 1 || 1);
                  const candleSpacing = baseSpacing * zoom;
                  const centerX = chartWidth / 2;
                  const x = centerX + (i - (selectedAsset.candles.length - 1) / 2) * candleSpacing + panOffset;
                  const openY = getY(c.open);
                  const closeY = getY(c.close);
                  const highY = getY(c.high);
                  const lowY = getY(c.low);
                  const isGreen = c.close >= c.open;
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(3, Math.abs(closeY - openY));
                  const candleWidth = Math.max(10, Math.min(32, 18 * zoom));
                  const isHovered = hoveredCandle === i;

                  return (
                    <g
                      key={i}
                      onMouseEnter={() => {
                        soundFx.playHover();
                        setHoveredCandle(i);
                      }}
                      className="cursor-pointer transition-opacity"
                    >
                      {/* Wick */}
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={isGreen ? '#3DDC6E' : '#FF5A5F'}
                        strokeWidth={isHovered ? '2.5' : '1.5'}
                      />
                      {/* Candle Body */}
                      <rect
                        x={x - candleWidth / 2}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        rx="3"
                        fill={isGreen ? '#3DDC6E' : '#FF5A5F'}
                        opacity={isHovered ? 1 : 0.85}
                        stroke={isHovered ? '#FFFFFF' : 'none'}
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      ) : (
        /* Order Book Depth Ladder */
        <div className="pt-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dim)] px-1">
            <span>Market Depth Visualization</span>
            <span className="chip chip-sim text-[10px]">Depth & Liquidity</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asks (Sells) */}
          <div className="p-4 rounded-2xl bg-[rgba(255,90,95,0.04)] border border-[rgba(255,90,95,0.15)]">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--sell)] pb-2 border-b border-[rgba(255,90,95,0.1)]">
              <span>Asks (Sell Orders)</span>
              <span>Units · Total</span>
            </div>
            <div className="space-y-1.5 mt-2">
              {selectedAsset.asks.map((ask, i) => (
                <div
                  key={i}
                  onClick={() => {
                    soundFx.playClick();
                    setClickedLevel({ side: 'ASK', price: ask.price });
                  }}
                  className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg hover:bg-[rgba(255,90,95,0.12)] cursor-pointer transition-colors"
                >
                  <span className="text-[var(--sell)] font-bold">{fmt.price(ask.price)}</span>
                  <span className="text-[var(--text-muted)]">{ask.amount}x · ({ask.total})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bids (Buys) */}
          <div className="p-4 rounded-2xl bg-[rgba(61,220,110,0.04)] border border-[rgba(61,220,110,0.15)]">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--buy)] pb-2 border-b border-[rgba(61,220,110,0.1)]">
              <span>Bids (Buy Orders)</span>
              <span>Units · Total</span>
            </div>
            <div className="space-y-1.5 mt-2">
              {selectedAsset.bids.map((bid, i) => (
                <div
                  key={i}
                  onClick={() => {
                    soundFx.playClick();
                    setClickedLevel({ side: 'BID', price: bid.price });
                  }}
                  className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg hover:bg-[rgba(61,220,110,0.12)] cursor-pointer transition-colors"
                >
                  <span className="text-[var(--buy)] font-bold">{fmt.price(bid.price)}</span>
                  <span className="text-[var(--text-muted)]">{bid.amount}x · ({bid.total})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Selected Depth Level Interactive Feedback */}
      {clickedLevel && (
        <div className="mt-4 p-3 rounded-xl bg-[rgba(185,167,255,0.08)] border border-[rgba(185,167,255,0.25)] flex items-center justify-between text-xs font-mono animate-reveal">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[var(--lavender)]" />
            <span className="text-white">
              Selected Level: <strong>{clickedLevel.side} @ {fmt.price(clickedLevel.price)}</strong>
            </span>
          </div>
          <Link
            href={`/trade/${selectedAsset.id}`}
            className="text-[var(--lavender)] hover:underline flex items-center gap-1 font-bold"
          >
            <span>Execute on Terminal</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
