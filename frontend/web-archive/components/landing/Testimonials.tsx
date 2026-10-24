"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Sample quotes written for this demo — never presented as real customers
const TESTIMONIALS = [
  {
    name: "Mira Chen",
    role: "Fan",
    quote: "I actually trust the price I see. The ceiling means I'm not bidding against a bot with deeper pockets.",
    avatar: "M",
    color: "text-verdigris-400",
  },
  {
    name: "Darius Boone",
    role: "Reseller",
    quote: "The Ward is honest: my $285 limit was rejected before it touched the book. No surprises, no wasted credits.",
    avatar: "D",
    color: "text-brand-400",
  },
  {
    name: "Lena Voss",
    role: "Issuer",
    quote: "We set the face value and the cap. The mock ledger proves the mechanics without risking real inventory.",
    avatar: "L",
    color: "text-text-muted",
  },
  {
    name: "Operator-07",
    role: "Operator",
    quote: "Eight rings all green. Settlement drift is zero. The reserve-match-settle flow holds under load.",
    avatar: "O",
    color: "text-brand-300",
  },
  {
    name: "Blocked Bot",
    role: "Scalper (stopped)",
    quote: "Tried to list above ceiling. The mock engine rejected it. Good — the market stays fair.",
    avatar: "B",
    color: "text-warning",
  },
];

function SigilAvatar({ letter, color }: { letter: string; color: string }) {
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border border-white/[0.12] bg-white/[0.04]", color)}>
      <span className="font-mono text-[11px] font-semibold text-text">{letter}</span>
    </div>
  );
}

export function Testimonials({ className }: { className?: string }) {
  return (
    <section className={cn("relative z-10 border-y border-white/[0.04] bg-white/[0.01]", className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              Sample quotes — written for this demo
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3vw,2.5rem)] font-semibold leading-none text-text">
              What people say
            </h2>
            <p className="mt-3 font-mono text-[10px] text-text-dim">
              Personas are fictional. Quotes are sample copy for this demo only.
            </p>
          </div>
        </div>

        {/* Staggered masonry */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className={cn(
                "rounded-card border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-card p-6 sm:p-8",
                "transition-all duration-700 ease-out",
                `opacity-0 translate-y-8 delay-${i * 100}`,
                "animate-[tick-in_0.4s_ease-out_forwards]",
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <SigilAvatar letter={t.avatar} color={t.color} />
                <div>
                  <p className="font-display text-[14px] font-semibold leading-none text-text">{t.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">{t.role}</p>
                </div>
              </div>
              <p className="font-mono text-[12px] leading-relaxed text-text-muted">
                "{t.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
