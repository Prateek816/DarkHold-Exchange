"use client";

import React, { useState } from "react";
import { Order, TransactionReceipt } from "@/lib/types";
import { formatCurrency, formatQuantity, formatTimestamp, formatFullDateTime } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { TheSeal } from "@/components/ui/TheSeal";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { api } from "@/lib/api-client";
import { useUiStore } from "@/lib/stores/uiStore";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabsProps {
  orders: Order[];
  receipts: TransactionReceipt[];
  onOrderCanceled?: () => void;
  className?: string;
}

export function BottomTabs({
  orders,
  receipts,
  onOrderCanceled,
  className,
}: BottomTabsProps) {
  const [activeTab, setActiveTab] = useState<"OPEN" | "HISTORY" | "ACTIVITY">("OPEN");
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Set<string>>(new Set());
  const { addToast } = useUiStore();

  const openOrders = orders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED" || o.status === "PENDING_SUBMIT"
  );
  const historyOrders = orders.filter(
    (o) => o.status === "FILLED" || o.status === "CANCELED" || o.status === "REJECTED"
  );

  const handleCancel = async (orderId: string) => {
    setCancelingOrderIds((prev) => new Set(prev).add(orderId));

    try {
      await api.cancelOrder(orderId);
      addToast({
        type: "success",
        title: "Order canceled",
        message: `Order ${orderId} canceled. Reserved funds/units restored to available.`,
      });
      onOrderCanceled?.();
    } catch (err: any) {
      if (err?.code === "ORDER_NOT_CANCELABLE") {
        addToast({
          type: "warning",
          title: "Cancel rejected",
          message: "This order has already filled or completed settlement.",
          requestId: err.requestId,
        });
      } else {
        addToast({
          type: "error",
          title: "Cancel failed",
          message: "Unable to cancel order. Try again.",
        });
      }
    } finally {
      setCancelingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  return (
    <GlassCard className={cn("flex flex-col overflow-hidden p-0", className)}>
      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-glass-border bg-white/[0.015] px-3 py-2.5 no-scrollbar">
        <SegmentedTabs
          tabs={[
            { id: "OPEN", label: "Open orders", badge: openOrders.length },
            { id: "HISTORY", label: "Order history", badge: historyOrders.length },
            { id: "ACTIVITY", label: "Settlement tape", badge: receipts.length },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          size="sm"
          layoutId="terminal-bottom-tab-pill"
          className="min-w-max"
        />

        <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim sm:flex">
          <ShieldCheck className="h-3 w-3 text-brand-400" />
          ledger synced
        </span>
      </div>

      {/* Open orders */}
      {activeTab === "OPEN" && (
        <div className="no-scrollbar overflow-x-auto">
          {openOrders.length === 0 ? (
            <LineArtEmptyState
              type="NO_ORDERS"
              title="No open orders"
              description="You have no active bids or asks locking vault balances."
              className="py-8"
            />
          ) : (
            <table className="data-table w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-glass-border bg-white/[0.015]">
                  <th className="px-4 py-2.5">Lifecycle seal</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Price</th>
                  <th className="px-4 py-2.5">Fill progress</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {openOrders.map((order) => {
                  const isCanceling = cancelingOrderIds.has(order.order_id);
                  const fillPct = Math.min(
                    100,
                    Math.round((order.matched_qty / (order.qty || 1)) * 100)
                  );

                  return (
                    <tr
                      key={order.order_id}
                      className="transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <TheSeal
                          orderStatus={order.status}
                          settlementStatus={order.settlement_status}
                          showLabel={true}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
                            order.side === "BUY"
                              ? "border-buy/30 bg-buy-bg text-buy-text"
                              : "border-sell/30 bg-sell-bg text-sell-text"
                          )}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                        {order.type}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                        {order.price > 0 ? formatCurrency(order.price) : "Market"}
                      </td>
                      <td className="min-w-[140px] px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[9.5px] text-text-dim">
                            <span>
                              {formatQuantity(order.matched_qty)} / {formatQuantity(order.qty)}
                            </span>
                            <span className="tabular-nums">{fillPct}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full border border-glass-border bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10.5px] text-text-dim">
                        {formatTimestamp(order.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCancel(order.order_id)}
                          disabled={isCanceling}
                          className="inline-flex items-center gap-1 rounded-full border border-sell/40 px-3 py-1 text-[10.5px] font-semibold text-sell-text transition-all hover:bg-sell hover:text-white disabled:opacity-50"
                        >
                          {isCanceling && <Loader2 className="h-3 w-3 animate-spin" />}
                          {isCanceling ? "Canceling…" : "Cancel"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === "HISTORY" && (
        <div className="no-scrollbar overflow-x-auto">
          {historyOrders.length === 0 ? (
            <LineArtEmptyState
              type="NO_ORDERS"
              title="No historic orders"
              description="Completed, canceled, and rejected orders will appear here."
              className="py-8"
            />
          ) : (
            <table className="data-table w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-glass-border bg-white/[0.015]">
                  <th className="px-4 py-2.5">Seal</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Price / avg</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Status & reason</th>
                  <th className="px-4 py-2.5 text-right">Completed at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {historyOrders.map((order) => (
                  <tr
                    key={order.order_id}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <TheSeal
                        orderStatus={order.status}
                        settlementStatus={order.settlement_status}
                        showLabel={true}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
                          order.side === "BUY"
                            ? "border-buy/30 bg-buy-bg text-buy-text"
                            : "border-sell/30 bg-sell-bg text-sell-text"
                        )}
                      >
                        {order.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                      {order.average_price
                        ? formatCurrency(order.average_price)
                        : formatCurrency(order.price)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                      {formatQuantity(order.matched_qty)} of {formatQuantity(order.qty)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <StatusPill status={order.status} size="sm" />
                        {order.reject_reason && (
                          <p
                            className="max-w-xs truncate text-[10px] text-sell-text"
                            title={order.reject_reason}
                          >
                            {order.reject_reason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[10.5px] text-text-dim">
                      {formatFullDateTime(order.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settlement tape */}
      {activeTab === "ACTIVITY" && (
        <div className="no-scrollbar overflow-x-auto">
          {receipts.length === 0 ? (
            <LineArtEmptyState
              type="NO_TRADES"
              title="No settled trades"
              description="Every completed match posts a signed receipt to this tape."
              className="py-8"
            />
          ) : (
            <table className="data-table w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-glass-border bg-white/[0.015]">
                  <th className="px-4 py-2.5">Ledger tx</th>
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Settled cost</th>
                  <th className="px-4 py-2.5">Counterparty</th>
                  <th className="px-4 py-2.5 text-right">Settled at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {receipts.map((rcpt) => (
                  <tr
                    key={rcpt.ledger_tx_id}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <AddressChip value={rcpt.ledger_tx_id} />
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-text-muted">{rcpt.asset_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
                          rcpt.side === "BUY" ? "text-buy-text" : "text-sell-text"
                        )}
                      >
                        {rcpt.side} {formatQuantity(rcpt.qty)}x
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                      {formatCurrency(rcpt.total_cost)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10.5px] text-text-dim">
                      {rcpt.counterparty_id} {rcpt.counterparty_is_sim && "(SIM)"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[10.5px] text-text-dim">
                      {formatFullDateTime(rcpt.settled_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </GlassCard>
  );
}
