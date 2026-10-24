"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FooterStripProps {
  className?: string;
}

/**
 * FooterStrip — Persistent simulated market notice.
 * Always visible at the bottom of authenticated pages.
 */
export function FooterStrip({ className }: FooterStripProps) {
  return (
    <footer
      className={cn(
        "border-t border-glass-border bg-white/[0.015] backdrop-blur-xl",
        className
      )}
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sim" style={{ boxShadow: "0 0 8px var(--sim-glow)" }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
            Simulated market
          </span>
          <span className="hidden sm:inline text-text-dim" aria-hidden="true">·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
            Funds are simulated credits
          </span>
          <span className="hidden sm:inline text-text-dim" aria-hidden="true">·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
            Activity includes simulated traders
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
          <span>Darkhold Exchange</span>
          <span aria-hidden="true">·</span>
          <span>MMXXVI</span>
          <span aria-hidden="true">·</span>
          <a href="#rules" className="link-line hover:text-brand-400">House Rules</a>
          <span aria-hidden="true">·</span>
          <a href="/dev/theme" className="link-line hover:text-brand-400">Design System</a>
        </div>
      </div>
    </footer>
  );
}