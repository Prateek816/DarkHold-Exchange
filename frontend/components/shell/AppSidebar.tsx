'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserStore, useMarketStore, useSidebarStore, useToastStore } from '@/lib/store';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import {
  LayoutGrid, TrendingUp, Wallet, Gavel, ShieldAlert,
  ChevronDown, ChevronUp, ChevronsUpDown, Shield, AlertCircle,
  User as UserIcon, Check, PanelLeftClose, PanelLeftOpen,
  ChevronLeft, ChevronRight, X, ExternalLink
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { id: 'usr-buyer', email: 'judge.buyer@darkhold.exchange', name: 'Judge Buyer', role: 'USER' as const, balance: 150000 },
  { id: 'usr-seller', email: 'judge.seller@darkhold.exchange', name: 'Judge Seller', role: 'USER' as const, balance: 220000 },
  { id: 'usr-issuer', email: 'issuer@darkholdfest.com', name: 'Festival Issuer', role: 'ISSUER' as const, balance: 500000 },
  { id: 'usr-op', email: 'operator@darkhold.exchange', name: 'Market Operator', role: 'OPERATOR' as const, balance: 1000000 },
];

export function AppSidebar() {
  const path = usePathname();
  const { user, orders, setUser, setWallet } = useUserStore();
  const { auctions } = useMarketStore();
  const pushToast = useToastStore((s) => s.push);

  const {
    isCollapsed,
    toggleCollapse,
    mobileOpen,
    setMobileOpen,
    categoryFilter,
    setCategoryFilter,
  } = useSidebarStore();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [openOrdersExpanded, setOpenOrdersExpanded] = useState(true);

  const activeAuctionsCount = auctions.filter((a) => a.status === 'ACTIVE').length;
  const userOpenOrders = orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED');

  const navItems = [
    { href: '/market', label: 'Dashboard', Icon: LayoutGrid },
    { href: '/auctions', label: 'Auctions', Icon: Gavel, countChip: activeAuctionsCount > 0 ? activeAuctionsCount : undefined },
    { href: '/portfolio', label: 'Portfolio', Icon: Wallet },
    { href: '/trade/dfest-wkd', label: 'Terminal', Icon: TrendingUp },
    ...(user?.role === 'OPERATOR'
      ? [{ href: '/admin/demo', label: 'Demo Console', Icon: ShieldAlert, chip: 'Operator' }]
      : []),
    { href: '/profile', label: 'Profile', Icon: UserIcon },
  ];

  const handleSwitchAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    sound.playClick();
    setUser({ id: acc.id, email: acc.email, role: acc.role }, 'mock-token');
    setWallet({
      available_balance: acc.balance,
      reserved_balance: 27800,
      total_balance: acc.balance + 27800,
    });
    setAccountMenuOpen(false);
    pushToast({
      variant: 'success',
      title: `Switched to ${acc.name}`,
      body: `Signed in as ${acc.email} with ${fmt.price(acc.balance)} available.`,
    });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Main Responsive Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-[var(--bg-0)] border-r border-[var(--line-soft)] flex flex-col justify-between z-40 select-none transition-all duration-300 ease-in-out ${
          /* Desktop Width */
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-[248px]'
        } ${
          /* Mobile Slide-Over */
          mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ═══════════════════════════════════════════════════════════
            TOP SECTION: LOGO + ACCOUNT SWITCHER + CATEGORY TOGGLE
        ═══════════════════════════════════════════════════════════ */}
        <div>
          {/* Header Block */}
          <div className={`border-b border-[var(--line-soft)] transition-all ${isCollapsed ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center justify-between">
              {/* Logo / Sigil Pod (Exit to Public Portal) */}
              <Link
                href="/"
                data-testid="brand-logo-link"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group ${
                  isCollapsed ? 'justify-center w-full' : 'p-1.5 hover:bg-[rgba(255,255,255,0.03)] flex-1'
                }`}
                title="Darkhold Exchange"
              >
                {/* Original Sigil in a small rounded square */}
                <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#1E1B4B] to-[#312E81] border border-[rgba(185,167,255,0.3)] flex items-center justify-center text-[var(--lav)] font-bold shadow-md shrink-0 group-hover:border-[var(--mint)] transition-colors">
                  <span className="font-display text-sm tracking-wider">⬡</span>
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="font-bold text-sm text-white leading-tight truncate group-hover:text-[var(--lav)] transition-colors">
                      Darkhold
                    </span>
                    <span className="text-[11px] text-[var(--muted)] leading-none mt-0.5 truncate">
                      Simulated exchange
                    </span>
                  </div>
                )}
              </Link>

              {/* Account menu chevron (when expanded) */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="p-1 rounded-lg hover:bg-[var(--raised)] text-[var(--muted)] hover:text-white transition-colors"
                  aria-label="Switch persona"
                >
                  <ChevronsUpDown size={15} />
                </button>
              )}

              {/* Close button for mobile */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-[var(--muted)] hover:text-white"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Demo Account Switcher Dropdown Menu */}
            {accountMenuOpen && !isCollapsed && (
              <div className="mt-2 bg-[var(--card-solid)] border border-[var(--line)] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-mono text-[var(--muted)] uppercase px-2 py-1 block">
                  Switch Demo Persona
                </span>
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = user?.email === acc.email;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleSwitchAccount(acc)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-[var(--raised)] text-white font-semibold'
                          : 'text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span>{acc.name}</span>
                        <span className="text-[10px] text-[var(--dim)] font-mono">{acc.email}</span>
                      </div>
                      {isSelected && <Check size={13} className="text-[var(--lav)]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Segmented Toggle "Passes | Merch" (Visible when expanded) */}
            {!isCollapsed && (
              <div className="mt-3 bg-[var(--inset)] p-1 rounded-xl border border-[var(--line-soft)] flex items-center">
                <button
                  onClick={() => {
                    setCategoryFilter('PASSES');
                    sound.playClick();
                  }}
                  className={`flex-1 py-1 text-xs font-semibold rounded-[8px] transition-all ${
                    categoryFilter === 'PASSES'
                      ? 'bg-[var(--raised)] text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Passes
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('MERCH');
                    sound.playClick();
                  }}
                  className={`flex-1 py-1 text-xs font-semibold rounded-[8px] transition-all ${
                    categoryFilter === 'MERCH'
                      ? 'bg-[var(--raised)] text-white shadow-sm'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                >
                  Merch
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              NAV LIST (40px rows, adaptive tooltips when collapsed)
          ═══════════════════════════════════════════════════════════ */}
          <nav className="p-2 space-y-1" aria-label="Main navigation">
            {navItems.map(({ href, label, Icon, countChip, chip }) => {
              const isActive = path === href || (href !== '/market' && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? label : undefined}
                  className={`h-10 rounded-[10px] flex items-center transition-all text-xs font-medium relative group ${
                    isCollapsed ? 'justify-center px-0 w-full' : 'justify-between px-3'
                  } ${
                    isActive
                      ? 'bg-[var(--raised)] text-white border border-[var(--line-soft)]'
                      : 'text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={18}
                      strokeWidth={1.6}
                      className={isActive ? 'text-[var(--lav)] shrink-0' : 'text-[var(--muted)] shrink-0'}
                    />
                    {!isCollapsed && <span>{label}</span>}
                  </div>

                  {/* Badges when expanded */}
                  {!isCollapsed && (
                    <>
                      {countChip !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-mono font-bold bg-[var(--lav-tint)] text-[var(--lav)]">
                          {countChip}
                        </span>
                      )}
                      {chip && (
                        <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-mono font-semibold bg-[rgba(185,167,255,0.15)] text-[var(--lav)]">
                          {chip}
                        </span>
                      )}
                    </>
                  )}

                  {/* Mini notification dot when collapsed */}
                  {isCollapsed && countChip !== undefined && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--lav)] ring-2 ring-[var(--bg-0)]" />
                  )}

                  {/* Tooltip on hover when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 hidden group-hover:block z-50 px-2.5 py-1 rounded-md bg-[var(--raised)] border border-[var(--line)] text-xs text-white shadow-xl whitespace-nowrap">
                      {label} {countChip !== undefined && `(${countChip})`}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ═══════════════════════════════════════════════════════════
              COLLAPSIBLE GROUP "OPEN ORDERS" (Dynamic Real-Time Sync)
          ═══════════════════════════════════════════════════════════ */}
          {!isCollapsed && (
            <div className="px-3 mt-2">
              <div
                onClick={() => setOpenOrdersExpanded(!openOrdersExpanded)}
                className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[var(--muted)] cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Open orders</span>
                  <span className="px-1.5 py-0.2 rounded-[6px] text-[10px] font-mono bg-[var(--raised)] text-white">
                    {userOpenOrders.length}
                  </span>
                </div>
                {openOrdersExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>

              {openOrdersExpanded && (
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto pr-1">
                  {userOpenOrders.length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-[var(--dim)] italic font-mono">
                      No active open orders
                    </div>
                  ) : (
                    userOpenOrders.map((ord) => (
                      <Link
                        key={ord.id}
                        href={`/trade/${ord.asset_id}`}
                        onClick={() => setMobileOpen(false)}
                        className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-[var(--line-soft)] hover:border-[var(--line)] flex items-center justify-between transition-colors block"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[var(--raised)] border border-[var(--line-soft)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {ord.asset_symbol[0]}
                          </div>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-[10px] text-[var(--lav)] font-mono font-semibold truncate">
                              {ord.side === 'BUY' ? 'Buy limit' : 'Sell limit'}
                            </span>
                            <span className="text-[11px] text-white font-mono truncate">
                              {ord.quantity} at {fmt.price(ord.price)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            BOTTOM SECTION: NOTICE CARD & DYNAMIC COLLAPSE TOGGLE
        ═══════════════════════════════════════════════════════════ */}
        <div className="p-3 space-y-2 border-t border-[var(--line-soft)]">
          {/* Simulated Market Notice (Expanded only) */}
          {!isCollapsed && (
            <div className="p-3 rounded-[12px] bg-[var(--card-solid)] border border-[var(--line-soft)] shadow-inner">
              <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sim)]" />
                <span>Simulated market</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                Funds are simulated credits. Activity includes simulated traders.
              </p>
            </div>
          )}

          {/* Dynamic Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={`hidden lg:flex items-center gap-2 w-full p-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--raised)] border border-transparent hover:border-[var(--line-soft)] transition-all ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {!isCollapsed && <span>Collapse sidebar</span>}
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
