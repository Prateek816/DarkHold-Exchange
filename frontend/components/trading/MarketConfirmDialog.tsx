'use client';

import React from 'react';
import { Asset } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface MarketConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  asset: Asset;
  side: 'BUY' | 'SELL';
  quantity: number;
  worstPrice: number;
  estimatedCost: number;
}

export function MarketConfirmDialog({
  open,
  onClose,
  onConfirm,
  asset,
  side,
  quantity,
  worstPrice,
  estimatedCost,
}: MarketConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md surface p-6 rounded-2xl border border-[var(--border)] shadow-deep relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,181,71,0.15)] text-[var(--ceiling)] flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Confirm Market {side}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Price protection and maximum cost guarantee
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-xl surface-2 border border-[var(--border)] text-xs mb-5">
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Asset:</span>
            <span className="font-bold text-white">{asset.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Order Quantity:</span>
            <span className="font-mono font-bold text-white">{quantity} unit(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Worst Acceptable Price:</span>
            <span className="font-mono font-bold text-[var(--ceiling)]">
              {fmt.price(worstPrice)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--text-dim)] font-medium">Max Reserved Cost:</span>
            <span className="font-mono text-sm font-bold text-white">
              {fmt.price(estimatedCost)}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[var(--text-dim)] mb-5 flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-[var(--buy)] shrink-0" />
          <span>If resting book liquidity exceeds your worst price, unfilled balance is refunded immediately.</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-black ${
              side === 'BUY' ? 'btn-buy' : 'btn-sell'
            }`}
          >
            Confirm {side} Order
          </button>
        </div>
      </div>
    </div>
  );
}
