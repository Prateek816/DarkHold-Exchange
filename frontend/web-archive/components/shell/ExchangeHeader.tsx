"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  Gavel,
  LayoutGrid,
  Menu,
  Radio,
  ShieldCheck,
  Terminal,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "/market", label: "The board", icon: LayoutGrid, match: (path: string) => path === "/market" },
  {
    href: "/trade/DARKHOLD-PASS-2026",
    label: "Terminal",
    icon: Terminal,
    match: (path: string) => path.startsWith("/trade"),
  },
  { href: "/auctions", label: "Sale room", icon: Gavel, match: (path: string) => path.startsWith("/auctions") },
  { href: "/portfolio", label: "Your ledger", icon: BookOpen, match: (path: string) => path.startsWith("/portfolio") },
  { href: "/demo", label: "Control room", icon: ShieldCheck, match: (path: string) => path.startsWith("/demo") },
];

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export function ExchangeHeader() {
  const pathname = usePathname() || "/market";
  const [open, setOpen] = useState(false);
  const { availableCredits, reservedCredits, setWalletFromServer } = useWalletStore();
  const { connectionState } = useUiStore();
  const prevPathnameRef = useRef(pathname);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const data = await api.getWallet();
      setWalletFromServer(data);
      return data;
    },
    staleTime: 3000,
  });

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const streamLabel =
    connectionState === "LIVE"
      ? USE_MOCK
        ? "Mock stream"
        : "Stream online"
      : connectionState === "DISCONNECTED"
      ? "Feed offline"
      : connectionState.charAt(0) + connectionState.slice(1).toLowerCase();

  return (
    <header className="sticky top-0 z-50 border-b border-glass-border bg-canvas/95">
      <div className="border-b border-glass-border/80 bg-oxblood/25">
        <div className="mx-auto flex h-8 max-w-[1480px] items-center justify-between gap-4 px-4 font-mono text-[9px] uppercase tracking-[0.13em] text-text-dim sm:px-6">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            <span className="truncate">
              Simulated venue <span className="hidden text-text-dim/60 sm:inline">/</span>{" "}
              <span className="hidden text-text-muted sm:inline">All balances, orders and bots are fictional</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="hidden md:inline">{USE_MOCK ? "Mock adapter" : "REST adapter"}</span>
            <span className="hidden h-3 w-px bg-glass-border md:inline-block" />
            <span
              className={cn(
                "flex items-center gap-1.5",
                connectionState === "LIVE" ? "text-buy-text" : "text-warning"
              )}
            >
              <Radio className="h-2.5 w-2.5" />
              {streamLabel}
            </span>
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-[64px] max-w-[1480px] items-center justify-between gap-5 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Wordmark compact />
          <nav aria-label="Exchange navigation" className="hidden items-center gap-6 xl:flex">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-active={active}
                  className={cn(
                    "nav-underline flex h-[64px] items-center pt-0.5 text-[11.5px] font-medium transition-colors",
                    active ? "text-text" : "text-text-muted hover:text-text"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/portfolio"
            className="hidden items-center gap-3 border border-glass-border bg-white/[0.018] px-3 py-1.5 transition-colors hover:border-glass-border-strong sm:flex"
            title="Available and reserved simulated credits"
          >
            <Wallet className="h-3.5 w-3.5 text-brand-400" />
            <span className="flex flex-col leading-tight">
              <span className="font-mono text-[10.5px] font-medium tabular-nums text-text">
                {wallet ? formatCurrency(availableCredits) : "—"}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
                Available
              </span>
            </span>
            {reservedCredits > 0 && (
              <>
                <span className="h-6 w-px bg-glass-border" />
                <span className="flex flex-col leading-tight">
                  <span className="font-mono text-[10.5px] font-medium tabular-nums text-warning">
                    {formatCurrency(reservedCredits)}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
                    Reserved
                  </span>
                </span>
              </>
            )}
          </Link>

          <Link
            href="/login"
            className="hidden h-9 items-center gap-2 border border-glass-border px-3 text-[11px] font-medium text-text-muted transition-colors hover:border-brand-500/50 hover:text-text lg:flex"
            title="Demo account"
          >
            <UserRound className="h-3.5 w-3.5 text-violet-400" />
            trader_01
          </Link>

          <Link
            href="/trade/DARKHOLD-PASS-2026"
            className="hidden h-9 items-center gap-2 bg-brand-400 px-3.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-canvas transition-colors hover:bg-brand-300 md:flex"
          >
            Trade
            <ArrowUpRight className="h-3 w-3" />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="exchange-mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="flex h-9 w-9 items-center justify-center border border-glass-border text-text-muted transition-colors hover:border-glass-border-strong hover:text-text xl:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="exchange-mobile-nav"
          className="border-t border-glass-border bg-canvas-elevated px-4 pb-5 pt-2 xl:hidden"
        >
          <nav aria-label="Mobile exchange navigation" className="flex flex-col">
            {NAV.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between border-b border-glass-border/70 py-3.5 text-[13px] transition-colors",
                    active ? "text-brand-300" : "text-text-muted hover:text-text"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {active ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-brand-400">
                      Here
                    </span>
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-text-dim" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/portfolio"
              className="border border-glass-border p-3 text-[11px] text-text-muted"
            >
              <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-text-dim">
                Available
              </span>
              <span className="mt-1 block font-mono text-[12px] text-text">
                {wallet ? formatCurrency(availableCredits) : "—"}
              </span>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 border border-glass-border p-3 text-[11px] text-text-muted"
            >
              <UserRound className="h-3.5 w-3.5 text-violet-400" />
              trader_01
            </Link>
          </div>
          <p className="mt-3 font-mono text-[9px] leading-relaxed tracking-[0.06em] text-text-dim">
            Demo session. Every order, balance and counterparty here is simulated.
          </p>
        </div>
      )}
    </header>
  );
}
