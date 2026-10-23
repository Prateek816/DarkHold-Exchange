"use client";

import React from "react";
import { motion, useScroll } from "framer-motion";

/** Lightweight GPU-accelerated reading-progress bar pinned to the viewport top */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-violet-500 shadow-[0_0_12px_rgba(25,203,176,0.55)] pointer-events-none transform-gpu will-change-transform"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
