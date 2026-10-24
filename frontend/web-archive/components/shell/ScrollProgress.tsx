"use client";

import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/** Hairline reading-progress bar pinned to the very top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-mint-500 shadow-[0_0_12px_rgba(122,92,255,0.55)]"
      style={{ scaleX }}
    />
  );
}
