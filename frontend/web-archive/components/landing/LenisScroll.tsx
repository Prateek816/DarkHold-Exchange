"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";

/**
 * LenisScroll — smooth scroll for the landing page only.
 * Initializes once and syncs scroll position with React state.
 * Honors prefers-reduced-motion by falling back to native scroll.
 */
export function LenisScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return undefined;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 2,
      wheelMultiplier: 1,
      infinite: false,
      autoRaf: true,
      respectReducedMotion: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
