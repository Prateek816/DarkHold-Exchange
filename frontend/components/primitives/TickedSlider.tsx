'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { sound } from '@/lib/sound';

interface TickedSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  ticksCount?: number;
  className?: string;
  disabled?: boolean;
}

export function TickedSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => `${v}`,
  ticksCount = 48,
  className = '',
  disabled = false,
}: TickedSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawVal = min + rawPct * (max - min);
      const steppedVal = Math.round(rawVal / step) * step;
      const clampedVal = Math.max(min, Math.min(max, steppedVal));
      if (clampedVal !== value) {
        sound.playHover();
        onChange(clampedVal);
      }
    },
    [min, max, step, value, onChange, disabled]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sound.playClick();
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Generate waveform height profile for ticks
  const ticks = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < ticksCount; i++) {
      const x = i / (ticksCount - 1);
      // Subtle waveform curvature (center slightly taller)
      const h = 6 + Math.sin(x * Math.PI) * 10;
      arr.push({ idx: i, height: h });
    }
    return arr;
  }, [ticksCount]);

  return (
    <div
      className={`relative select-none touch-none py-4 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="h-10 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] relative flex items-center px-4 overflow-hidden"
      >
        {/* Recessed Waveform Ticks */}
        <div className="w-full flex justify-between items-center h-full pointer-events-none">
          {ticks.map((t) => {
            const tickPct = (t.idx / (ticksCount - 1)) * 100;
            const isFilled = tickPct <= pct;
            return (
              <span
                key={t.idx}
                className="w-[1.5px] rounded-full transition-colors duration-150"
                style={{
                  height: `${t.height}px`,
                  backgroundColor: isFilled ? 'var(--lav)' : 'rgba(255, 255, 255, 0.12)',
                  opacity: isFilled ? 0.9 : 0.4,
                }}
              />
            );
          })}
        </div>

        {/* Draggable Round Handle with Lavender Ring and Bar Icon */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform duration-75 pointer-events-none"
          style={{ left: `${pct}%` }}
        >
          {/* Floating Tooltip Chip above handle */}
          {(isDragging || isHovered) && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none animate-reveal">
              <span className="px-2 py-0.5 rounded-md bg-[var(--raised)] border border-[var(--line)] text-[11px] font-mono text-[var(--text)] font-semibold shadow-xl whitespace-nowrap">
                {formatValue(value)}
              </span>
            </div>
          )}

          {/* Handle Disc */}
          <div className="w-7 h-7 rounded-full bg-[#12121C] border-2 border-[var(--lav)] shadow-lg shadow-[rgba(185,167,255,0.3)] flex items-center justify-center">
            {/* Small bar icon inside [||] */}
            <div className="flex items-center gap-[2px]">
              <span className="w-[1.5px] h-2.5 rounded-full bg-[var(--lav)]" />
              <span className="w-[1.5px] h-2.5 rounded-full bg-[var(--lav)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
