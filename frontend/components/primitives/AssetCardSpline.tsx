'use client';

import React, { useId, useState, useMemo } from 'react';
import { fmt } from '@/lib/formatters';

interface AssetCardSplineProps {
  positive?: boolean;
  faceValue: number;
  ceilingPrice: number;
  lastPrice: number;
  changeValueStr?: string;
  assetId?: string;
  className?: string;
}

// Convert a list of points to a mathematically continuous C1 Catmull-Rom cubic bezier SVG path
function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function AssetCardSpline({
  positive = true,
  faceValue,
  ceilingPrice,
  lastPrice,
  changeValueStr = '+2,956',
  assetId = '',
  className = '',
}: AssetCardSplineProps) {
  const gradId = useId();
  const filterId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Neon theme colors: vibrant mint/lavender for gainers, coral/rose for losers
  const lineColor = positive ? '#3DDC6E' : '#FF5A5F';
  const glowColor = positive ? 'rgba(61, 220, 110, 0.45)' : 'rgba(255, 90, 95, 0.45)';

  const width = 280;
  const height = 94;
  const paddingX = 8;
  const paddingTop = 14;
  const paddingBottom = 22;

  // Realistic sequential data series for each asset (in dollars)
  const rawValues = useMemo(() => {
    if (assetId === 'dfest-wkd') {
      return [128.5, 129.2, 131.0, 130.4, 132.8, 133.5, 132.9, 134.8, 135.6, 134.9, 136.2, 137.4, 136.8, 138.2, 138.57];
    }
    if (assetId === 'moon-ga') {
      return [91.8, 91.2, 90.6, 90.9, 90.1, 89.4, 89.8, 88.9, 88.4, 88.7, 88.2, 87.8, 88.3, 87.9, 88.00];
    }
    if (assetId === 'df-hoodie') {
      return [70.2, 70.8, 71.5, 71.1, 72.3, 72.9, 72.4, 73.6, 74.2, 73.8, 74.6, 75.2, 74.9, 75.5, 75.88];
    }
    // Generic fallback based on direction
    return positive
      ? [100, 101.5, 103, 102.4, 104.8, 105.5, 105.1, 107.0, 108.2, 107.6, 109.5, 110.8, 111.4]
      : [110, 108.5, 107.2, 107.8, 106.1, 105.4, 105.8, 104.2, 103.5, 103.8, 102.1, 101.0, 100.2];
  }, [assetId, positive]);

  // Realistic volume profile (minor histogram bars at the base)
  const volumeProfile = [5, 9, 7, 12, 15, 10, 14, 18, 13, 22, 17, 24, 19, 28, 23];

  const minVal = Math.min(...rawValues) * 0.99;
  const maxVal = Math.max(...rawValues) * 1.01;

  // Compute (x, y) coordinates for smooth spline
  const points = useMemo(() => {
    const usableWidth = width - 2 * paddingX;
    const usableHeight = height - paddingTop - paddingBottom;
    const stepX = usableWidth / (rawValues.length - 1);

    return rawValues.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const normY = (val - minVal) / (maxVal - minVal || 1);
      const y = height - paddingBottom - normY * usableHeight;
      return { x, y, val };
    });
  }, [rawValues, minVal, maxVal]);

  // Generate silky-smooth continuous Catmull-Rom path
  const curveD = useMemo(() => catmullRomToBezier(points), [points]);
  const areaD = useMemo(() => {
    if (!points.length) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${curveD} L ${lastX},${height} L ${firstX},${height} Z`;
  }, [curveD, points]);

  // Handle interactive mouse scrubbing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closest = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx;
      }
    });
    setHoverIdx(closest);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
  };

  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;
  const lastPoint = points[points.length - 1];

  return (
    <div className={`relative w-full h-24 overflow-visible select-none ${className}`}>
      <svg
        className="w-full h-full overflow-visible cursor-crosshair"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Vertical gradient fill under curve */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="60%" stopColor={lineColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>

          {/* Soft neon glow filter */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={lineColor} floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 1. Subtle Horizontal Grid Guides */}
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 3"
          strokeWidth="1"
        />
        <line
          x1={paddingX}
          y1={paddingTop + (height - paddingTop - paddingBottom) / 2}
          x2={width - paddingX}
          y2={paddingTop + (height - paddingTop - paddingBottom) / 2}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="2 3"
          strokeWidth="1"
        />

        {/* 2. Dashed Amber Ceiling Cap Line */}
        <line
          x1={paddingX}
          y1={paddingTop - 2}
          x2={width - paddingX}
          y2={paddingTop - 2}
          stroke="#FFB547"
          strokeDasharray="3 3"
          strokeWidth="1"
          opacity="0.55"
        />

        {/* 3. Micro Volume Histogram Bars at Base */}
        {points.map((pt, i) => {
          const barH = volumeProfile[i % volumeProfile.length] || 8;
          const isBarHovered = hoverIdx === i;
          return (
            <rect
              key={i}
              x={pt.x - 2}
              y={height - 2 - barH}
              width="4"
              height={barH}
              rx="1.5"
              fill={isBarHovered ? lineColor : 'rgba(255,255,255,0.08)'}
              opacity={isBarHovered ? 0.75 : 0.4}
              className="transition-colors duration-100"
            />
          );
        })}

        {/* 4. Silky Multi-Stop Gradient Fill */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* 5. Smooth Illuminated Neon Wave Path */}
        <path
          d={curveD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />

        {/* 6. Active Interactive Scrubbing Guide & Node */}
        {activePoint ? (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={activePoint.x}
              y1={paddingTop - 4}
              x2={activePoint.x}
              y2={height - 2}
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            {/* Outer halo node */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="6.5"
              fill={lineColor}
              fillOpacity="0.25"
            />
            {/* Center solid node */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3.5"
              fill="#0D0D14"
              stroke={lineColor}
              strokeWidth="2"
            />
          </g>
        ) : (
          /* Live Pulsing Endpoint Beacon at Far Right */
          lastPoint && (
            <g>
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="7"
                fill={lineColor}
                fillOpacity="0.2"
                className="animate-pulse"
              />
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="3.5"
                fill="#0D0D14"
                stroke={lineColor}
                strokeWidth="2"
              />
            </g>
          )
        )}
      </svg>

      {/* 7. Ceiling Resale Cap Badge (Top Right) */}
      <div className="absolute top-0 right-1 pointer-events-none">
        <span className="text-[9px] font-mono font-semibold text-[#FFB547] opacity-80 bg-[rgba(255,181,71,0.1)] px-1.5 py-0.2 rounded border border-[rgba(255,181,71,0.25)]">
          120% CAP
        </span>
      </div>

      {/* 8. Interactive Live Tooltip (Snaps to hovered point) */}
      {activePoint && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-75 z-20"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${Math.max(12, (activePoint.y / height) * 100 - 8)}%`,
          }}
        >
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-tight shadow-xl whitespace-nowrap inline-flex items-center gap-1 backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(12, 12, 20, 0.90)',
              border: `1px solid ${lineColor}`,
              color: lineColor,
              boxShadow: `0 0 12px ${glowColor}`,
            }}
          >
            <span>${activePoint.val.toFixed(2)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
