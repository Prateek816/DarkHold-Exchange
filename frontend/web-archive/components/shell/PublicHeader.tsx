"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/market", label: "The board" },
  { href: "/auctions", label: "Sale room" },
  { href: "/#rules", label: "House rules" },
  { href: "/demo", label: "Control room" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);

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

  return (
    <header className="relative z-40 border-b border-glass-border bg-canvas/95">
      <div className="border-b border-glass-border/70">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-dim sm:px-6">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Simulated venue
            <span className="hidden text-text-dim/60 sm:inline">/</span>
            <span className="hidden sm:inline">No real money, assets or trades</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden md:inline">Night session</span>
            <span className="hidden h-3 w-px bg-glass-border md:inline-block" />
            <span>Est. MMXXVI</span>
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-4 py-4 sm:px-6 sm:py-5">
        <Wordmark />

        <nav aria-label="Public navigation" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={pathname === item.href}
              className="nav-underline text-[12.5px] font-medium text-text-muted transition-colors hover:text-text data-[active=true]:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href="/login"
            className="link-line text-[12px] font-medium text-text-muted transition-colors hover:text-text"
          >
            Sign in
          </Link>
          <Link
            href="/market"
            className="group inline-flex h-10 items-center gap-3 border border-brand-500/70 bg-brand-400 px-4 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-canvas transition-colors hover:bg-brand-300"
          >
            Enter exchange
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex h-10 w-10 items-center justify-center border border-glass-border text-text-muted transition-colors hover:border-glass-border-strong hover:text-text sm:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div id="public-mobile-nav" className="border-t border-glass-border bg-canvas-elevated px-4 pb-5 pt-3 sm:hidden">
          <nav aria-label="Mobile public navigation" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between border-b border-glass-border/70 py-3.5 text-[13px] text-text-muted transition-colors hover:text-text"
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-text-dim" />
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/login"
              className="flex h-10 flex-1 items-center justify-center border border-glass-border text-[12px] font-medium text-text"
            >
              Sign in
            </Link>
            <Link
              href="/market"
              className="flex h-10 flex-1 items-center justify-center bg-brand-400 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-canvas"
            >
              Enter
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
