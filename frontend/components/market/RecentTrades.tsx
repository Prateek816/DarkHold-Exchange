'use client';

import React from 'react';
import { TradeTick } from '@/lib/types';
import { fmt } from '@/lib/formatters';

interface RecentTradesProps {
  trades: TradeTick[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="card-pod p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line-soft)] mb-2">
        <h3 className="text-xs font-semibold text-white">Recent Trades</h3>
        <span className="text-[10px] font-mono text-[var(--muted)]">Real-time Stream</span>
      </div>

      <div className="grid grid-cols-4 text-[10px] font-semibold text-[var(--muted)] uppercase px-2 mb-1.5 font-mono">
        <span>Time</span>
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Type</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
        {trades.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--muted)]">
            No trades executed yet for this asset.
          </div>
        ) : (
          trades.slice(0, 15).map((t) => {
            const isBuy = t.side === 'BUY';
            return (
              <div
                key={t.id}
                className="grid grid-cols-4 items-center py-1.5 px-2 rounded-lg hover:bg-[var(--raised)] text-xs tabular transition-colors"
              >
                <span className="text-[var(--muted)] text-[11px]">{fmt.time(t.timestamp)}</span>
                <span className={`font-semibold ${isBuy ? 'text-[var(--buy)]' : 'text-[var(--sell)]'}`}>
                  {fmt.price(t.price)}
                </span>
                <span className="text-right text-white">{t.quantity}</span>
                <div className="text-right flex items-center justify-end gap-1">
                  <span className={`text-[10px] font-bold ${isBuy ? 'text-[var(--buy)]' : 'text-[var(--sell)]'}`}>
                    {t.side}
                  </span>
                  {t.is_sim && (
                    <span className="px-1 py-0 rounded text-[8px] font-semibold bg-[rgba(94,220,245,0.12)] text-[var(--sim)] border border-[rgba(94,220,245,0.25)]">
                      SIM
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
