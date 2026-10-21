"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { VaultBar } from "@/components/shell/VaultBar";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { AllocationDonut } from "@/components/portfolio/AllocationDonut";
import { PortfolioValueChart } from "@/components/portfolio/PortfolioValueChart";
import { Drawer } from "@/components/ui/Drawer";
import { TheSeal } from "@/components/ui/TheSeal";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { SimBadge } from "@/components/ui/SimBadge";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { formatCurrency, formatQuantity, formatFullDateTime } from "@/lib/format";
import { TransactionReceipt } from "@/lib/types";
import {
  Wallet,
  Lock,
  Layers,
  ShieldCheck,
  FileText,
  Gavel,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { availableCredits, reservedCredits, totalCredits, holdings, setWalletFromServer } =
    useWalletStore();

  const [activeTab, setActiveTab] = useState<"HOLDINGS" | "ORDERS" | "HISTORY" | "TRANSACTIONS">(
    "HOLDINGS"
  );
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionReceipt | null>(null);

  const { refetch: refetchWallet, isFetching: isRefreshing } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const data = await api.getWallet();
      setWalletFromServer(data);
      return data;
    },
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => api.getReceipts(),
  });

  const holdingsValue = holdings.reduce(
    (sum, h) => sum + h.total_units * h.current_price,
    0
  );
  const totalValuation = totalCredits + holdingsValue;

  const openOrders = orders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED" || o.status === "PENDING_SUBMIT"
  );
  const historyOrders = orders.filter(
    (o) => o.status === "FILLED" || o.status === "CANCELED" || o.status === "REJECTED"
  );

  return (
    <div className="flex-1 w-full space-y-6 font-mono text-xs">
      {/* Header with Title and Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight font-sans">
            Portfolio & Solvency Vault
          </h1>
          <p className="text-xs sm:text-sm text-text-muted pt-1 font-sans">
            Authoritative ledger balance. Funds remain reserved in the vault until trade settlement.
          </p>
        </div>

        <button
          onClick={() => {
            refetchWallet();
            refetchOrders();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-pill bg-white/[0.04] border border-glass-border text-xs text-text-muted hover:text-text hover:bg-white/[0.08] transition-all disabled:opacity-50 shadow-glass-sm"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-brand-400", isRefreshing && "animate-spin")} />
          <span>Sync Vault</span>
        </button>
      </div>

      {/* 4 StatCards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          iconVariant="teal"
          label="Total Valuation"
          value={formatCurrency(totalValuation)}
          glowEdge="teal"
          subValue="Includes cash & verified inventory"
        />

        <StatCard
          icon={TrendingUp}
          iconVariant="teal"
          label="Available Credits"
          value={formatCurrency(availableCredits)}
          subValue="Freely tradable credits"
        />

        <StatCard
          icon={Lock}
          iconVariant="amber"
          label="Reserved Credits"
          value={formatCurrency(reservedCredits)}
          subValue="Locked in active resting orders"
        />

        <StatCard
          icon={Layers}
          iconVariant="violet"
          label="Holdings Count"
          value={`${holdings.length} Relics`}
          glowEdge="violet"
          subValue="100% Solvency Backed"
        />
      </div>

      {/* Large Vault Bar */}
      <VaultBar
        available={availableCredits}
        reserved={reservedCredits}
        total={totalCredits}
        variant="large"
        label="Simulated Credit Reserve Pipeline"
      />

      {/* Charts Row: Allocation Donut & Portfolio Value Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AllocationDonut holdings={holdings} availableCredits={availableCredits} />
        <PortfolioValueChart currentValue={totalValuation} />
      </div>

      {/* DataTable Tabs: Holdings, Open Orders, Order History, Transactions */}
      <GlassCard className="flex flex-col p-0 overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-glass-border bg-white/[0.02] px-4 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("HOLDINGS")}
              className={cn(
                "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all",
                activeTab === "HOLDINGS"
                  ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Vault Holdings ({holdings.length})
            </button>
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={cn(
                "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all",
                activeTab === "ORDERS"
                  ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Open Orders ({openOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={cn(
                "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all",
                activeTab === "HISTORY"
                  ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Order History ({historyOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("TRANSACTIONS")}
              className={cn(
                "px-3.5 py-2 rounded-pill font-semibold text-xs transition-all",
                activeTab === "TRANSACTIONS"
                  ? "bg-white/[0.08] text-text border border-brand-500/40 shadow-glow-teal"
                  : "text-text-muted hover:text-text"
              )}
            >
              Settled Transactions ({receipts.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Holdings */}
        {activeTab === "HOLDINGS" && (
          <div className="overflow-x-auto min-h-[180px]">
            {holdings.length === 0 ? (
              <LineArtEmptyState
                type="NO_HOLDINGS"
                title="No Holdings in Vault"
                description="Purchase passes or relics from the order book to build inventory."
                className="py-10"
              />
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Available Units</th>
                    <th className="px-4 py-2.5">Reserved Units</th>
                    <th className="px-4 py-2.5">Avg Cost</th>
                    <th className="px-4 py-2.5">Current Price</th>
                    <th className="px-4 py-2.5">Total Value</th>
                    <th className="px-4 py-2.5 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {holdings.map((h) => (
                    <tr key={h.asset_id} className="hover:bg-white/[0.035] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-text font-sans">{h.name}</p>
                          <span className="text-[11px] text-text-dim uppercase font-mono">{h.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text font-bold tabular-nums">
                        {formatQuantity(h.available_units)}
                      </td>
                      <td className="px-4 py-3 text-warning font-semibold tabular-nums">
                        {formatQuantity(h.reserved_units)}
                      </td>
                      <td className="px-4 py-3 text-text-muted tabular-nums">
                        {formatCurrency(h.avg_cost)}
                      </td>
                      <td className="px-4 py-3 text-text font-medium tabular-nums">
                        {formatCurrency(h.current_price)}
                      </td>
                      <td className="px-4 py-3 text-brand-400 font-bold tabular-nums">
                        {formatCurrency(h.total_units * h.current_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/trade/${h.asset_id}`}
                            className="px-3 py-1 rounded-pill bg-white/[0.04] border border-glass-border text-text hover:border-brand-500/40 text-xs transition-colors"
                          >
                            Trade
                          </Link>
                          <Link
                            href="/auctions"
                            className="px-3 py-1 rounded-pill bg-white/[0.04] border border-glass-border text-text hover:border-warning text-xs transition-colors flex items-center gap-1"
                          >
                            <Gavel className="w-3 h-3 text-warning" />
                            <span>Auction</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Open Orders */}
        {activeTab === "ORDERS" && (
          <div className="overflow-x-auto min-h-[180px]">
            {openOrders.length === 0 ? (
              <LineArtEmptyState
                type="NO_ORDERS"
                title="No Resting Orders"
                description="You currently have zero active order reservations in the vault."
                className="py-10"
              />
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                    <th className="px-4 py-2.5">Seal Status</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Price</th>
                    <th className="px-4 py-2.5">Matched Progress</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {openOrders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-white/[0.035] transition-colors">
                      <td className="px-4 py-3">
                        <TheSeal
                          orderStatus={o.status}
                          settlementStatus={o.settlement_status}
                          showLabel={true}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold uppercase text-[11px]">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-pill border",
                            o.side === "BUY" ? "bg-buy-bg text-buy-text border-buy/30" : "bg-sell-bg text-sell border-sell/30"
                          )}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text font-semibold">{o.asset_id}</td>
                      <td className="px-4 py-3 font-semibold text-text tabular-nums">
                        {o.price > 0 ? formatCurrency(o.price) : "Market"}
                      </td>
                      <td className="px-4 py-3 text-text-muted tabular-nums">
                        {o.matched_qty} / {o.qty} units
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/trade/${o.asset_id}`}
                          className="text-xs text-brand-400 hover:underline"
                        >
                          Manage in Terminal &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Order History */}
        {activeTab === "HISTORY" && (
          <div className="overflow-x-auto min-h-[180px]">
            {historyOrders.length === 0 ? (
              <div className="p-10 text-center text-text-dim">No historic orders found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                    <th className="px-4 py-2.5">Seal</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Price / Avg</th>
                    <th className="px-4 py-2.5">Status & Reason</th>
                    <th className="px-4 py-2.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {historyOrders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-white/[0.035] transition-colors">
                      <td className="px-4 py-3">
                        <TheSeal
                          orderStatus={o.status}
                          settlementStatus={o.settlement_status}
                          showLabel={true}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold uppercase text-[11px]">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-pill border",
                            o.side === "BUY" ? "bg-buy-bg text-buy-text border-buy/30" : "bg-sell-bg text-sell border-sell/30"
                          )}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text font-semibold">{o.asset_id}</td>
                      <td className="px-4 py-3 text-text font-semibold tabular-nums">
                        {o.average_price ? formatCurrency(o.average_price) : formatCurrency(o.price)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={o.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right text-text-dim text-[11px]">
                        {formatFullDateTime(o.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Transactions with Right-Side Glass Drawer Trigger */}
        {activeTab === "TRANSACTIONS" && (
          <div className="overflow-x-auto min-h-[180px]">
            {receipts.length === 0 ? (
              <div className="p-10 text-center text-text-dim">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] uppercase tracking-wider text-text-dim bg-white/[0.015]">
                    <th className="px-4 py-2.5">Ledger TX ID</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Settled Value</th>
                    <th className="px-4 py-2.5">Counterparty</th>
                    <th className="px-4 py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {receipts.map((r) => (
                    <tr key={r.ledger_tx_id} className="hover:bg-white/[0.035] transition-colors">
                      <td className="px-4 py-3">
                        <AddressChip value={r.ledger_tx_id} />
                      </td>
                      <td className="px-4 py-3 text-text font-semibold">{r.asset_name}</td>
                      <td className="px-4 py-3 font-bold uppercase text-[11px] text-buy-text">
                        {r.side} ({r.qty}x)
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-400 tabular-nums">
                        {formatCurrency(r.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-text-dim">
                        {r.counterparty_id} {r.counterparty_is_sim && <SimBadge label="SIM" size="sm" className="ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-3 py-1 rounded-pill bg-white/[0.04] border border-glass-border text-text hover:border-brand-500/40 text-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-400" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </GlassCard>

      {/* Right-Side Glass Drawer for Receipt Details */}
      <Drawer
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Ledger Settlement Receipt"
        subtitle="Cryptographically committed to the reserve-match-settle chain."
      >
        {selectedReceipt && (
          <div className="space-y-5 font-mono text-xs">
            {/* Ledger TX ID */}
            <div className="p-3.5 rounded-panel border border-glass-border bg-white/[0.03] space-y-1">
              <span className="text-[10px] text-text-dim uppercase block">Ledger TX ID</span>
              <AddressChip value={selectedReceipt.ledger_tx_id} />
            </div>

            {/* Trade Details */}
            <div className="p-4 rounded-panel border border-glass-border bg-white/[0.02] space-y-3">
              <div className="flex justify-between border-b border-glass-border pb-2">
                <span className="text-text-muted">Asset</span>
                <span className="text-text font-semibold">{selectedReceipt.asset_name}</span>
              </div>
              <div className="flex justify-between border-b border-glass-border pb-2">
                <span className="text-text-muted">Execution Side</span>
                <span className="text-buy-text font-bold uppercase">
                  {selectedReceipt.side} ({selectedReceipt.qty} units)
                </span>
              </div>
              <div className="flex justify-between border-b border-glass-border pb-2">
                <span className="text-text-muted">Fill Price</span>
                <span className="text-text font-semibold tabular-nums">
                  {formatCurrency(selectedReceipt.price)}
                </span>
              </div>
              <div className="flex justify-between border-b border-glass-border pb-2">
                <span className="text-text-muted">Total Settled</span>
                <span className="text-brand-400 font-bold tabular-nums">
                  {formatCurrency(selectedReceipt.total_cost)}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-glass-border pb-2">
                <span className="text-text-muted">Counterparty</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-text">{selectedReceipt.counterparty_id}</span>
                  {selectedReceipt.counterparty_is_sim && <SimBadge label="SIM" size="sm" />}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Settlement Latency</span>
                <span className="text-buy-text font-medium">
                  {selectedReceipt.settled_at - selectedReceipt.matched_at} ms
                </span>
              </div>
            </div>

            {/* Vault Balance Mutation Truth */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-text-dim block">
                Vault Balance Mutation Truth
              </span>
              <div className="p-3.5 rounded-panel border border-glass-border bg-white/[0.03] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-text-dim block">Before</span>
                  <span className="text-text font-medium tabular-nums">
                    {formatCurrency(selectedReceipt.balance_before)}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-dim" />
                <div className="text-right">
                  <span className="text-[10px] text-text-dim block">After</span>
                  <span className="text-brand-400 font-bold text-sm tabular-nums">
                    {formatCurrency(selectedReceipt.balance_after)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1 text-[11px] text-text-dim pt-2 border-t border-glass-border">
              <p>Matched: {formatFullDateTime(selectedReceipt.matched_at)}</p>
              <p>Settled: {formatFullDateTime(selectedReceipt.settled_at)}</p>
            </div>

            <StatusPill status="SETTLED" label="Settlement Completed (0ms Drift)" />
          </div>
        )}
      </Drawer>
    </div>
  );
}
