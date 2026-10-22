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
import { SettlementReceiptModal } from "@/components/portfolio/SettlementReceiptModal";
import { TheSeal } from "@/components/ui/TheSeal";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddressChip } from "@/components/ui/AddressChip";
import { SimBadge } from "@/components/ui/SimBadge";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Reveal } from "@/components/ui/Reveal";
import { formatCurrency, formatQuantity, formatFullDateTime } from "@/lib/format";
import { TransactionReceipt } from "@/lib/types";
import {
  Wallet,
  Lock,
  Layers,
  Gavel,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileText,
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

  const holdingsValue = holdings.reduce((sum, h) => sum + h.total_units * h.current_price, 0);
  const totalValuation = totalCredits + holdingsValue;

  const openOrders = orders.filter(
    (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED" || o.status === "PENDING_SUBMIT"
  );
  const historyOrders = orders.filter(
    (o) => o.status === "FILLED" || o.status === "CANCELED" || o.status === "REJECTED"
  );

  const sideBadge = (side: "BUY" | "SELL") => (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
        side === "BUY"
          ? "border-buy/30 bg-buy-bg text-buy-text"
          : "border-sell/30 bg-sell-bg text-sell-text"
      )}
    >
      {side}
    </span>
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Solvency · Vault"
        title="Portfolio & Solvency Vault"
        description="Authoritative ledger balance. Funds remain reserved in the vault until trade settlement."
        actions={
          <button
            onClick={() => {
              refetchWallet();
              refetchOrders();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-full border border-glass-border bg-white/[0.04] px-4 py-2 font-mono text-[11px] text-text-muted shadow-glass-sm transition-all hover:bg-white/[0.08] hover:text-text disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 text-brand-400", isRefreshing && "animate-spin")}
            />
            <span>Sync vault</span>
          </button>
        }
      />

      {/* Valuation cards */}
      <Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            iconVariant="teal"
            label="Total valuation"
            value={formatCurrency(totalValuation)}
            glowEdge="teal"
            subValue="Includes cash & verified inventory"
          />
          <StatCard
            icon={TrendingUp}
            iconVariant="teal"
            label="Available credits"
            value={formatCurrency(availableCredits)}
            subValue="Freely tradable credits"
          />
          <StatCard
            icon={Lock}
            iconVariant="amber"
            label="Reserved credits"
            value={formatCurrency(reservedCredits)}
            subValue="Locked in active resting orders"
          />
          <StatCard
            icon={Layers}
            iconVariant="violet"
            label="Holdings count"
            value={`${holdings.length} ${holdings.length === 1 ? "relic" : "relics"}`}
            glowEdge="violet"
            subValue="100% solvency backed"
          />
        </div>
      </Reveal>

      {/* Credit reserve pipeline */}
      <Reveal>
        <VaultBar
          available={availableCredits}
          reserved={reservedCredits}
          total={totalCredits}
          variant="large"
          label="Simulated credit reserve pipeline"
        />
      </Reveal>

      {/* Charts */}
      <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AllocationDonut
          holdings={holdings}
          availableCredits={availableCredits}
          reservedCredits={reservedCredits}
        />
        <PortfolioValueChart currentValue={totalValuation} />
      </Reveal>

      {/* Ledger tables */}
      <GlassCard className="flex flex-col overflow-hidden p-0">
        <div className="no-scrollbar flex items-center overflow-x-auto border-b border-glass-border bg-white/[0.015] px-3 py-2.5">
          <SegmentedTabs
            tabs={[
              { id: "HOLDINGS", label: "Vault holdings", badge: holdings.length },
              { id: "ORDERS", label: "Open orders", badge: openOrders.length },
              { id: "HISTORY", label: "Order history", badge: historyOrders.length },
              { id: "TRANSACTIONS", label: "Settled transactions", badge: receipts.length },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as typeof activeTab)}
            size="sm"
            layoutId="portfolio-tab-pill"
            className="min-w-max"
          />
        </div>

        {/* Holdings */}
        {activeTab === "HOLDINGS" && (
          <div className="no-scrollbar min-h-[180px] overflow-x-auto">
            {holdings.length === 0 ? (
              <LineArtEmptyState
                type="NO_HOLDINGS"
                title="No holdings in vault"
                description="Purchase passes or relics from the order book to build inventory."
                className="py-10"
              />
            ) : (
              <table className="data-table w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-glass-border bg-white/[0.015]">
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Available</th>
                    <th className="px-4 py-2.5">Reserved</th>
                    <th className="px-4 py-2.5">Avg cost</th>
                    <th className="px-4 py-2.5">Current price</th>
                    <th className="px-4 py-2.5">Total value</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {holdings.map((h) => (
                    <tr key={h.asset_id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-text">{h.name}</p>
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-dim">
                            {h.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                        {formatQuantity(h.available_units)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-warning">
                        {formatQuantity(h.reserved_units)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] tabular-nums text-text-muted">
                        {formatCurrency(h.avg_cost)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] tabular-nums text-text">
                        {formatCurrency(h.current_price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-brand-400">
                        {formatCurrency(h.total_units * h.current_price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/trade/${h.asset_id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] text-text-muted transition-colors hover:border-brand-500/40 hover:bg-white/[0.06] hover:text-text"
                          >
                            Trade
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Link>
                          <Link
                            href="/auctions"
                            className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] text-text-muted transition-colors hover:border-warning/40 hover:bg-warning/[0.06] hover:text-warning"
                          >
                            <Gavel className="h-2.5 w-2.5" />
                            Auction
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

        {/* Open orders */}
        {activeTab === "ORDERS" && (
          <div className="no-scrollbar min-h-[180px] overflow-x-auto">
            {openOrders.length === 0 ? (
              <LineArtEmptyState
                type="NO_ORDERS"
                title="No resting orders"
                description="You currently have zero active order reservations in the vault."
                className="py-10"
              />
            ) : (
              <table className="data-table w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-glass-border bg-white/[0.015]">
                    <th className="px-4 py-2.5">Lifecycle seal</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Price</th>
                    <th className="px-4 py-2.5">Fill progress</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {openOrders.map((o) => {
                    const fillPct = Math.min(
                      100,
                      Math.round((o.matched_qty / (o.qty || 1)) * 100)
                    );

                    return (
                      <tr key={o.order_id} className="transition-colors hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <TheSeal
                            orderStatus={o.status}
                            settlementStatus={o.settlement_status}
                            showLabel={true}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">{sideBadge(o.side)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] font-medium text-text">
                          {o.asset_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                          {o.price > 0 ? formatCurrency(o.price) : "Market"}
                        </td>
                        <td className="min-w-[150px] px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[9.5px] text-text-dim">
                              <span>
                                {formatQuantity(o.matched_qty)} / {formatQuantity(o.qty)}
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
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/trade/${o.asset_id}`}
                            className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-brand-400 transition-colors hover:text-brand-300"
                          >
                            Manage
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Order history */}
        {activeTab === "HISTORY" && (
          <div className="no-scrollbar min-h-[180px] overflow-x-auto">
            {historyOrders.length === 0 ? (
              <LineArtEmptyState
                type="NO_ORDERS"
                title="No order history"
                description="Completed, canceled, and rejected orders will appear here."
                className="py-10"
              />
            ) : (
              <table className="data-table w-full min-w-[920px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-glass-border bg-white/[0.015]">
                    <th className="px-4 py-2.5">Seal</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Price / avg</th>
                    <th className="px-4 py-2.5">Qty</th>
                    <th className="px-4 py-2.5">Status & reason</th>
                    <th className="px-4 py-2.5 text-right">Completed at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {historyOrders.map((o) => (
                    <tr key={o.order_id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <TheSeal
                          orderStatus={o.status}
                          settlementStatus={o.settlement_status}
                          showLabel={true}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">{sideBadge(o.side)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] font-medium text-text">
                        {o.asset_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                        {o.average_price
                          ? formatCurrency(o.average_price)
                          : formatCurrency(o.price)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-text-muted">
                        {formatQuantity(o.matched_qty)} of {formatQuantity(o.qty)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <StatusPill status={o.status} size="sm" />
                          {o.reject_reason && (
                            <p
                              className="max-w-xs truncate text-[10px] text-sell-text"
                              title={o.reject_reason}
                            >
                              {o.reject_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[10.5px] text-text-dim">
                        {formatFullDateTime(o.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Settled transactions */}
        {activeTab === "TRANSACTIONS" && (
          <div className="no-scrollbar min-h-[180px] overflow-x-auto">
            {receipts.length === 0 ? (
              <LineArtEmptyState
                type="NO_TRADES"
                title="No settled transactions"
                description="Every completed match posts a signed receipt to the ledger."
                className="py-10"
              />
            ) : (
              <table className="data-table w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-glass-border bg-white/[0.015]">
                    <th className="px-4 py-2.5">Ledger tx</th>
                    <th className="px-4 py-2.5">Asset</th>
                    <th className="px-4 py-2.5">Side</th>
                    <th className="px-4 py-2.5">Settled cost</th>
                    <th className="px-4 py-2.5">Counterparty</th>
                    <th className="px-4 py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {receipts.map((r) => (
                    <tr key={r.ledger_tx_id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <AddressChip value={r.ledger_tx_id} />
                      </td>
                      <td className="px-4 py-3 text-[11.5px] font-medium text-text">
                        {r.asset_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
                            r.side === "BUY" ? "text-buy-text" : "text-sell-text"
                          )}
                        >
                          {r.side} · {formatQuantity(r.qty)}x
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-text">
                        {formatCurrency(r.total_cost)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-text-muted">
                          {r.counterparty_id}
                          {r.counterparty_is_sim && <SimBadge label="SIM" size="sm" />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          aria-label={`View receipt for transaction ${r.ledger_tx_id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.035] px-2.5 py-1 font-mono text-[10px] text-text-muted transition-colors hover:border-brand-500/40 hover:bg-white/[0.06] hover:text-text"
                        >
                          <FileText className="h-3 w-3 text-brand-400" />
                          View receipt
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

      <SettlementReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}
