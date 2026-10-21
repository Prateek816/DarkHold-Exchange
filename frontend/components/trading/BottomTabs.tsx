"use client";

import React, { useState } from "react";
import { Order, TransactionReceipt } from "@/lib/types";
import { formatCurrency, formatQuantity, formatTimestamp, formatFullDateTime } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { TheSeal } from "@/components/ui/TheSeal";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { api } from "@/lib/api-client";
import { useUiStore } from "@/lib/stores/uiStore";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { ShieldCheck } from "lucide-react";
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
        title: "Order Canceled",
        message: `Order ${orderId} canceled. Reserved funds/units restored to available.`,
      });
      onOrderCanceled?.();
    } catch (err: any) {
      if (err?.code === "ORDER_NOT_CANCELABLE") {
        addToast({
          type: "warning",
          title: "Cancel Rejected",
          message: "Already filled or completed.",
          requestId: err.requestId,
        });
      } else {
        addToast({
          type: "error",
          title: "Cancel Failed",
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
    <GlassCard className={cn("flex flex-col font-mono text-xs overflow-hidden p-0", className)}>
      {/* Tabs Switcher Header */}
      <div className="flex items-center justify-between border-b border-glass-border bg-white/[0.02] px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("OPEN")}
            className={cn(
              "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all flex items-center gap-2",
              activeTab === "OPEN"
                ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                : "text-text-muted hover:text-text"
            )}
          >
            <span>Open Orders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-white/10 text-text-muted">
              {openOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("HISTORY")}
            className={cn(
              "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all flex items-center gap-2",
              activeTab === "HISTORY"
                ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                : "text-text-muted hover:text-text"
            )}
          >
            <span>Order History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-white/10 text-text-muted">
              {historyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ACTIVITY")}
            className={cn(
              "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all flex items-center gap-2",
              activeTab === "ACTIVITY"
                ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                : "text-text-muted hover:text-text"
            )}
          >
            <span>Settlement Tape</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-pill bg-white/10 text-text-muted">
              {receipts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Open Orders (DataTable style) */}
      {activeTab === "OPEN" && (
        <div className="overflow-x-auto min-h-[170px]">
          {openOrders.length === 0 ? (
            <LineArtEmptyState
              type="NO_ORDERS"
              title="No Open Orders"
              description="You have no active bids or asks locking vault balances."
              className="py-8"
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                  <th className="px-4 py-2.5">Lifecycle Seal</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Price</th>
                  <th className="px-4 py-2.5">Fill Progress</th>
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
                      className="hover:bg-white/[0.035] transition-colors"
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
                            "font-bold uppercase text-[11px] px-2 py-0.5 rounded-pill border",
                            order.side === "BUY"
                              ? "bg-buy-bg text-buy-text border-buy/30"
                              : "bg-sell-bg text-sell border-sell/30"
                          )}
                        >
                          {order.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{order.type}</td>
                      <td className="px-4 py-3 font-semibold text-text tabular-nums">
                        {order.price > 0 ? formatCurrency(order.price) : "Market"}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-text-dim">
                            <span>
                              {order.matched_qty} / {order.qty}
                            </span>
                            <span>{fillPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-pill overflow-hidden border border-glass-border">
                            <div
                              className="h-full bg-brand-400 rounded-pill transition-all duration-300"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-dim text-[11px]">
                        {formatTimestamp(order.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Outlined Cancel Pill */}
                        <button
                          onClick={() => handleCancel(order.order_id)}
                          disabled={isCanceling}
                          className="px-3 py-1 rounded-pill border border-sell/40 text-sell hover:bg-sell hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
                        >
                          {isCanceling ? "Canceling..." : "Cancel"}
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

      {/* Tab 2: Order History */}
      {activeTab === "HISTORY" && (
        <div className="overflow-x-auto min-h-[170px]">
          {historyOrders.length === 0 ? (
            <div className="p-8 text-center text-text-dim">No historic orders recorded.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                  <th className="px-4 py-2.5">Seal</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Price / Avg</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Status & Reason</th>
                  <th className="px-4 py-2.5 text-right">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {historyOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-white/[0.035] transition-colors">
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
                          "font-bold uppercase text-[11px] px-2 py-0.5 rounded-pill border",
                          order.side === "BUY"
                            ? "bg-buy-bg text-buy-text border-buy/30"
                            : "bg-sell-bg text-sell border-sell/30"
                        )}
                      >
                        {order.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text font-semibold tabular-nums">
                      {order.average_price ? formatCurrency(order.average_price) : formatCurrency(order.price)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {order.matched_qty} of {order.qty}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <StatusPill status={order.status} size="sm" />
                        {order.reject_reason && (
                          <p className="text-[10px] text-sell truncate max-w-xs pt-0.5" title={order.reject_reason}>
                            {order.reject_reason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-text-dim text-[11px]">
                      {formatFullDateTime(order.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Settlement Tape */}
      {activeTab === "ACTIVITY" && (
        <div className="overflow-x-auto min-h-[170px]">
          {receipts.length === 0 ? (
            <div className="p-8 text-center text-text-dim">No settled trades on the ledger.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                  <th className="px-4 py-2.5">Ledger TX</th>
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Settled Cost</th>
                  <th className="px-4 py-2.5">Counterparty</th>
                  <th className="px-4 py-2.5 text-right">Settled Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {receipts.map((rcpt) => (
                  <tr key={rcpt.ledger_tx_id} className="hover:bg-white/[0.035] transition-colors">
                    <td className="px-4 py-3">
                      <AddressChip value={rcpt.ledger_tx_id} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{rcpt.asset_name}</td>
                    <td className="px-4 py-3 font-bold uppercase text-[11px] text-buy-text">
                      {rcpt.side} {rcpt.qty}x
                    </td>
                    <td className="px-4 py-3 font-semibold text-text tabular-nums">
                      {formatCurrency(rcpt.total_cost)}
                    </td>
                    <td className="px-4 py-3 text-text-dim">
                      {rcpt.counterparty_id} {rcpt.counterparty_is_sim && "(SIM)"}
                    </td>
                    <td className="px-4 py-3 text-right text-text-dim text-[11px]">
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
