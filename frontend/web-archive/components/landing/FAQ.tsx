"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Is this real money?",
    a: "No. All credits, balances, trades and counterparties in this venue are fictional. There are no real payments, ownership or ticket delivery.",
  },
  {
    q: "What is the ceiling?",
    a: "The Ward is a hard resale cap tied to face value. A limit price above it is rejected by the order endpoint before it reaches the matching path, and no credits are reserved for it.",
  },
  {
    q: "What does SIM mean?",
    a: "SIM marks simulated data: seeded candles, bot trades and synthetic counterparties. SIM Ice hatch shading appears over seeded history, and a SIM badge labels every simulated print.",
  },
  {
    q: "What does \"settling\" mean?",
    a: "After a match, the mock ledger confirms settlement and posts a receipt. Reserved credits are released and the balance updates from the server response — never from an optimistic local estimate.",
  },
  {
    q: "Can bots still get in?",
    a: "Rate limits reduce abuse but do not eliminate it. The engine checks every price, enforces ceilings and runs reconciliation — bots operate under the same rules as any account.",
  },
  {
    q: "How do Dutch auctions work?",
    a: "A lot opens at its ceiling price and steps down on a server-calculated clock. Acceptance is checked against the current tick and your available credits before inventory moves.",
  },
  {
    q: "Does the ledger prove solvency?",
    a: "The mock ledger enforces internal conservation: no negative balances and no trades above ceiling. It is not a production solvency attestation.",
  },
  {
    q: "Are auctions real?",
    a: "Auction creation and acceptance have no production endpoint in this build. Real mode fails explicitly; nothing is purchased and no credits move without a mock contract.",
  },
];

interface FAQItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ q, a, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border border-white/[0.06] rounded-panel bg-white/[0.02] overflow-hidden transition-all duration-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
        aria-expanded={isOpen}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">{q}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-brand-400" /> : <ChevronDown className="h-4 w-4 text-text-dim" />}
      </button>
      {isOpen && (
        <div className="border-t border-white/[0.04] px-5 pb-4">
          <p className="font-mono text-[10.5px] leading-relaxed text-text-muted">{a}</p>
        </div>
      )}
    </div>
  );
}

export function FAQ({ className }: { className?: string }) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set([0]));

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className={cn("relative z-10 border-y border-white/[0.04] bg-white/[0.01]", className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-dim">
              Honest questions
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3vw,2.5rem)] font-semibold leading-none text-text">
              Read before you trade
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              q={faq.q}
              a={faq.a}
              isOpen={openIds.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
