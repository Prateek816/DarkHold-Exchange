"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Gavel,
  RefreshCw,
  Scale,
  Wallet as WalletIcon,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { VaultBarCompact } from "@/components/ui/GaugeBar";
import { AllocationDonut } from "@/components/portfolio/AllocationDonut";
import { BottomTabs } from "@/components/trading/BottomTabs";
import { LineArtEmptyState } from "@/components/ui/LineArtEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SimBadge } from "@/components/ui/SimBadge";
import { PortfolioValueChart } from "@/components/portfolio/PortfolioValueChart";
import { PillButton } from "@/components/ui/PillButton";
import { IconTile } from "@/components/ui/IconTile";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { setWalletFromServer } = useWalletStore();

  const {
    data: wallet,
    refetch: refetchWallet,
    isFetching: isWalletFetching,
    dataUpdatedAt: walletUpdatedAt,
  } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const data = await api.getWallet();
      setWalletFromServer(data);
      return data;
    },
    refetchInterval: 8_000,
  });

  const {
    data: orders = [],
    refetch: refetchOrders,
    isFetching: isOrdersFetching,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
    refetchInterval: 8_000,
  });

  const {
    data: receipts = [],
    refetch: refetchReceipts,
    isFetching: isReceiptsFetching,
  } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => api.getReceipts(),
    refetchInterval: 8_000,
  });

  const holdings = wallet?.holdings ?? [];
  const inventoryValue = holdings.reduce(
    (sum, holding) => sum + holding.total_units * holding.current_price,
    0
  );
  const totalMarks = (wallet?.total_credits ?? 0) + inventoryValue;
  const openOrders = orders.filter(
    (order) =>
      order.status === "OPEN" ||
      order.status === "PARTIALLY_FILLED" ||
      order.status === "PENDING_SUBMIT"
  );
  const isRefreshing =
    isWalletFetching || isOrdersFetching || isReceiptsFetching;

  const refreshAll = () => {
    void refetchWallet();
    void refetchOrders();
    void refetchReceipts();
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Your account"
        description="Credits, reserved balances, inventory and receipts as returned by the mock ledger. Figures are polled, never computed optimistically."
        icon={WalletIcon}
        badge={<SimBadge label="Simulated account" size="md" />}
        actions={
          <PillButton
            variant="outlined"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            leftIcon={
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            }
          >
            {isRefreshing ? "Syncing" : "Refresh ledger"}
          </PillButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
        <span>
          Client fetch{" "}
          {walletUpdatedAt
            ? new Date(walletUpdatedAt).toLocaleTimeString("en-US", { hour12: false })
            : "—"}{" "}
          · polls every 8s
        </span>
        <span className="text-brand-400">Fictional credits · no cash value</span>
      </div>

      {/* Four stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Available credits",
            value: wallet ? formatCurrency(wallet.available_credits) : "—",
            note: "Unreserved ledger credits",
            icon: WalletIcon,
            variant: "mint" as const,
          },
          {
            label: "Reserved credits",
            value: wallet ? formatCurrency(wallet.reserved_credits) : "—",
            note: "Held against working buys",
            icon: WalletIcon,
            variant: "amber" as const,
          },
          {
            label: "Total ledger credits",
            value: wallet ? formatCurrency(wallet.total_credits) : "—",
            note: "Server wallet balance",
            icon: WalletIcon,
            variant: "brand" as const,
          },
          {
            label: "Inventory at last marks",
            value: wallet ? formatCurrency(inventoryValue) : "—",
            note: "Indicative, not an appraisal",
            icon: Scale,
            variant: "mint" as const,
          },
        ].map((item, index) => (
          <div key={item.label} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <IconTile icon={item.icon} variant={item.variant} size="sm" />
              <dt className="data-label truncate">{item.label}</dt>
            </div>
            <dd className="figure text-[25px] text-text">
              {item.value}
            </dd>
            <dd className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-dim">
              {item.note}
            </dd>
          </div>
        ))}
      </div>

      {/* Vault Bar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand-300" />
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
              Credit reservations
            </h2>
          </div>
        </div>
        <VaultBarCompact
          available={wallet?.available_credits ?? 0}
          reserved={wallet?.reserved_credits ?? 0}
          total={wallet?.total_credits ?? 0}
          formatValue={(v) => formatCurrency(v)}
        />
      </div>

      {/* Bento: Donut + Statement notes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AllocationDonut
          holdings={holdings}
          availableCredits={wallet?.available_credits ?? 0}
          reservedCredits={wallet?.reserved_credits ?? 0}
        />

        <section className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-glass-border pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-300" />
              <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
                Statement notes
              </h2>
            </div>
            <WalletIcon className="h-4 w-4 text-text-dim" />
          </div>

          <dl className="divide-y divide-glass-border/70 space-y-3">
            {[
              {
                label: "Total marks",
                value: wallet ? formatCurrency(totalMarks) : "—",
                note: "Ledger credits plus inventory at the wallet's last marks",
              },
              {
                label: "Working reservations",
                value: String(openOrders.length).padStart(2, "0"),
                note: "Open or partially filled server orders",
              },
              {
                label: "Held instruments",
                value: String(holdings.length).padStart(2, "0"),
                note: "Lines present in the server wallet",
              },
              {
                label: "Settled receipts",
                value: String(receipts.length).padStart(2, "0"),
                note: "Mock ledger entries available on this account",
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <dt className="text-[11px] font-medium text-text">{row.label}</dt>
                  <dd className="pt-0.5 font-mono text-[9px] leading-relaxed text-text-dim">
                    {row.note}
                  </dd>
                </div>
                <dd className="font-mono text-[12px] tabular-nums text-text">{row.value}</dd>
              </div>
            ))}
          </dl>

          <p className="border-t border-glass-border pt-3 text-[9.5px] leading-relaxed text-text-dim">
            There is no performance history in this build. The mock wallet exposes current balances
            only, so no value chart is drawn. Resale ceilings cap individual prices, not portfolio
            outcomes.
          </p>
        </section>
      </div>

      {/* Portfolio value chart */}
      <PortfolioValueChart currentValue={totalMarks} />

      {/* Holdings */}
      <section className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-5 py-4">
          <div>
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
              Inventory register
            </h2>
            <p className="pt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-text-dim">
              Available + reserved units · marks from server wallet
            </p>
          </div>
          <span className="font-mono text-[9px] tabular-nums text-text-muted">
            {formatCurrency(inventoryValue)} at mark
          </span>
        </div>

        {holdings.length === 0 ? (
          <LineArtEmptyState
            variant="no-holdings"
            message="Buy a pass or object on the board to build inventory. Nothing is added locally before the server confirms a fill."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table w-full min-w-[840px] border-collapse text-left">
                <caption className="sr-only">Inventory holdings</caption>
                <thead>
                  <tr className="border-b border-glass-border">
                    {[
                      "Instrument",
                      "Available",
                      "Reserved",
                      "Avg cost",
                      "Last mark",
                      "Value at mark",
                      "",
                    ].map((heading, index) => (
                      <th
                        key={heading || index}
                        scope="col"
                        className={cn(
                          "px-5 py-2.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] text-text-dim",
                          index === 6 && "text-right"
                        )}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      key={holding.asset_id}
                      className="border-b border-glass-border/60 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        <p className="text-[12px] font-medium text-text">{holding.name}</p>
                        <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
                          {holding.symbol} · {holding.asset_id}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-text">
                        {formatQuantity(holding.available_units)}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-warning">
                        {formatQuantity(holding.reserved_units)}
                      </td>
                      <td className="px-5 py-3 font-mono text-[10.5px] tabular-nums text-text-muted">
                        {formatCurrency(holding.avg_cost)}
                      </td>
                      <td className="px-5 py-3 font-mono text-[10.5px] tabular-nums text-text">
                        {formatCurrency(holding.current_price)}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] tabular-nums text-brand-300">
                        {formatCurrency(holding.total_units * holding.current_price)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/trade/${holding.asset_id}`}
                            className="inline-flex items-center gap-1 rounded-pill border border-glass-border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-text-muted transition-colors hover:border-brand-500/40 hover:text-text"
                          >
                            Trade <ArrowRight className="h-2.5 w-2.5" />
                          </Link>
                          <Link
                            href="/auctions"
                            className="inline-flex items-center gap-1 rounded-pill border border-glass-border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-text-muted transition-colors hover:border-warning/40 hover:text-warning"
                          >
                            <Gavel className="h-2.5 w-2.5" /> Sale room
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-glass-border md:hidden p-5">
              {holdings.map((holding) => (
                <div key={holding.asset_id} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium text-text">{holding.name}</p>
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim">
                        {holding.symbol}
                      </p>
                    </div>
                    <p className="font-mono text-[11px] tabular-nums text-brand-300">
                      {formatCurrency(holding.total_units * holding.current_price)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px]">
                    <span className="text-text-dim">
                      Available <span className="text-text">{formatQuantity(holding.available_units)}</span>
                    </span>
                    <span className="text-right text-text-dim">
                      Reserved{" "}
                      <span className="text-warning">{formatQuantity(holding.reserved_units)}</span>
                    </span>
                    <span className="text-text-dim">
                      Avg <span className="text-text-muted">{formatCurrency(holding.avg_cost)}</span>
                    </span>
                    <span className="text-right text-text-dim">
                      Mark <span className="text-text">{formatCurrency(holding.current_price)}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/trade/${holding.asset_id}`}
                      className="inline-flex items-center gap-1 rounded-pill border border-glass-border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-text-muted"
                    >
                      Trade <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                    <Link
                      href="/auctions"
                      className="inline-flex items-center gap-1 rounded-pill border border-glass-border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-text-muted"
                    >
                      <Gavel className="h-2.5 w-2.5" /> Sale room
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <BottomTabs
        orders={orders}
        receipts={receipts}
        onOrderCanceled={async () => {
          await Promise.all([refetchOrders(), refetchWallet(), refetchReceipts()]);
        }}
      />

      <p className="border-t border-glass-border pt-4 font-mono text-[9px] leading-relaxed tracking-[0.04em] text-text-dim">
        Account statement for a simulated venue. Balances, credits, holdings and counterparties are
        fictional and have no cash value. No performance history is inferred from the current
        snapshot.
      </p>
    </div>
  );
}