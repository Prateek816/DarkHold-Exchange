"use client";

import React from "react";
import { TransactionReceipt } from "@/lib/types";
import { formatCurrency, formatFullDateTime } from "@/lib/format";
import { SimBadge } from "@/components/ui/SimBadge";
import { ShieldCheck, X, Copy, Check, ArrowRight } from "lucide-react";
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

  if (!receipt) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const settlementLatencyMs = receipt.settled_at - receipt.matched_at;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[12px] animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-24 border border-white/10 bg-[#080B10]/95 backdrop-blur-[24px] p-6 sm:p-7 font-sans text-xs shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] space-y-6">
        {/* Top hairline highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* Header with Grimoire Seal */}
        <div className="flex items-start justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-14 border border-buy/30 bg-buy-tint flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.25)]">
              <ShieldCheck className="w-5 h-5 text-buy" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Ledger Settlement Receipt
              </h3>
              <p className="text-[11px] text-text-muted">
                Cryptographically committed to the reserve-match-settle chain.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ledger Transaction ID */}
        <div className="p-3.5 rounded-16 bg-white/[0.03] border border-white/8 flex items-center justify-between font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Ledger TX ID</span>
            <p className="text-xs font-semibold text-white">{receipt.ledger_tx_id}</p>
          </div>
          <button
            onClick={() => handleCopy(receipt.ledger_tx_id)}
            className="p-2 rounded-10 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white transition-colors"
            title="Copy Ledger Transaction ID"
          >
            {copiedId === receipt.ledger_tx_id ? (
              <Check className="w-3.5 h-3.5 text-buy" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Trade Details Grid */}
        <div className="grid grid-cols-2 gap-4 border-y border-white/8 py-4 text-xs font-sans">
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Asset</span>
            <span className="text-white font-medium">{receipt.asset_name}</span>
          </div>
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Execution Side</span>
            <span className={cn("font-semibold uppercase font-mono", receipt.side === "BUY" ? "text-buy" : "text-sell")}>
              {receipt.side} ({receipt.qty} units)
            </span>
          </div>
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Fill Price</span>
            <span className="text-white font-mono">{formatCurrency(receipt.price)}</span>
          </div>
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Total Settled</span>
            <span className="text-white font-bold font-mono text-sm">{formatCurrency(receipt.total_cost)}</span>
          </div>
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Counterparty</span>
            <div className="flex items-center gap-1.5 pt-0.5 font-mono">
              <span className="text-white">{receipt.counterparty_id}</span>
              {receipt.counterparty_is_sim && <SimBadge label="SIM" size="sm" />}
            </div>
          </div>
          <div>
            <span className="text-text-dim block text-[10px] uppercase tracking-wider">Settlement Latency</span>
            <span className="text-buy font-mono font-medium">{settlementLatencyMs} ms</span>
          </div>
        </div>

        {/* Solvency Audit: Balance Before and After */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-dim block font-medium">
            Vault Balance Mutation Truth
          </span>
          <div className="p-3.5 rounded-16 bg-white/[0.025] border border-white/6 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-text-dim block">Balance Before</span>
              <span className="text-white font-medium">{formatCurrency(receipt.balance_before)}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-text-dim" />
            <div className="text-right">
              <span className="text-[10px] text-text-dim block">Balance After</span>
              <span className="text-buy font-bold text-sm">
                {formatCurrency(receipt.balance_after)}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex justify-between text-[11px] text-text-dim pt-2 border-t border-white/6 font-mono">
          <span>Matched: {formatFullDateTime(receipt.matched_at)}</span>
          <span>Settled: {formatFullDateTime(receipt.settled_at)}</span>
        </div>
      </div>
    </div>
  );
}
