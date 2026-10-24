'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import {
  ShieldAlert, Zap, BarChart2, Activity, MousePointerClick,
  ZoomIn, ZoomOut, RotateCcw, MoveHorizontal
} from 'lucide-react';
import { sound } from '@/lib/sound';

interface PriceChartProps {
  candles: Candle[];
  ceilingPrice: number;
  lastPrice: number;
  onSelectPrice?: (priceInCents: number) => void;
}

type ChartType = 'CANDLES' | 'LINE';
type Interval = '5s' | '1m' | '5m' | '15m' | '1h';

export function PriceChart({
  candles,
  ceilingPrice,
  lastPrice,
  onSelectPrice,
}: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [interval, setInterval] = useState<Interval>('1m');
  const [chartType, setChartType] = useState<ChartType>('CANDLES');

  // Zoom & Pan State (0.6x to 3.5x zoom)
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);

  // Interactive Crosshair & Inspection State
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    price: number;
    candle: Candle | null;
  } | null>(null);

  // Filter or aggregate candles based on interval if needed
  const activeCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles;
  }, [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Padding
    const padTop = 32;
    const padBottom = 36;
    const padRight = 72;
    const chartHeight = height - padTop - padBottom;
    const chartWidth = width - padRight;

    // Price bounds (convert cents to dollars for scale)
    const prices = activeCandles.flatMap((c) => [c.high, c.low]);
    prices.push(ceilingPrice / 100);
    const minPrice = Math.min(...prices) * 0.994;
    const maxPrice = Math.max(...prices) * 1.006;
    const priceRange = maxPrice - minPrice || 1;

    const getY = (val: number) =>
      padTop + chartHeight - ((val - minPrice) / priceRange) * chartHeight;

    // Zoom & Candle layout
    const count = activeCandles.length;
    const totalChartSpan = chartWidth * zoom;
    const candleGap = totalChartSpan / count;
    const candleWidth = Math.max(3.5, candleGap * 0.72);
    const startX = panOffset;

    // 1. Horizontal Grid Lines & Price Labels
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '10px "JetBrains Mono", monospace';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (priceRange / gridSteps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      ctx.fillText(`$${p.toFixed(2)}`, chartWidth + 8, y + 3.5);
    }

    // 2. Resale Ceiling Line (Amber, #F8B700)
    const ceilingY = getY(ceilingPrice / 100);
    ctx.strokeStyle = '#F8B700';
    ctx.setLineDash([6, 3]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, ceilingY);
    ctx.lineTo(chartWidth, ceilingY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ceiling Tag
    ctx.fillStyle = '#F8B700';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`CAP $${(ceilingPrice / 100).toFixed(2)}`, chartWidth + 6, ceilingY + 3.5);

    // 3. Render Chart Data with Viewport Clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, padTop, chartWidth, chartHeight);
    ctx.clip();

    // Shaded Background for Seeded Rehearsal History
    const liveIndex = activeCandles.findIndex((c) => !c.is_simulated);
    if (liveIndex > 0) {
      const splitX = startX + liveIndex * candleGap;
      ctx.fillStyle = 'rgba(123,47,247,0.06)';
      ctx.fillRect(startX, padTop, liveIndex * candleGap, chartHeight);

      // Vertical "Live from here" separator
      ctx.strokeStyle = 'rgba(94,220,245,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(splitX, padTop);
      ctx.lineTo(splitX, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#5EDCF5';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('LIVE FROM HERE', splitX + 6, padTop + 14);
    }

    if (chartType === 'CANDLES') {
      activeCandles.forEach((c, idx) => {
        const x = startX + idx * candleGap + candleGap / 2;
        // Skip off-screen candles for high performance
        if (x < -candleWidth || x > chartWidth + candleWidth) return;

        const isUp = c.close >= c.open;
        const candleColor = isUp ? '#22C55E' : '#CF4B3F';

        // Hovered column background highlight
        if (crosshair && Math.abs(crosshair.x - x) < candleGap / 2) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(x - candleGap / 2, padTop, candleGap, chartHeight);
        }

        // Wick
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = Math.max(1.2, 1.4 * Math.min(1.5, zoom));
        ctx.beginPath();
        ctx.moveTo(x, getY(c.high));
        ctx.lineTo(x, getY(c.low));
        ctx.stroke();

        // Body
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const bodyY = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(closeY - openY));

        ctx.fillStyle = candleColor;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);

        // Volume bar at bottom
        const maxVol = Math.max(...activeCandles.map((v) => v.volume), 50);
        const volH = (c.volume / maxVol) * 26;
        ctx.fillStyle = isUp ? 'rgba(34,197,94,0.22)' : 'rgba(207,75,63,0.22)';
        ctx.fillRect(x - candleWidth / 2, height - padBottom - volH, candleWidth, volH);
      });
    } else {
      // Area / Line Chart
      ctx.beginPath();
      let firstX = 0;
      let lastX = 0;
      activeCandles.forEach((c, idx) => {
        const x = startX + idx * candleGap + candleGap / 2;
        const y = getY(c.close);
        if (idx === 0) {
          ctx.moveTo(x, y);
          firstX = x;
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
      });
      ctx.strokeStyle = '#1D83E5';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Area gradient
      ctx.lineTo(lastX, height - padBottom);
      ctx.lineTo(firstX, height - padBottom);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
      grad.addColorStop(0, 'rgba(29,131,229,0.25)');
      grad.addColorStop(1, 'rgba(29,131,229,0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();

    // 4. Last Price Active Dashed Line
    const lastY = getY(lastPrice / 100);
    ctx.strokeStyle = '#1D83E5';
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(chartWidth, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Interactive Crosshair Lines & Badges
    if (crosshair && crosshair.x <= chartWidth && crosshair.y >= padTop && crosshair.y <= height - padBottom) {
      // Vertical crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crosshair.x, padTop);
      ctx.lineTo(crosshair.x, height - padBottom);
      ctx.stroke();

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(chartWidth, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right Axis Price Pill
      const priceText = `$${crosshair.price.toFixed(2)}`;
      ctx.fillStyle = '#1D83E5';
      ctx.beginPath();
      ctx.roundRect(chartWidth + 3, crosshair.y - 10, 64, 20, 6);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(priceText, chartWidth + 8, crosshair.y + 3.5);

      // Bottom Time Pill
      if (crosshair.candle) {
        const timeText = new Date(crosshair.candle.time * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const pillW = 68;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.roundRect(crosshair.x - pillW / 2, height - padBottom + 4, pillW, 18, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(timeText, crosshair.x - pillW / 2 + 6, height - padBottom + 16);
      }
    }
  }, [activeCandles, ceilingPrice, lastPrice, interval, chartType, crosshair, zoom, panOffset]);

  // Handle Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom((z) => Math.max(0.6, Math.min(3.5, parseFloat((z + delta).toFixed(2)))));
  };

  // Drag to Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStartX(e.clientX - panOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Mouse Events for Interactivity & Crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padTop = 32;
    const padBottom = 36;
    const padRight = 72;
    const chartHeight = rect.height - padTop - padBottom;
    const chartWidth = rect.width - padRight;

    if (isDragging) {
      const newOffset = e.clientX - dragStartX;
      const totalWidth = chartWidth * zoom;
      const maxPan = Math.max(0, totalWidth - chartWidth);
      setPanOffset(Math.max(-maxPan, Math.min(0, newOffset)));
      return;
    }

    // Price bounds
    const prices = activeCandles.flatMap((c) => [c.high, c.low]);
    prices.push(ceilingPrice / 100);
    const minPrice = Math.min(...prices) * 0.994;
    const maxPrice = Math.max(...prices) * 1.006;
    const priceRange = maxPrice - minPrice || 1;

    // Price under cursor
    const priceAtY = minPrice + ((padTop + chartHeight - y) / chartHeight) * priceRange;

    // Nearest Candle with Zoom & Pan mapping
    const totalWidth = chartWidth * zoom;
    const candleGap = totalWidth / activeCandles.length;
    const candleIdx = Math.max(
      0,
      Math.min(activeCandles.length - 1, Math.floor((x - panOffset) / candleGap))
    );
    const candle = activeCandles[candleIdx] || null;

    setCrosshair({
      x,
      y,
      price: Math.max(0, priceAtY),
      candle,
    });
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCrosshair(null);
  };

  const handleClick = () => {
    if (!isDragging && crosshair && onSelectPrice) {
      sound.playClick();
      onSelectPrice(Math.round(crosshair.price * 100));
    }
  };

  const activeCandle = crosshair?.candle || activeCandles[activeCandles.length - 1];
  const isUp = activeCandle ? activeCandle.close >= activeCandle.open : true;
  const candleChangePct = activeCandle
    ? (((activeCandle.close - activeCandle.open) / (activeCandle.open || 1)) * 100).toFixed(2)
    : '0.00';

  return (
    <div
      ref={containerRef}
      className="card-pod p-5 rounded-3xl flex flex-col h-full relative select-none w-full"
    >
      {/* 1. Header Toolbar: Interval + Type + Interactive Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--line-soft)] gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-white">Price Action</span>

          {/* Timeframe selector */}
          <div className="seg-control">
            {(['5s', '1m', '5m', '15m', '1h'] as Interval[]).map((i) => (
              <button
                key={i}
                onClick={() => {
                  setInterval(i);
                  sound.playClick();
                }}
                className={`seg-tab ${interval === i ? 'active' : ''}`}
              >
                {i}
              </button>
            ))}
          </div>

          {/* Mode Switcher: Candle vs Area */}
          <div className="flex items-center bg-[rgba(255,255,255,0.04)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => {
                setChartType('CANDLES');
                sound.playClick();
              }}
              title="Candlestick Chart"
              className={`p-1.5 rounded-md ${chartType === 'CANDLES' ? 'bg-[var(--lavender)] text-black' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <BarChart2 size={13} />
            </button>
            <button
              onClick={() => {
                setChartType('LINE');
                sound.playClick();
              }}
              title="Smooth Line Chart"
              className={`p-1.5 rounded-md ${chartType === 'LINE' ? 'bg-[var(--lavender)] text-black' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <Activity size={13} />
            </button>
          </div>

          {/* Interactive Zoom Controls */}
          <div className="flex items-center bg-[rgba(255,255,255,0.04)] p-0.5 rounded-lg border border-[var(--border)] gap-1">
            <button
              onClick={() => {
                sound.playClick();
                setZoom((z) => Math.max(0.6, parseFloat((z - 0.25).toFixed(2))));
              }}
              title="Zoom Out (-)"
              className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono font-bold text-[var(--lavender)] px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setZoom((z) => Math.min(3.5, parseFloat((z + 0.25).toFixed(2))));
              }}
              title="Zoom In (+)"
              className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setZoom(1.0);
                setPanOffset(0);
              }}
              title="Reset Zoom & Pan"
              className="p-1 rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[var(--ceiling)] inline-block" />
            <span className="text-[var(--ceiling)] font-mono font-semibold">
              Cap: {fmt.price(ceilingPrice)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--sim)] inline-block" />
            <span>Simulated Depth</span>
          </div>
        </div>
      </div>

      {/* 2. Real-time OHLCV Inspector Strip */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono py-2 px-1 text-[var(--text-muted)] border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              O: <strong className="text-white">${activeCandle.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-white">${activeCandle.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-white">${activeCandle.low.toFixed(2)}</strong>
            </span>
            <span>
              C: <strong className={isUp ? 'text-[var(--buy)]' : 'text-[var(--sell)]'}>${activeCandle.close.toFixed(2)}</strong>
            </span>
            <span>
              Vol: <strong className="text-white">{activeCandle.volume}</strong>
            </span>
            <span className={isUp ? 'text-[var(--buy)]' : 'text-[var(--sell)]'}>
              {Number(candleChangePct) >= 0 ? `+${candleChangePct}%` : `${candleChangePct}%`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
            <span className="hidden sm:inline font-mono">Scroll to zoom · Drag to pan</span>
            <div className="flex items-center gap-1">
              <MousePointerClick size={12} className="text-[var(--lavender)]" />
              <span>Click chart to prefill order</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Canvas Stage with Wheel Zoom & Pan Drag */}
      <div className={`flex-1 w-full relative min-h-[300px] ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}>
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
