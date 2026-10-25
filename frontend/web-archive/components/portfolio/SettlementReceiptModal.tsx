"use client";

import React, { useEffect, useRef } from "react";
import type { TransactionReceipt } from "@/lib/types";
import { formatCurrency, formatFullDateTime } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Fingerprint,
  ShieldQuestion,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettlementReceiptModalProps {
  receipt: TransactionReceipt | null;
  onClose: () => void;
}

const statusCopy: Record<string, string> = {
  PENDING: "Settlement pending",
  COMPLETED: "Settlement completed in mock",
  FAILED: "Settlement failed",
};

export function SettlementReceiptModal({
  receipt,
  onClose,
}: SettlementReceiptModalProps) {
  const [copied, setCopied] = React.useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!receipt) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const settlementLatencyMs = Math.max(0, receipt.settled_at - receipt.matched_at);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      aria-describedby="receipt-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className="no-scrollbar relative max-h-[92vh] w-full max-w-lg overflow-y-auto border border-glass-border-strong bg-surface shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-glass-border bg-canvas-elevated px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-brand-500/35 text-brand-400">
              <Fingerprint className="h-4 w-4" />
            </span>
            <div>
              <span className="keyline">Ledger artefact</span>
              <h2
                id="receipt-title"
                className="pt-1 font-display text-[25px] leading-none text-text"
              >
                Settlement receipt
              </h2>
              <p
                id="receipt-description"
                className="pt-1 text-[10.5px] leading-relaxed text-text-muted"
              >
                Issued by the in-memory mock server. Not a payment instrument or proof of
                ownership.
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="flex h-8 w-8 items-center justify-center border border-glass-border text-text-muted transition-colors hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3 border border-glass-border bg-canvas p-3">
            <div className="min-w-0">
              <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.13em] text-text-dim">
                <Fingerprint className="h-2.5 w-2.5" />
                Ledger transaction
              </span>
              <p className="truncate pt-0.5 font-mono text-[11px] text-text">
                {receipt.ledger_tx_id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(receipt.ledger_tx_id)}
              aria-label="Copy ledger transaction ID"
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-glass-border text-text-muted transition-colors hover:text-text"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-buy" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SimBadge label="SIMULATED" size="sm" />
            <span
              className={cn(
                "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]",
                receipt.settlement_status === "COMPLETED"
                  ? "border-buy/35 bg-buy/10 text-buy-text"
                  : receipt.settlement_status === "FAILED"
                  ? "border-sell/40 bg-sell/10 text-sell-text"
                  : "border-warning/35 bg-warning/10 text-warning"
              )}
            >
              {receipt.settlement_status === "PENDING" ? (
                <Clock className="h-2.5 w-2.5" />
              ) : (
                <ShieldQuestion className="h-2.5 w-2.5" />
              )}
              {statusCopy[receipt.settlement_status] ?? receipt.settlement_status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-y border-glass-border py-4">
            <div>
              <span className="data-label block">Asset</span>
              <span className="block pt-0.5 text-[12px] text-text">{receipt.asset_name}</span>
            </div>
            <div>
              <span className="data-label block">Side / quantity</span>
              <span
                className={cn(
                  "block pt-0.5 font-mono text-[11.5px] uppercase",
                  receipt.side === "BUY" ? "text-buy-text" : "text-sell-text"
                )}
              >
                {receipt.side} · {receipt.qty} unit{receipt.qty === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <span className="data-label block">Fill price</span>
              <span className="block pt-0.5 font-mono text-[12px] tabular-nums text-text">
                {formatCurrency(receipt.price)}
              </span>
            </div>
            <div>
              <span className="data-label block">Total at fill</span>
              <span className="block pt-0.5 font-mono text-[13px] tabular-nums text-text">
                {formatCurrency(receipt.total_cost)}
              </span>
            </div>
            <div>
              <span className="data-label block">Counterparty</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="font-mono text-[11px] text-text">{receipt.counterparty_id}</span>
                {receipt.counterparty_is_sim && <SimBadge label="SIM" size="sm" />}
              </div>
            </div>
            <div>
              <span className="data-label block">Matched → settled</span>
              <span className="block pt-0.5 font-mono text-[11px] tabular-nums text-text-muted">
                {settlementLatencyMs} ms
              </span>
            </div>
          </div>

          <div>
            <span className="data-label block pb-2">Wallet balance at receipt time</span>
            <div className="flex items-center justify-between gap-3 border border-glass-border bg-canvas p-3 font-mono">
              <div>
                <span className="block text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
                  Before
                </span>
                <span className="text-[12px] tabular-nums text-text">
                  {formatCurrency(receipt.balance_before)}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-text-dim" />
              <div className="text-right">
                <span className="block text-[8.5px] uppercase tracking-[0.1em] text-text-dim">
                  After
                </span>
                <span className="text-[12px] tabular-nums text-text">
                  {formatCurrency(receipt.balance_after)}
                </span>
              </div>
            </div>
            <p className="pt-2 font-mono text-[8.5px] leading-relaxed text-text-dim">
              These are the balances recorded on this receipt, not necessarily the wallet's
              current balance. Later fills, reservations or settlements may have moved it.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border pt-3 font-mono text-[9px] text-text-dim">
            <span>Matched {formatFullDateTime(receipt.matched_at)}</span>
            <span>Settled {formatFullDateTime(receipt.settled_at)}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-3">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.09em] text-text-dim">
              Mock receipt · no cryptographic proof
            </span>
            <button
              type="button"
              onClick={onClose}
              className="border border-glass-border px-4 py-2 text-[11px] text-text-muted transition-colors hover:text-text"
            >
              Close receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
