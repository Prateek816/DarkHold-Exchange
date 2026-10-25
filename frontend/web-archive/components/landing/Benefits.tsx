"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  Activity,
  Gavel,
  ReceiptText,
  AlertTriangle,
  Lock,
} from "lucide-react";

// 6 original SVG sigils with shared stroke grammar instead of generic line icons
const SIGILS = [
  {
    id: "ceiling",
    label: "The ceiling",
    body: "Resale prices are capped at face value + pct. The Ward rejects anything above it — before the order reaches the book.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <path d="M12 2v20" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    color: "text-ward",
  },
  {
    id: "orderbook",
    label: "Live order book",
    body: "Bids and asks breathe from the mock feed. Depth is a server snapshot; nothing is aggregated from an external venue.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M12 3v18" />
      </svg>
    ),
    color: "text-verdigris-400",
  },
  {
    id: "auctions",
    label: "Dutch auctions",
    body: "Lots open at the ceiling and step down on a clock. Acceptance is checked against the current tick and your credits.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M4 12h16" />
        <path d="M12 14l3-3-3-3" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    color: "text-brand-400",
  },
  {
    id: "ledger",
    label: "Ledger & reconciliation",
    body: "Reserve → Match → Settle. Eight reconciliation rings light in sequence; verdigris pass, crimson fail.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: "text-brand-300",
  },
  {
    id: "simulation",
    label: "Honest simulation labels",
    body: "SIM Ice hatch over seeded data, SIM badges on every bot print, persistent footer notice. No invented customer numbers.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h10v10H7z" />
      </svg>
    ),
    color: "text-sim",
  },
  {
    id: "recovery",
    label: "Crash recovery",
    body: "Disconnect → reconnect → syncing → live. Backoff, heartbeat, snapshot plus REST catch-up. No state is lost.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20" />
        <path d="M12 14l3-3-3-3" />
      </svg>
    ),
    color: "text-text-muted",
  },
];

interface BenefitProps {
  item: typeof SIGILS[number];
}

function BenefitCard({ item }: BenefitProps) {
  return (
    <div className="rounded-card border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-card p-6 sm:p-8 transition-all duration-300 hover:border-white/[0.16] hover:shadow-card-hover group">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-tile mb-4", item.color)}>
        {item.icon}
      </div>
      <h3 className="font-display text-[17px] font-semibold leading-none text-text">{item.label}</h3>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-text-muted">{item.body}</p>
    </div>
  );
}

export function Benefits({ className }: { className?: string }) {
  return (
    <section className={cn("relative z-10 border-y border-white/[0.04] bg-white/[0.01]", className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              What the ceiling makes possible
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3vw,2.5rem)] font-semibold leading-none text-text">
              Six mechanics, one idea
            </h2>
          </div>
        </div>

        {/* Asymmetric bento: 2-3-1 layout */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BenefitCard item={SIGILS[0]} />
          </div>
          <div className="lg:col-span-2">
            <BenefitCard item={SIGILS[1]} />
          </div>
          <BenefitCard item={SIGILS[2]} />
          <BenefitCard item={SIGILS[3]} />
          <BenefitCard item={SIGILS[4]} />
          <div className="lg:col-span-2 lg:row-span-2">
            <BenefitCard item={SIGILS[5]} />
          </div>
        </div>
      </div>
    </section>
  );
}
