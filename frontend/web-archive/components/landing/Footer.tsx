"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "relative z-10 border-t border-white/[0.04] bg-white/[0.01] pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12 mb-16">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-brand-500/40 bg-brand-500/[0.08] mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                <circle cx="12" cy="12" r="3" fill="#14CBAA" />
              </svg>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-text-muted">
              A simulated marketplace for festival passes and limited-run objects. All money is
              simulated credits with no cash value.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim mb-4">
              Venue
            </h3>
            <ul className="space-y-3 font-mono text-[10.5px]">
              <li>
                <Link href="/market" className="text-text-muted hover:text-text transition-colors">
                  Market board
                </Link>
              </li>
              <li>
                <Link href="/auctions" className="text-text-muted hover:text-text transition-colors">
                  Sale room
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-text-muted hover:text-text transition-colors">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-text-muted hover:text-text transition-colors">
                  Demo Console
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim mb-4">
              Legal
            </h3>
            <ul className="space-y-3 font-mono text-[10.5px]">
              <li>
                <Link href="/terms" className="text-text-muted hover:text-text transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-text-muted hover:text-text transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/simulation-notice" className="text-text-muted hover:text-text transition-colors">
                  Simulation notice
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim mb-4">
              Contact
            </h3>
            <ul className="space-y-3 font-mono text-[10.5px] text-text-muted">
              <li>operator@darkhold.exchange</li>
              <li>Darkhold Exchange · MMXXVI</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
            Simulated market. Funds are simulated credits. Activity includes simulated traders.
          </p>
          <div className="flex gap-6 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
            <span>House rules</span>
            <span>Design system</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
