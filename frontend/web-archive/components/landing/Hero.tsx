"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InteractiveWardCard } from "./InteractiveWardCard";

interface HeroProps {
  faceValue: number;
  ceilingPrice: number;
  ceilingPct: number;
}

export function Hero({ faceValue, ceilingPrice, ceilingPct }: HeroProps) {
  const [reveal, setReveal] = useState({ h1: false, subtitle: false, cta: false });

  useEffect(() => {
    const t1 = window.setTimeout(() => setReveal((p) => ({ ...p, h1: true })), 100);
    const t2 = window.setTimeout(() => setReveal((p) => ({ ...p, subtitle: true })), 500);
    const t3 = window.setTimeout(() => setReveal((p) => ({ ...p, cta: true })), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return (
    <section className="relative z-10 pt-20 sm:pt-28 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 items-start">
          <div className="flex flex-col gap-8">
            {/* Staggered H1 */}
            <h1
              className={cn(
                "font-display text-[clamp(3.5rem,9vw,10rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-text",
                "transition-all duration-700 ease-out",
                reveal.h1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
            >
              Festival pass resale with a hard price ceiling.
            </h1>

            {/* Subtitle at about half the size */}
            <p
              className={cn(
                "max-w-[42ch] text-[clamp(1.125rem,2vw,1.375rem)] leading-[1.55] text-text-muted",
                "transition-all duration-700 ease-out",
                reveal.subtitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
            >
              Orders are ticketed, reserved, matched and receipted on a mock ledger. Resale
              ceilings are checked before any price can rest. Every balance, trade and
              counterparty here is fictional.
            </p>

            {/* CTAs */}
            <div className={cn("flex flex-col sm:flex-row gap-4", reveal.cta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8", "transition-all duration-700 ease-out")}>
              <Link
                href="/market"
                className={cn(
                  "relative inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-tile border border-brand-500/40 bg-brand-500/[0.06] px-8 sm:px-10 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300 transition-all duration-200",
                  "hover:border-brand-500 hover:bg-brand-500/[0.12] hover:text-brand-200 hover:-translate-y-1",
                  "active:scale-95",
                  // Pass-stub shaped: not a plain rectangle — notched corners implied by ticket-stub styling
                )}
              >
                Enter the marketplace
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-px h-4 bg-brand-500/30" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-tile border border-white/[0.08] bg-white/[0.02] px-8 sm:px-10 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted transition-all duration-200",
                  "hover:border-white/[0.16] hover:text-text hover:bg-white/[0.06]",
                  "active:scale-95",
                )}
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Interactive Ward card — the memorable thing */}
          <div className="flex items-center justify-center">
            <InteractiveWardCard
              faceValue={faceValue}
              ceilingPrice={ceilingPrice}
              ceilingPct={ceilingPct}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
