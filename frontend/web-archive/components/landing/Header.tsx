"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LandingHeaderProps {
  className?: string;
}

export function LandingHeader({ className }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [logoDrawn, setLogoDrawn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Stagger logo draw-in after preloader clears
    const t = setTimeout(() => setLogoDrawn(true), 900);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6",
        scrolled
          ? "bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.04]"
          : "bg-transparent",
        className,
      )}
    >
      <Link
        href="/"
        className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-brand-500/40 bg-brand-500/[0.08] shadow-[0_0_22px_rgba(124,92,255,0.24)] transition-transform duration-500 group-hover:rotate-[6deg]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-brand-400 stroke-[1.8]">
          <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
          <circle cx="12" cy="12" r="3" fill="#14CBAA" />
        </svg>
        <span className="absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/10" />
        {logoDrawn && (
          <div className="absolute -inset-px rounded-[13px] bg-gradient-to-r from-brand-400 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </Link>

      <nav className="hidden sm:flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        <Link
          href="/market"
          className={cn("link-line px-2 py-1", "hover:text-text")}
        >
          Market board
        </Link>
        <Link
          href="/auctions"
          className={cn("link-line px-2 py-1", "hover:text-text")}
        >
          Sale room
        </Link>
        <Link
          href="/login"
          className={cn("link-line px-2 py-1 border border-brand-500/30 rounded-pill text-brand-300", "hover:border-brand-500 hover:text-brand-200")}
        >
          Log in
        </Link>
      </nav>
    </header>
  );
}
