"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export function Preloader() {
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  const hasSeen =
    typeof window !== "undefined" && sessionStorage.getItem("dh:preloader:seen") === "1";

  useEffect(() => {
    if (hasSeen) {
      setComplete(true);
      return;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setComplete(true);
      return;
    }

    let raf: number;
    const start = performance.now();
    const duration = 1100;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem("dh:preloader:seen", "1");
        setComplete(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasSeen]);

  if (complete) return null;

  const offset = 180 * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-[1000] bg-ink flex flex-col items-center justify-center"
      aria-hidden="true"
    >
      <div className="relative h-1 w-[180px] mb-10">
        <svg
          width="180"
          height="1"
          className="absolute left-0 top-1/2 -translate-y-1/2"
          viewBox="0 0 180 1"
        >
          <defs>
            <linearGradient id="ward-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0" />
              <stop offset="50%" stopColor="#F2A33A" stopOpacity="1" />
              <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="0.5"
            x2="180"
            y2="0.5"
            stroke="url(#ward-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{ strokeDasharray: "180", strokeDashoffset: String(offset) }}
          />
          <circle
            cx={180 * progress}
            cy="0.5"
            r="2"
            fill="#F2A33A"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{ transform: `translateX(${180 * progress}px)` }}
          />
        </svg>
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim">
        Drawing the Ward…
      </p>
    </div>
  );
}
