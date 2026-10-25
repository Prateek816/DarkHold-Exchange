"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface InteractiveWardCardProps {
  faceValue: number;
  ceilingPrice: number;
  ceilingPct: number;
}

export function InteractiveWardCard({
  faceValue,
  ceilingPrice,
  ceilingPct,
}: InteractiveWardCardProps) {
  const [dragging, setDragging] = useState(false);
  const [price, setPrice] = useState(faceValue);
  const [wardHit, setWardHit] = useState(false);
  const [messageShown, setMessageShown] = useState(false);
  const [shake, setShake] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number) => Math.min(Math.max(v, 0), ceilingPrice);

  const startDrag = useCallback((clientX: number) => {
    if (wardHit) return;
    setDragging(true);
    const rect = trackRef.current!.getBoundingClientRect();
    let v = clamp(Math.round(((clientX - rect.left) / rect.width) * ceilingPrice));
    if (v === ceilingPrice) {
      setPrice(ceilingPrice);
      setWardHit(true);
      setShake(1);
      setMessageShown(true);
    } else {
      setPrice(v);
    }
  }, [ceilingPrice, wardHit]);

  const moveDrag = useCallback((clientX: number) => {
    if (!dragging || wardHit) return;
    const rect = trackRef.current!.getBoundingClientRect();
    let v = clamp(Math.round(((clientX - rect.left) / rect.width) * ceilingPrice));
    setPrice(v);
    if (v === ceilingPrice) {
      setWardHit(true);
      setShake(1);
      setMessageShown(true);
    }
  }, [dragging, ceilingPrice, wardHit]);

  const endDrag = useCallback(() => {
    setDragging(false);
  }, []);

  const pctOfFace = Math.round((ceilingPrice / faceValue) * 100);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    startDrag(e.clientX);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    startDrag(e.touches[0].clientX);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    moveDrag(e.clientX);
  }, [moveDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    moveDrag(e.touches[0].clientX);
  }, [moveDrag]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (wardHit) return;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = clamp(price + 500);
        setPrice(next);
        if (next === ceilingPrice) {
          setWardHit(true);
          setShake(1);
          setMessageShown(true);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setPrice(clamp(price - 500));
      }
    },
    [price, ceilingPrice, wardHit],
  );

  const handlePos = (price / ceilingPrice) * 100;

  return (
    <section
      className="relative group"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseUp={endDrag}
      onTouchEnd={endDrag}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      role="region"
      aria-label="Interactive resale ceiling"
      aria-live="polite"
    >
      {/* Ward line — ember gold horizontal line that recurs everywhere */}
      <div
        className={cn(
          "absolute top-1/2 left-6 right-6 -translate-y-1/2 h-px transition-colors duration-150",
          wardHit ? "bg-ward shadow-[0_0_16px_rgba(242,163,58,0.6)]" : "bg-white/[0.06]",
        )}
      />

      {/* Pass card — ticket-stub shaped with notch and perforation */}
      <div
        className={cn(
          "relative mx-auto max-w-[340px] pt-14 pb-12 px-8 sm:pt-18 sm:pb-14 sm:px-10",
          "rounded-tile border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-card",
          "transition-transform duration-300 ease-out",
          shake === 1 ? "animate-[ward-shake_0.28s_ease-in-out]" : "",
        )}
        style={{ "--rotate": dragging ? "1" : "0" } as React.CSSProperties}
      >
        {/* Perforation dots top edge */}
        <div className="absolute top-0 left-0 right-0 h-4 flex justify-center items-end">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/[0.15]" />
          ))}
        </div>

        {/* Brand sigil */}
        <div className="px-8 pt-10 sm:px-10 sm:pt-12">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            <circle cx="12" cy="12" r="3" fill="#14CBAA" />
          </svg>
        </div>

        <div className="px-8 pt-6 sm:px-10 sm:pt-8 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim">
            Darkhold Fest · Weekend Pass
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-none tracking-tight text-text">
            Face value
          </h2>
          <div className="mt-2 font-mono text-[clamp(2rem,5vw,3rem)] font-bold tabular-nums text-text leading-none">
            {formatCurrency(faceValue)}
          </div>

          {/* Draggable price handle */}
          <div
            className={cn(
              "relative mt-6 h-3 w-full cursor-pointer sm:mt-8 sm:h-4",
              dragging ? "opacity-80" : "",
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="absolute inset-0 h-full bg-white/[0.04] rounded-full" />
            <div
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 h-full bg-ward rounded-full transition-all duration-75 ease-out",
                wardHit ? "shadow-[0_0_12px_rgba(242,163,58,0.8)]" : "",
              )}
              style={{ width: `${handlePos}%` }}
            />
            <div
              className={cn(
                "absolute left-[calc(var(--handle-pos,0%)-6px)] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] ring-2 ring-white ring-offset-2 ring-offset-white/[0.02] cursor-grab active:cursor-grabbing transition-transform duration-75",
                wardHit && "ring-brand-500 shadow-[0_0_12px_rgba(124,92,255,0.6)]",
              )}
              style={{ "--handle-pos": `${handlePos}` } as React.CSSProperties}
              aria-valuenow={price}
              aria-valuemin={0}
              aria-valuemax={ceilingPrice}
              role="slider"
              aria-label={`Resale price handle, ${formatCurrency(price)}`}
              tabIndex={0}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Ward stop message */}
          {messageShown && (
            <div className={cn("mt-6 sm:mt-8", wardHit ? "animate-tick-in" : "opacity-0")}>
              <p className="font-display text-[clamp(1rem,2vw,1.25rem)] font-semibold leading-tight text-ward">
                Resale cap is {formatCurrency(ceilingPrice)} ({pctOfFace}% of face value {formatCurrency(faceValue)}).
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                The Ward stops any price above it.
              </p>
            </div>
          )}
        </div>

        {/* Perforation bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-center items-start">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/[0.15]" />
          ))}
        </div>
      </div>

      <p className="mt-8 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-text-dim">
        Drag the price handle upward. It stops at the Ward. Simulated market — no real money.
      </p>
    </section>
  );
}
