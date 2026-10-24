'use client';

import React from 'react';
import { OrderBookSnapshot, OrderBookLevel } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import { useUserStore } from '@/lib/store';

interface OrderBookLadderProps {
  book: OrderBookSnapshot | null;
  ceilingPrice: number;
  onSelectPrice?: (price: number) => void;
}

export function OrderBookLadder({ book, ceilingPrice, onSelectPrice }: OrderBookLadderProps) {
  const { orders } = useUserStore();

  if (!book) {
    return (
      <div className="surface p-4 rounded-2xl flex flex-col h-full justify-center items-center text-xs text-[var(--muted)]">
        Connecting to Order Book feed…
      </div>
    );
  }

  const userPrices = new Set(
    orders
      .filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED')
      .map((o) => o.price)
  );

  const maxTotal = Math.max(
    ...book.asks.map((a) => a.total),
    ...book.bids.map((b) => b.total),
    1
  );

  return (
    <div className="surface p-5 rounded-3xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line-soft)] mb-2">
        <h3 className="text-xs font-semibold text-white">Order Book (L2)</h3>
        <span className="text-[10px] font-mono text-[var(--muted)]">
          seq: #{book.as_of_seq}
        </span>
      </div>

      {/* Column Titles */}
      <div className="grid grid-cols-3 text-[10px] font-semibold text-[var(--muted)] uppercase px-2 mb-1">
        <span>Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sells) - up to 12 levels */}
      <div className="flex flex-col-reverse justify-end flex-1 overflow-hidden space-y-0.5 space-y-reverse">
        {book.asks.length === 0 ? (
          <div className="text-center py-4 text-xs text-[var(--muted)]">No sellers</div>
        ) : (
          book.asks.slice(0, 10).map((level) => {
            const depthPct = Math.min(100, (level.total / maxTotal) * 100);
            const isCeiling = level.price >= ceilingPrice;
            const isOwnOrder = userPrices.has(level.price);

            return (
              <div
                key={`ask-${level.price}`}
                onClick={() => {
                  sound.playClick();
                  onSelectPrice?.(level.price);
                }}
                className={`ob-row rounded relative group hover:bg-[rgba(255,90,95,0.08)] cursor-pointer ${isOwnOrder ? 'user-order' : ''}`}
              >
                <div
                  className="depth-bar-ask"
                  style={{ width: `${depthPct}%` }}
                />
                <span className={`text-[var(--sell)] z-10 flex items-center gap-1.5 font-mono ${isCeiling ? 'font-bold underline decoration-[var(--cap)]' : ''}`}>
                  {isOwnOrder && <span className="w-1.5 h-1.5 rounded-full bg-[var(--lav)] shrink-0" title="Your order" />}
                  {fmt.price(level.price)}
                  {isCeiling && <span className="text-[9px] text-[var(--cap)] font-bold">CAP</span>}
                </span>
                <span className="text-right text-white z-10 font-mono">{level.quantity}</span>
                <span className="text-right text-[var(--muted)] z-10 font-mono">{level.total}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Spread Row */}
      <div className="py-2.5 my-1 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border-y border-[var(--line-soft)] flex items-center justify-between text-xs font-mono">
        <span className="text-[var(--muted)] text-[11px]">Spread</span>
        <span className="font-bold text-white">
          {book.spread > 0 ? `${fmt.price(book.spread)} (${book.spread_percent.toFixed(2)}%)` : 'No Spread'}
        </span>
      </div>

      {/* Bids (Buys) */}
      <div className="flex flex-col flex-1 overflow-hidden space-y-0.5">
        {book.bids.length === 0 ? (
          <div className="text-center py-4 text-xs text-[var(--muted)]">No buyers</div>
        ) : (
          book.bids.slice(0, 10).map((level) => {
            const depthPct = Math.min(100, (level.total / maxTotal) * 100);
            const isOwnOrder = userPrices.has(level.price);

            return (
              <div
                key={`bid-${level.price}`}
                onClick={() => {
                  sound.playClick();
                  onSelectPrice?.(level.price);
                }}
                className={`ob-row rounded relative group hover:bg-[rgba(61,220,110,0.08)] cursor-pointer ${isOwnOrder ? 'user-order' : ''}`}
              >
                <div
                  className="depth-bar-bid"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="text-[var(--buy)] z-10 font-medium font-mono flex items-center gap-1.5">
                  {isOwnOrder && <span className="w-1.5 h-1.5 rounded-full bg-[var(--lav)] shrink-0" title="Your order" />}
                  {fmt.price(level.price)}
                </span>
                <span className="text-right text-white z-10 font-mono">{level.quantity}</span>
                <span className="text-right text-[var(--muted)] z-10 font-mono">{level.total}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
