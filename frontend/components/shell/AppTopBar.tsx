'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore, useConnStore, useMarketStore, useSidebarStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import { usePortalTransition } from '@/components/portal/PortalTransitionProvider';
import {
  Bell, Search, Settings, Plus, ChevronDown, Check,
  RefreshCw, LogOut, Sliders, X, ArrowUpRight, Menu, PanelLeft
} from 'lucide-react';

interface AppTopBarProps {
  title?: string;
}

export function AppTopBar({ title }: AppTopBarProps) {
  const router = useRouter();
  const { user, wallet, logout } = useUserStore();
  const status = useConnStore((s) => s.status);
  const { assets } = useMarketStore();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebarStore();
  const { portalNavigate } = usePortalTransition();
  const pushToast = useToastStore((s) => s.push);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('dfest-wkd');
  const [selectedSide, setSelectedSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    sound.playClick();
    pushToast({
      title: 'Refreshed',
      body: 'Market telemetry data updated.',
      variant: 'info',
    });
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleOpenTerminalFromOrder = () => {
    sound.playClick();
    setNewOrderOpen(false);
    router.push(`/trade/${selectedAssetId}`);
  };

  return (
    <>
      <header
        className={`h-16 fixed top-0 right-0 bg-[var(--bg-1)] border-b border-[var(--line-soft)] px-4 sm:px-6 flex items-center justify-between z-30 select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? 'left-0 lg:left-[68px]' : 'left-0 lg:left-[248px]'
        }`}
      >
        {/* Left: Dynamic Sidebar Toggle Button + Initials Avatar + User Capsule + "New order" Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dynamic Sidebar Toggle Button (Mobile: drawer, Desktop: collapse) */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              if (window.innerWidth < 1024) {
                toggleMobile();
              } else {
                toggleCollapse();
              }
            }}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-white hover:bg-[var(--raised)] border border-[var(--line-soft)] transition-colors"
            title="Toggle sidebar (Ctrl+B)"
            aria-label="Toggle navigation sidebar"
          >
            <PanelLeft size={16} />
          </button>
          {/* User Capsule */}
          <div className="relative">
            <button
              onClick={() => {
                sound.playClick();
                setUserMenuOpen(!userMenuOpen);
              }}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
            >
              {/* Initials Avatar (Gradient Circle) */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7B2FF7] to-[#B9A7FF] flex items-center justify-center font-bold text-xs text-[#17122E] shadow-sm shrink-0">
                {user ? user.email[0].toUpperCase() : 'U'}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--muted)]">
                    @{user?.email ? user.email.split('@')[0] : 'judge_buyer'}
                  </span>
                  <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[var(--lav-tint)] text-[var(--lav)]">
                    DEMO
                  </span>
                </div>
                <span className="text-xs font-semibold text-white leading-tight">
                  {user?.role === 'OPERATOR' ? 'Market Operator' : 'Judge Buyer'}
                </span>
              </div>

              <ChevronDown size={13} className="text-[var(--muted)]" />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-[var(--card-solid)] border border-[var(--line)] rounded-xl shadow-2xl p-1.5 z-50 animate-reveal">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--muted)] hover:text-white hover:bg-[var(--raised)] transition-colors"
                >
                  <Settings size={14} />
                  <span>Profile & Security</span>
                </Link>

                <button
                  onClick={() => setReducedEffects(!reducedEffects)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[var(--muted)] hover:text-white hover:bg-[var(--raised)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sliders size={14} />
                    <span>Reduced Effects</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--lav)] font-bold">
                    {reducedEffects ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="my-1 border-t border-[var(--line-soft)]" />

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                    portalNavigate('/login', 'SIGNING OUT');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--sell)] hover:bg-[rgba(255,90,95,0.12)] transition-colors"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Lavender Filled Button "New order" with icon */}
          <button
            onClick={() => {
              sound.playClick();
              setNewOrderOpen(true);
            }}
            className="btn-primary text-xs h-9 px-3.5 shadow-sm ml-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>New order</span>
          </button>
        </div>

        {/* Right Controls: Cash Drawer, Connection, Bell, Search, Settings */}
        <div className="flex items-center gap-3">
          {/* Compact Cash Drawer (Available vs Reserved funds) two-tone pill */}
          {wallet && (
            <div className="flex items-center bg-[var(--raised)] border border-[var(--line)] rounded-full px-3 py-1 text-xs font-mono shadow-inner">
              <span className="text-[var(--muted)] mr-1.5">Avail:</span>
              <span className="font-bold text-white">{fmt.price(wallet.available_balance)}</span>
              <span className="mx-2 text-[var(--line-soft)]">|</span>
              <span className="text-[var(--muted)] mr-1.5">Res:</span>
              <span className="text-[var(--lav)] font-medium">{fmt.price(wallet.reserved_balance)}</span>
            </div>
          )}

          {/* Connection Chip: Live, Reconnecting, Offline */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'live'
                  ? 'bg-[var(--buy)] shadow-sm shadow-[var(--buy)]'
                  : status === 'reconnecting'
                  ? 'bg-[var(--cap)] animate-ping'
                  : 'bg-[var(--sell)]'
              }`}
            />
            <span className="capitalize text-[var(--muted)] text-[10.5px]">{status}</span>
          </div>

          {/* Working Notifications Bell with Numeric Badge [2] */}
          <div className="relative">
            <button
              onClick={() => {
                sound.playClick();
                setNotificationsOpen(!notificationsOpen);
              }}
              className="w-9 h-9 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={14} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--sell)] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                2
              </span>
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--card-solid)] border border-[var(--line)] rounded-xl shadow-2xl p-3 z-50 animate-reveal">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line-soft)] mb-2">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  <span className="text-[10px] text-[var(--lav)] font-mono">Session Events</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--line-soft)]">
                    <span className="text-[10px] text-[var(--buy)] font-mono block">Order Matched</span>
                    <span className="text-[11px] text-white">2 units of DFEST-WKD reserved at $348.00.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--line-soft)]">
                    <span className="text-[10px] text-[var(--lav)] font-mono block">Auction Update</span>
                    <span className="text-[11px] text-white">Moonrise GA Pass batch price decayed to $88.00.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Field with Refresh Icon (Ctrl/Cmd+K) */}
          <div className="flex items-center bg-[var(--raised)] border border-[var(--line-soft)] rounded-full px-3 py-1 text-xs text-[var(--muted)]">
            <Search size={13} className="mr-2 text-[var(--muted)]" />
            <input
              type="text"
              readOnly
              onClick={() => {
                sound.playClick();
                setQuickSearchOpen(true);
              }}
              placeholder="Search (Ctrl+K)"
              className="bg-transparent text-white text-xs outline-none w-24 md:w-32 cursor-pointer placeholder:text-[var(--dim)]"
            />
            <button
              onClick={handleRefresh}
              title="Refresh data"
              className="p-1 text-[var(--muted)] hover:text-white transition-colors"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-[var(--lav)]' : ''} />
            </button>
          </div>

          {/* Settings Button */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </Link>
        </div>
      </header>

      {/* New Order Dialog */}
      {newOrderOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-reveal">
          <div className="w-full max-w-md bg-[var(--card-solid)] border border-[var(--line)] rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line-soft)] mb-4">
              <h3 className="font-display font-semibold text-base text-white">Create New Order</h3>
              <button onClick={() => setNewOrderOpen(false)} className="text-[var(--muted)] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[var(--muted)] block mb-1 font-medium">Select Asset</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-white outline-none font-mono"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.symbol}) — Last: {fmt.price(a.last_price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--muted)] block mb-1 font-medium">Order Side</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSide('BUY')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      selectedSide === 'BUY'
                        ? 'bg-[var(--buy-dim)] text-[var(--buy)] border-[var(--buy)]'
                        : 'bg-[var(--raised)] text-[var(--muted)] border-[var(--line-soft)]'
                    }`}
                  >
                    Buy (Reserve)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSide('SELL')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      selectedSide === 'SELL'
                        ? 'bg-[var(--sell-dim)] text-[var(--sell)] border-[var(--sell)]'
                        : 'bg-[var(--raised)] text-[var(--muted)] border-[var(--line-soft)]'
                    }`}
                  >
                    Sell (Offer)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenTerminalFromOrder}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  <span>Open Terminal with Prefilled Form</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Jump Search Modal (Ctrl+K) */}
      {quickSearchOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-reveal">
          <div className="w-full max-w-lg bg-[var(--card-solid)] border border-[var(--line)] rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--raised)] rounded-xl border border-[var(--line)] mb-3">
              <Search size={15} className="text-[var(--muted)]" />
              <input
                autoFocus
                type="text"
                placeholder="Jump to page or asset..."
                className="bg-transparent text-white text-xs outline-none w-full"
              />
              <button onClick={() => setQuickSearchOpen(false)} className="text-[var(--muted)] hover:text-white">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-mono text-[var(--muted)] uppercase px-2 block">Quick Navigation</span>
              {[
                { label: 'Dashboard (/market)', href: '/market' },
                { label: 'Darkhold Fest Terminal (/trade/dfest-wkd)', href: '/trade/dfest-wkd' },
                { label: 'Moonrise GA Terminal (/trade/moon-ga)', href: '/trade/moon-ga' },
                { label: 'Dutch Auctions (/auctions)', href: '/auctions' },
                { label: 'Portfolio & Receipts (/portfolio)', href: '/portfolio' },
                { label: 'Operator Demo Console (/admin/demo)', href: '/admin/demo' },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setQuickSearchOpen(false);
                    router.push(item.href);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[var(--raised)] transition-colors flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight size={13} className="text-[var(--muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
