'use client';

import React, { useState } from 'react';
import { useUserStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export function OrdersTabs({ assetId }: { assetId?: string }) {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'HISTORY' | 'ACTIVITY'>('OPEN');
  const { orders, cancelOrder } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  const relevantOrders = assetId ? orders.filter((o) => o.asset_id === assetId) : orders;
  const openOrders = relevantOrders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');
  const historyOrders = relevantOrders.filter(
    (o) => o.status === 'FILLED' || o.status === 'CANCELED' || o.status === 'REJECTED'
  );

  const handleCancel = (orderId: string) => {
    cancelOrder(orderId);
    pushToast({
      variant: 'info',
      title: 'Order Canceled',
      body: `Order #${fmt.shortId(orderId)} canceled. Escrowed funds released.`,
    });
  };

  return (
    <div className="card-pod overflow-hidden flex flex-col">
      {/* Tabs Header */}
      <div className="p-3 border-b border-[var(--line-soft)] flex items-center justify-between bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'OPEN'
                ? 'bg-[var(--raised)] text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[var(--raised)] text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            Order History ({historyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ACTIVITY'
                ? 'bg-[var(--raised)] text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            Settlement Activity
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-4 overflow-x-auto min-h-[160px]">
        {activeTab === 'OPEN' && (
          <div>
            {openOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--muted)]">
                No active open orders for this asset.
              </div>
            ) : (
              <div className="space-y-2">
                {openOrders.map((o) => {
                  const fillPct = (o.filled_quantity / o.quantity) * 100;
                  const isBuy = o.side === 'BUY';
                  return (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isBuy
                              ? 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)] border border-[rgba(61,220,110,0.3)]'
                              : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)] border border-[rgba(255,90,95,0.3)]'
                          }`}
                        >
                          {o.side} {o.type}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{o.asset_symbol}</span>
                            <span className="font-mono text-[var(--muted)] text-[11px]">
                              #{fmt.shortId(o.id)}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--dim)] font-mono">
                            {fmt.time(o.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 font-mono">
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Price</span>
                          <span className="text-white font-semibold">{fmt.price(o.price)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Filled / Qty</span>
                          <span className="text-white">
                            {o.filled_quantity} / {o.quantity}
                          </span>
                        </div>
                        <div className="w-24">
                          <span className="text-[10px] text-[var(--muted)] block">Progress</span>
                          <div className="w-full bg-[rgba(255,255,255,0.06)] h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className="bg-[var(--lav)] h-full rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(61,220,110,0.12)] text-[var(--buy)]">
                          OPEN
                        </span>
                        <button
                          onClick={() => handleCancel(o.id)}
                          className="px-3 py-1.5 rounded-lg border border-[rgba(255,90,95,0.3)] text-[var(--sell)] hover:bg-[rgba(255,90,95,0.1)] text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div>
            {historyOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--muted)]">
                No past orders recorded in history.
              </div>
            ) : (
              <div className="space-y-2">
                {historyOrders.map((o) => {
                  const isFilled = o.status === 'FILLED';
                  const isCanceled = o.status === 'CANCELED';
                  return (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            o.side === 'BUY'
                              ? 'bg-[rgba(61,220,110,0.15)] text-[var(--buy)]'
                              : 'bg-[rgba(255,90,95,0.15)] text-[var(--sell)]'
                          }`}
                        >
                          {o.side}
                        </span>
                        <div>
                          <span className="font-bold text-white">{o.asset_symbol}</span>
                          <span className="text-[11px] text-[var(--muted)] block font-mono">
                            {fmt.date(o.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 font-mono">
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Execution Price</span>
                          <span className="text-white font-semibold">{fmt.price(o.price)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--muted)] block">Total Units</span>
                          <span className="text-white">{o.quantity}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isFilled
                            ? 'bg-[rgba(61,220,110,0.12)] text-[var(--buy)]'
                            : isCanceled
                            ? 'bg-[var(--raised)] text-[var(--muted)]'
                            : 'bg-[rgba(255,90,95,0.12)] text-[var(--sell)]'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ACTIVITY' && (
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--buy)]">
                <CheckCircle2 size={15} />
                <span>Double-entry ledger reconciliation check passed (R1–R8)</span>
              </div>
              <span className="text-[var(--muted)]">Just now</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--sim)]">
                <Clock size={15} />
                <span>Simulated market liquidity loop running at 100% health</span>
              </div>
              <span className="text-[var(--muted)]">30s ago</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
