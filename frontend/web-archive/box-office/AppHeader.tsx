'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Terminal, LayoutGrid, Hourglass, Briefcase, Sliders, ArrowUpRight } from 'lucide-react';
import { TheCashDrawer } from './TheCashDrawer';
import { useMarketStore } from '@/lib/store';

export function AppHeader() {
  const pathname = usePathname();
  const isConnected = useMarketStore((s) => s.isConnected);

  const navItems = [
    { label: 'Marketplace', href: '/market', icon: LayoutGrid },
    { label: 'Trading Cockpit', href: '/trade/dfest-wkd', icon: Terminal },
    { label: 'Dutch Auctions', href: '/auctions', icon: Hourglass },
    { label: 'Portfolio & Stubs', href: '/portfolio', icon: Briefcase },
    { label: 'Operator Console', href: '/admin/demo', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-4 lg:px-8 py-3 flex items-center justify-between border-b border-white/[0.06] bg-[#030509]/75 backdrop-blur-2xl select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo to-cyan flex items-center justify-center text-black shadow-cyan-glow group-hover:scale-105 transition-all">
            <Zap className="w-5 h-5 fill-black text-black" />
          </div>
          <div>
            <div className="font-display text-lg tracking-tight font-black text-white leading-none">
              DARKHOLD
            </div>
            <div className="text-[10px] font-mono tracking-widest text-cyan font-bold">
              STOCK EXCHANGE
            </div>
          </div>
        </Link>

        {/* Centered Pill Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-full backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan/20 to-indigo/20 text-cyan border border-cyan/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-ink-muted hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Cash Drawer & Sequencer Status */}
      <div className="flex items-center gap-3.5">
        {/* The Cash Drawer */}
        <TheCashDrawer />

        {/* Engine Sync Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-market-buy shadow-[0_0_8px_#00E599]' : 'bg-market-sell'
            }`}
          />
          <span className="font-bold text-white text-[11px]">
            {isConnected ? 'SEQUENCER 104k TPS' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Fast Trade Action Button */}
        <Link
          href="/trade/dfest-wkd"
          className="btn-cyan text-xs font-bold px-4 py-2 flex items-center gap-1.5"
        >
          <span>Trade Live</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
