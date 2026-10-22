"use client";

import React, { useEffect } from "react";
import { TransactionReceipt } from "@/lib/types";
import { formatCurrency, formatFullDateTime } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { motion } from "framer-motion";
import { ShieldCheck, X, Copy, Check, ArrowRight, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettlementReceiptModalProps {
  receipt: TransactionReceipt | null;
  onClose: () => void;
}

export function SettlementReceiptModal({
  receipt,
  onClose,
}: SettlementReceiptModalProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (!receipt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const settlementLatencyMs = receipt.settled_at - receipt.matched_at;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[12px]"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="relative max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-[22px] border border-glass-border-strong bg-canvas-elevated/95 p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-[24px] sm:p-7 no-scrollbar"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-glass-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-buy/30 bg-buy-tint text-buy shadow-[0_0_18px_rgba(34,197,94,0.22)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="receipt-title"
                className="font-display text-[16px] font-semibold tracking-tight text-text"
              >
                Settlement receipt
              </h3>
              <p className="pt-0.5 text-[11px] leading-relaxed text-text-muted">
                Committed to the reserve → match → settle chain.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receipt"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/[0.04] text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt body */}
        <div className="space-y-4 rounded-panel border border-glass-border bg-canvas/60 p-4">
          <div className="flex items-center justify-between gap-3 rounded-[11px] border border-glass-border bg-white/[0.025] p-3">
            <div className="min-w-0 space-y-0.5">
              <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-text-dim">
                <Fingerprint className="h-2.5 w-2.5" />
                Ledger tx id
              </span>
              <p className="truncate font-mono text-[11.5px] font-semibold text-text">
                {receipt.ledger_tx_id}
              </p>
            </div>
            <button
              onClick={() => handleCopy(receipt.ledger_tx_id)}
              aria-label="Copy ledger transaction ID"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-glass-border bg-white/[0.03] text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text"
            >
              {copiedId === receipt.ledger_tx_id ? (
                <Check className="h-3.5 w-3.5 text-buy" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <div>
              <span className="data-label block">Asset</span>
              <span className="pt-0.5 block text-[12px] font-medium text-text">
                {receipt.asset_name}
              </span>
            </div>
            <div>
              <span className="data-label block">Execution side</span>
              <span
                className={cn(
                  "block pt-0.5 font-mono text-[11.5px] font-semibold uppercase",
                  receipt.side === "BUY" ? "text-buy-text" : "text-sell-text"
                )}
              >
                {receipt.side} · {receipt.qty} units
              </span>
            </div>
            <div>
              <span className="data-label block">Fill price</span>
              <span className="block pt-0.5 font-mono text-[12px] text-text">
                {formatCurrency(receipt.price)}
              </span>
            </div>
            <div>
              <span className="data-label block">Total settled</span>
              <span className="block pt-0.5 font-mono text-[13px] font-bold text-text">
                {formatCurrency(receipt.total_cost)}
              </span>
            </div>
            <div>
              <span className="data-label block">Counterparty</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="font-mono text-[11px] text-text">
                  {receipt.counterparty_id}
                </span>
                {receipt.counterparty_is_sim && <SimBadge label="SIM" size="sm" />}
              </div>
            </div>
            <div>
              <span className="data-label block">Settlement latency</span>
              <span className="block pt-0.5 font-mono text-[12px] font-medium text-buy-text">
                {settlementLatencyMs} ms
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-white/[0.1] pt-3.5">
            <span className="data-label block pb-2">Vault balance mutation</span>
            <div className="flex items-center justify-between gap-3 rounded-[11px] border border-glass-border bg-white/[0.02] p-3 font-mono">
              <div>
                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  Before
                </span>
                <span className="text-[12px] font-medium text-text">
                  {formatCurrency(receipt.balance_before)}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-dim" />
              <div className="text-right">
                <span className="block text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  After
                </span>
                <span className="text-[12px] font-bold text-buy-text">
                  {formatCurrency(receipt.balance_after)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border pt-3 font-mono text-[9.5px] text-text-dim">
          <span>Matched {formatFullDateTime(receipt.matched_at)}</span>
          <span>Settled {formatFullDateTime(receipt.settled_at)}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-buy-text">
            <ShieldCheck className="h-3 w-3" />
            receipt verified
          </span>
          <button
            onClick={onClose}
            className="rounded-[11px] border border-glass-border bg-white/[0.04] px-4 py-2 text-[11.5px] font-medium text-text transition-colors hover:bg-white/[0.08]"
          >
            Close receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
}
