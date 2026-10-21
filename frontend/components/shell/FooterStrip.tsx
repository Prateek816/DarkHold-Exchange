"use client";

import React from "react";
import { ShieldCheck, Info } from "lucide-react";
import { SimBadge } from "@/components/ui/SimBadge";

export function FooterStrip() {
  return (
    <footer className="w-full border-t border-white/8 bg-white/[0.015] backdrop-blur-[16px] px-4 py-2.5 text-xs font-sans text-text-dim flex flex-wrap items-center justify-between gap-3 z-40 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          <span className="font-semibold text-white/90">THE GRIMOIRE LEDGER</span>
          <span className="text-[10px] text-text-dim font-mono">v2.4-engine</span>
        </div>
        <span className="text-white/10">|</span>
        <div className="flex items-center gap-2 text-[11px]">
          <SimBadge label="SIM" size="sm" />
          <span>Simulated market. Funds are simulated credits. Activity includes simulated traders.</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1 hover:text-white transition-colors cursor-help" title="Reserve -> Match -> Settle pipeline enforces 100% solvency without unbacked fractional trading.">
          <Info className="w-3 h-3 text-text-dim" />
          <span>Reserve-Match-Settle Protocol</span>
        </span>
        <span className="text-white/10">|</span>
        <span className="text-warning/80">Anti-Scalping Ward Active</span>
      </div>
    </footer>
  );
}
