'use client';

import React, { useState, useRef, useMemo } from 'react';
import { RefreshCw, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';

type Timeframe = '24h' | '1w' | '1m' | '1y' | 'all';

interface BalancePoint {
  timeStr: string;
  timestamp: string;
  val: number;
}

interface InteractiveBalanceChartProps {
  baseBalance: number;
  onScrub?: (val: number | null) => void;
}

// Generate realistic stochastic walk data per timeframe
function generateData(base: number, tf: Timeframe): BalancePoint[] {
  const count = 40;
  const points: BalancePoint[] = [];
  const now = new Date();
  
  // Starting variance based on timeframe
  const stepTime = {
    '24h': 24 * 60 * 60 * 1000 / count,
    '1w': 7 * 24 * 60 * 60 * 1000 / count,
    '1m': 30 * 24 * 60 * 60 * 1000 / count,
    '1y': 365 * 24 * 60 * 60 * 1000 / count,
    'all': 730 * 24 * 60 * 60 * 1000 / count,
  }[tf];

  let current = base * 0.94; // starts ~6% lower
  for (let i = 0; i < count; i++) {
    const t = new Date(now.getTime() - (count - 1 - i) * stepTime);
    // Deterministic random walk with slight upward drift
    const delta = (Math.sin(i * 0.45) * 0.015 + (Math.cos(i * 0.8) * 0.012) + 0.003) * base;
    current = Math.max(base * 0.8, Math.min(base * 1.15, current + delta));
    
    // Last point equals baseBalance
    if (i === count - 1) current = base;

    let timeStr = '';
    if (tf === '24h') {
      timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (tf === '1w' || tf === '1m') {
      timeStr = t.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
      timeStr = t.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    points.push({
      timeStr,
      timestamp: t.toISOString(),
      val: Math.round(current),
    });
  }
  return points;
}

export function InteractiveBalanceChart({ baseBalance, onScrub }: InteractiveBalanceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const points = useMemo(() => generateData(baseBalance, timeframe), [baseBalance, timeframe]);

  // Coordinate mapping
  const minVal = Math.min(...points.map((p) => p.val)) * 0.99;
  const maxVal = Math.max(...points.map((p) => p.val)) * 1.01;
  const valRange = maxVal - minVal || 1;

  const width = 600;
  const height = 150;
  const padTop = 15;
  const padBottom = 20;
  const chartHeight = height - padTop - padBottom;

  const coords = useMemo(() => {
    return points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = padTop + chartHeight - ((p.val - minVal) / valRange) * chartHeight;
      return { x, y, ...p };
    });
  }, [points, minVal, valRange, width, chartHeight, padTop]);

  // Catmull-Rom or smooth Bezier path
  const pathD = useMemo(() => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
    }
    return d;
  }, [coords]);

  const areaD = useMemo(() => {
    if (!pathD) return '';
    return `${pathD} L ${width},${height} L 0,${height} Z`;
  }, [pathD, width, height]);

  // Mouse move handler for scrubbing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(relX * (points.length - 1))));
    
    if (idx !== hoverIndex) {
      setHoverIndex(idx);
      setMouseX(relX * width);
      onScrub?.(points[idx].val);
      sound.playHover();
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMouseX(null);
    onScrub?.(null);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    sound.playClick();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const activePoint = hoverIndex !== null ? coords[hoverIndex] : coords[coords.length - 1];

  return (
    <div className="w-full flex flex-col justify-between">
      {/* Timeframe & Action Bar (ref-app.jpg style) */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 bg-[#161826] p-0.5 rounded-lg border border-[var(--border)]">
          {(['24h', '1w', '1m', '1y', 'all'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                sound.playClick();
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase transition-all ${
                timeframe === tf
                  ? 'bg-[#222538] text-white shadow-sm font-bold border border-[rgba(255,255,255,0.08)]'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {hoverIndex !== null ? (
            <span className="text-[11px] font-mono text-[#38BDF8] animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              Scrubbing {activePoint.timeStr}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-[var(--text-dim)]">
              Interactive Scrub
            </span>
          )}
          <button
            onClick={handleRefresh}
            title="Refresh valuation"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-white bg-[#161826] border border-[var(--border)] hover:bg-[#202336] transition-all"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-[#38BDF8]' : ''} />
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-36 relative cursor-crosshair select-none touch-none"
      >
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* ref-app.jpg Exact Electric Blue Area Gradient */}
            <linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D83E5" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#1D83E5" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#1D83E5" stopOpacity="0.0" />
            </linearGradient>

            {/* ref-app.jpg Exact Electric Blue Line Gradient */}
            <linearGradient id="balanceLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1565C0" />
              <stop offset="50%" stopColor="#1D83E5" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            <filter id="scrubGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          <line x1="0" y1={padTop} x2={width} y2={padTop} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <line x1="0" y1={padTop + chartHeight / 2} x2={width} y2={padTop + chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <line x1="0" y1={padTop + chartHeight} x2={width} y2={padTop + chartHeight} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

          {/* Area Fill */}
          <path d={areaD} fill="url(#balanceGlow)" />

          {/* Secondary Ghost Line (Exact ref-app.jpg double-line aesthetic) */}
          <path
            d={pathD}
            transform="translate(0, 10)"
            fill="none"
            stroke="#12273D"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Main Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#balanceLine)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Vertical Scrub Crosshair */}
          {activePoint && hoverIndex !== null && (
            <g>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={height}
                stroke="rgba(56,189,248,0.5)"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6.5"
                fill="#38BDF8"
                filter="url(#scrubGlow)"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3"
                fill="#FFFFFF"
              />
            </g>
          )}

          {/* Default End Beacon (when not hovering) */}
          {hoverIndex === null && coords.length > 0 && (
            <g>
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="10"
                fill="#38BDF8"
                opacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="4.5"
                fill="#38BDF8"
              />
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="2"
                fill="#FFFFFF"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Pill following mouse (ref-app.jpg dark pill style) */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all duration-75"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="bg-[#121524] px-3 py-1.5 rounded-lg border border-[rgba(56,189,248,0.35)] shadow-2xl backdrop-blur-md flex flex-col items-center">
              <span className="font-mono font-bold text-sm text-white">
                {fmt.price(activePoint.val)}
              </span>
              <span className="text-[9px] font-mono text-[#8E94A5] uppercase">
                {activePoint.timeStr}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
