'use client';

import React, { useState, useRef } from 'react';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';

interface InteractiveAssetSparklineProps {
  positive?: boolean;
  lastPrice: number;
  change24h: number;
}

export function InteractiveAssetSparkline({
  positive = true,
  lastPrice,
  change24h,
}: InteractiveAssetSparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate 12 sample points based on positive/negative trend
  const count = 14;
  const points = React.useMemo(() => {
    const pts = [];
    const drift = positive ? 0.08 : -0.08;
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // Trend + oscillation
      const noise = Math.sin(i * 1.2) * 0.03 + Math.cos(i * 0.6) * 0.02;
      const factor = 1 - (1 - progress) * drift + noise;
      const priceAtPt = Math.round(lastPrice * factor);
      pts.push({
        idx: i,
        price: priceAtPt,
      });
    }
    // Make sure last point matches current price
    pts[pts.length - 1].price = lastPrice;
    return pts;
  }, [positive, lastPrice]);

  const minPrice = Math.min(...points.map((p) => p.price));
  const maxPrice = Math.max(...points.map((p) => p.price));
  const range = maxPrice - minPrice || 1;

  const width = 120;
  const height = 40;
  const pad = 4;

  const coords = points.map((p, i) => {
    const x = (i / (count - 1)) * width;
    const y = height - pad - ((p.price - minPrice) / range) * (height - pad * 2);
    return { x, y, price: p.price };
  });

  // Smooth SVG Path
  let d = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const mx = (curr.x + next.x) / 2;
    d += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
  }

  const strokeColor = positive ? '#1D83E5' : '#CF4B3F';
  const fillColor = positive ? 'rgba(29,131,229,0.15)' : 'rgba(207,75,63,0.15)';
  const tagBg = positive ? '#0B1726' : '#221115';
  const tagBorder = positive ? 'rgba(29,131,229,0.7)' : 'rgba(207,75,63,0.7)';
  const areaD = `${d} L ${width},${height} L 0,${height} Z`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.min(count - 1, Math.max(0, Math.round(relX * (count - 1))));
    if (idx !== hoverIndex) {
      setHoverIndex(idx);
      sound.playHover();
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-28 h-11 flex items-center cursor-pointer select-none"
    >
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`sparkFill-${positive ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#sparkFill-${positive ? 'up' : 'dn'})`} />
        <path d={d} fill="none" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" />

        {/* Hover Indicator Dot */}
        {activeCoord && (
          <g>
            <circle cx={activeCoord.x} cy={activeCoord.y} r="5" fill={strokeColor} />
            <circle cx={activeCoord.x} cy={activeCoord.y} r="2" fill="#FFFFFF" />
          </g>
        )}
      </svg>

      {/* Floating Ref-App.jpg Exact Price Tag Badge */}
      {activeCoord && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -top-6 z-20 transition-all duration-75"
          style={{ left: `${(activeCoord.x / width) * 100}%` }}
        >
          <span
            className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold shadow-2xl whitespace-nowrap"
            style={{
              backgroundColor: tagBg,
              border: `1px solid ${tagBorder}`,
              color: '#FFFFFF',
            }}
          >
            {fmt.price(activeCoord.price)}
          </span>
        </div>
      )}
    </div>
  );
}
