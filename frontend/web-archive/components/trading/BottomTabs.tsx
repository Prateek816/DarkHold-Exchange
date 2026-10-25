"use client";

import React, { useState } from "react";
import type { Order, TransactionReceipt } from "@/lib/types";
import {
  formatCurrency,
  formatFullDateTime,
  formatQuantity,
  formatTimestamp,
} from "@/lib/format";
import { TheSeal } from "@/components/ui/TheSeal";
import { StatusPill, OrderStatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { SimBadge } from "@/components/ui/SimBadge";
import { api } from "@/lib/api-client";
import { useUiStore } from "@/lib/stores/uiStore";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { formatErrorMessage, type ApiErrorPayload } from "@/lib/errors";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabsProps {
  orders: Order[];
  receipts: TransactionReceipt[];
  onOrderCanceled?: () => void | Promise<void>;
  className?: string;
}

function SideTag({ side }: { side: Order["side"] }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em]",
        side === "BUY"
          ? "border-buy/35 bg-buy-bg text-buy-text"
          : "border-sell/35 bg-sell-bg text-sell-text"
      )}
    >
      {side}
    </span>
  );
}

function FillProgress({ order }: { order: Order }) {
  const fillPct = Math.min(100, Math.round((order.matched_qty / (order.qty || 1)) * 100));
  return (
    <div className="min-w-[112px]">
      <div className="flex justify-between font-mono text-[8.5px] tabular-nums text-text-dim">
        <span>
          {formatQuantity(order.matched_qty)} / {formatQuantity(order.qty)}
        </span>
        <span>{fillPct}%</span>
      </div>
      <div className="mt-1 h-1 w-full bg-white/[0.07]">
        <div className="h-full bg-brand-500" style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
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
    (order) =>
      order.status === "OPEN" ||
      order.status === "PARTIALLY_FILLED" ||
      order.status === "PENDING_SUBMIT"
  );
  const historyOrders = orders.filter(
    (order) =>
      order.status === "FILLED" ||
      order.status === "CANCELED" ||
      order.status === "REJECTED"
  );

  const handleCancel = async (order: Order) => {
    if (cancelingOrderIds.has(order.order_id)) return;
    setCancelingOrderIds((previous) => new Set(previous).add(order.order_id));

    const unfilled = order.remaining_qty;
    const filled = order.matched_qty;

    try {
      const response = await api.cancelOrder(order.order_id);
      const canceled = response.data;
      const message =
        filled > 0
          ? `${formatQuantity(unfilled)} unfilled unit${
              unfilled === 1 ? "" : "s"
            } released by the server. ${formatQuantity(
              filled
            )} matched unit${filled === 1 ? "" : "s"} remain on the settlement tape.`
          : "The server released the order's full reservation. No trade was created.";

      addToast({
        type: "success",
        title:
          canceled.status === "CANCELED"
            ? filled > 0
              ? "Order canceled · partial fill kept"
              : "Order canceled"
            : "Order state updated",
        message,
      });
    } catch (error) {
      const apiError = error as Partial<ApiErrorPayload>;
      const formatted = apiError.code
        ? formatErrorMessage(apiError.code, apiError.context)
        : "The cancellation did not complete. The server order state is unchanged.";

      addToast({
        type: apiError.code === "ORDER_NOT_CANCELABLE" ? "warning" : "error",
        title:
          apiError.code === "ORDER_NOT_CANCELABLE"
            ? "Order no longer cancelable"
            : "Cancel failed",
        message: formatted,
        requestId: apiError.requestId,
      });
    } finally {
      // Refresh even after a failed cancel: the server may already have
      // filled the order, and the table must show that truth.
      await onOrderCanceled?.();
      setCancelingOrderIds((previous) => {
        const next = new Set(previous);
        next.delete(order.order_id);
        return next;
      });
    }
  };

  return (
    <section
      className={cn("border border-glass-border bg-surface", className)}
      aria-label="Order and settlement ledger"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border px-3 py-2.5">
        <SegmentedTabs
          tabs={[
            { id: "OPEN", label: "Working", badge: openOrders.length },
            { id: "HISTORY", label: "History", badge: historyOrders.length },
            { id: "ACTIVITY", label: "Receipts", badge: receipts.length },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
          size="sm"
          className="max-w-full"
        />
        <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-dim sm:block">
          Mock ledger · server snapshots
        </span>
      </div>

      {activeTab === "OPEN" && (
        <>
          {openOrders.length === 0 ? (
            <LineArtEmptyState
              variant="no-holdings"
              message="Accepted orders that have not fully filled or been canceled will appear here."
              className="py-10"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="data-table w-full min-w-[760px] border-collapse text-left">
                  <caption className="sr-only">Working orders</caption>
                  <thead>
                    <tr className="border-b border-glass-border">
                      {["Lifecycle", "Side", "Type", "Price", "Fill", "Placed", ""].map(
                        (heading, index) => (
                          <th
                            key={heading || index}
                            scope="col"
                            className={cn(
                              "px-4 py-2.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-text-dim",
                              index === 6 && "text-right"
                            )}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.map((order) => {
                      const isCanceling = cancelingOrderIds.has(order.order_id);
                      return (
                        <tr
                          key={order.order_id}
                          className="border-b border-glass-border/60 last:border-0 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3">
                            <TheSeal
                              orderStatus={order.status}
                              settlementStatus={order.settlement_status}
                              showLabel
                              compact
                            />
                          </td>
                          <td className="px-4 py-3">
                            <SideTag side={order.side} />
                          </td>
                          <td className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.06em] text-text-muted">
                            {order.type}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-text">
                            {order.price > 0 ? formatCurrency(order.price) : "Market"}
                          </td>
                          <td className="px-4 py-3">
                            <FillProgress order={order} />
                          </td>
                          <td className="px-4 py-3 font-mono text-[9.5px] tabular-nums text-text-dim">
                            {formatTimestamp(order.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleCancel(order)}
                              disabled={isCanceling}
                              className="inline-flex items-center gap-1 border border-sell/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-sell-text transition-colors hover:bg-sell-bg disabled:opacity-50"
                            >
                              {isCanceling && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                              {isCanceling ? "Canceling" : "Cancel"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-glass-border md:hidden">
                {openOrders.map((order) => {
                  const isCanceling = cancelingOrderIds.has(order.order_id);
                  return (
                    <div key={order.order_id} className="space-y-3 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <SideTag side={order.side} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-text-muted">
                            {order.type} · {order.price > 0 ? formatCurrency(order.price) : "Market"}
                          </span>
                        </div>
                        <TheSeal
                          orderStatus={order.status}
                          settlementStatus={order.settlement_status}
                          showLabel
                          compact
                        />
                      </div>
                      <div className="flex items-end justify-between gap-4">
                        <FillProgress order={order} />
                        <span className="font-mono text-[9px] tabular-nums text-text-dim">
                          {formatTimestamp(order.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleCancel(order)}
                          disabled={isCanceling}
                          className="inline-flex items-center gap-1 border border-sell/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-sell-text transition-colors hover:bg-sell-bg disabled:opacity-50"
                        >
                          {isCanceling && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {isCanceling ? "Canceling" : "Cancel order"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "HISTORY" && (
        <>
          {historyOrders.length === 0 ? (
            <LineArtEmptyState
              variant="no-holdings"
              message="Filled, canceled and rejected orders are kept on this tape."
              className="py-10"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="data-table w-full min-w-[720px] border-collapse text-left">
                  <caption className="sr-only">Order history</caption>
                  <thead>
                    <tr className="border-b border-glass-border">
                      {["Lifecycle", "Side", "Price / avg", "Qty", "Status and reason", "Updated"].map(
                        (heading, index) => (
                          <th
                            key={heading}
                            scope="col"
                            className={cn(
                              "px-4 py-2.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-text-dim",
                              index === 5 && "text-right"
                            )}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {historyOrders.map((order) => (
                      <tr
                        key={order.order_id}
                        className="border-b border-glass-border/60 last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <TheSeal
                            orderStatus={order.status}
                            settlementStatus={order.settlement_status}
                            showLabel
                            compact
                          />
                        </td>
                        <td className="px-4 py-3">
                          <SideTag side={order.side} />
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-text">
                          {order.average_price
                            ? formatCurrency(order.average_price)
                            : order.price > 0
                              ? formatCurrency(order.price)
                              : "Market"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[9.5px] tabular-nums text-text-muted">
                          {formatQuantity(order.matched_qty)} of {formatQuantity(order.qty)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <OrderStatusPill orderStatus={order.status} settlementStatus={order.settlement_status} compact />
                            {order.reject_reason && (
                              <p
                                className="max-w-xs text-[9.5px] leading-relaxed text-sell-text"
                                title={order.reject_reason}
                              >
                                {order.reject_reason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[9.5px] tabular-nums text-text-dim">
                          {formatFullDateTime(order.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-glass-border md:hidden">
                {historyOrders.map((order) => (
                  <div key={order.order_id} className="space-y-2 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <SideTag side={order.side} />
                        <span className="font-mono text-[10px] tabular-nums text-text">
                          {order.average_price
                            ? formatCurrency(order.average_price)
                            : order.price > 0
                              ? formatCurrency(order.price)
                              : "Market"}
                        </span>
                      </div>
                      <TheSeal
                        orderStatus={order.status}
                        settlementStatus={order.settlement_status}
showLabel
                            compact
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[9px] tabular-nums text-text-dim">
                        {formatQuantity(order.matched_qty)} of {formatQuantity(order.qty)} units
                      </span>
                      <OrderStatusPill orderStatus={order.status} settlementStatus={order.settlement_status} compact />
                    </div>
                    {order.reject_reason && (
                      <p className="text-[9.5px] leading-relaxed text-sell-text">
                        {order.reject_reason}
                      </p>
                    )}
                    <p className="text-right font-mono text-[8.5px] text-text-dim">
                      {formatFullDateTime(order.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "ACTIVITY" && (
        <>
          {receipts.length === 0 ? (
            <LineArtEmptyState
              variant="no-trades"
              message="A receipt appears only after the mock ledger completes settlement for a match."
              className="py-10"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="data-table w-full min-w-[860px] border-collapse text-left">
                  <caption className="sr-only">
                    Settlement receipts. Balances are shown as of the receipt time.
                  </caption>
                  <thead>
                    <tr className="border-b border-glass-border">
                      {[
                        "Ledger tx",
                        "Instrument",
                        "Side / qty",
                        "Cost",
                        "Balance after",
                        "Counterparty",
                        "Settled",
                      ].map((heading, index) => (
                        <th
                          key={heading}
                          scope="col"
                          className={cn(
                            "px-4 py-2.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-text-dim",
                            index === 6 && "text-right"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr
                        key={receipt.ledger_tx_id}
                        className="border-b border-glass-border/60 last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <AddressChip value={receipt.ledger_tx_id} truncate />
                        </td>
                        <td className="max-w-[180px] px-4 py-3 text-[10.5px] text-text-muted">
                          <span className="line-clamp-2">{receipt.asset_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-mono text-[9px] uppercase tracking-[0.06em]",
                              receipt.side === "BUY" ? "text-buy-text" : "text-sell-text"
                            )}
                          >
                            {receipt.side} {formatQuantity(receipt.qty)}×
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10.5px] tabular-nums text-text">
                          {formatCurrency(receipt.total_cost)}
                          <span className="block font-mono text-[8.5px] text-text-dim">
                            @ {formatCurrency(receipt.price)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] tabular-nums text-text-muted">
                          {formatCurrency(receipt.balance_after)}
                          <span className="block font-mono text-[8px] uppercase tracking-[0.06em] text-text-dim">
                            at receipt
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[9px] text-text-dim">
                          <span className="flex flex-wrap items-center gap-1.5">
                            {receipt.counterparty_id}
                            {receipt.counterparty_is_sim && <SimBadge label="SIM" />}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[9px] tabular-nums text-text-dim">
                          {formatFullDateTime(receipt.settled_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-glass-border md:hidden">
                {receipts.map((receipt) => (
                  <div key={receipt.ledger_tx_id} className="space-y-2 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <AddressChip value={receipt.ledger_tx_id} truncate />
                      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-text">
                        {formatCurrency(receipt.total_cost)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">{receipt.asset_name}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] text-text-dim">
                      <span
                        className={cn(
                          "uppercase tracking-[0.06em]",
                          receipt.side === "BUY" ? "text-buy-text" : "text-sell-text"
                        )}
                      >
                        {receipt.side} {formatQuantity(receipt.qty)}× @ {formatCurrency(receipt.price)}
                      </span>
                      <span>Balance at receipt {formatCurrency(receipt.balance_after)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[8.5px] text-text-dim">
                      <span className="flex items-center gap-1.5">
                        {receipt.counterparty_id}
                        {receipt.counterparty_is_sim && <SimBadge label="SIM" />}
                      </span>
                      <span>{formatFullDateTime(receipt.settled_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className="border-t border-glass-border px-3 py-2 font-mono text-[8.5px] leading-relaxed text-text-dim">
        Receipt balances are ledger balances at receipt time, not the current available balance.
        All counterparties and settlements are fictional.
      </p>
    </section>
  );
}
