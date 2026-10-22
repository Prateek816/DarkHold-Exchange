"use client";

import React from "react";
import { ShieldCheck, Info } from "lucide-react";
import { SimBadge } from "@/components/ui/SimBadge";

export function FooterStrip() {
  return (
    <footer className="mt-2 hidden w-full items-center justify-between gap-4 rounded-[14px] border border-glass-border bg-white/[0.015] px-4 py-2.5 text-[11px] text-text-dim backdrop-blur-[16px] select-none md:flex">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
          <span className="font-display text-[11px] font-semibold tracking-wide text-text-muted">
            THE GRIMOIRE LEDGER
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em] text-text-dim">v3.0-engine</span>
        </span>
        <span className="h-3 w-px bg-white/10" />
        <span className="flex items-center gap-2">
          <SimBadge label="SIM" size="sm" />
          <span>Simulated market · simulated credits · simulated counterparties</span>
        </span>
      </div>

      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.1em]">
        <span
          className="flex cursor-help items-center gap-1.5 transition-colors hover:text-text-muted"
          title="Reserve → Match → Settle pipeline enforces 100% solvency without unbacked fractional trading."
        >
          <Info className="h-3 w-3" />
          <span>Reserve · Match · Settle</span>
        </span>
        <span className="h-3 w-px bg-white/10" />
        <span className="text-warning/80">Anti-Scalping Ward Active</span>
      </div>
    </footer>
  );
}
