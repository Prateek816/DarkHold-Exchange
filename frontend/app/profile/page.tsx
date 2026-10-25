'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useUserStore, useToastStore } from '@/lib/store';
import { usePortalTransition } from '@/components/portal/PortalTransitionProvider';
import { fmt } from '@/lib/formatters';
import {
  User, Shield, Sparkles, Sliders, Bell, Key, LogOut,
  CheckCircle2, Clock, Smartphone, HardDrive, Terminal,
  ExternalLink, ArrowUpRight
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { signOutTransition } = usePortalTransition();
  const { user, wallet, logout } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  const [reducedEffects, setReducedEffects] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [oneClickBidding, setOneClickBidding] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');

  useEffect(() => {
    setSessionStartTime(new Date().toLocaleTimeString());
  }, []);

  const handleSignOut = () => {
    logout();
    pushToast({
      variant: 'info',
      title: 'Signed Out',
      body: 'You have been disconnected from the simulated workplace session.',
    });
    signOutTransition('/login');
  };

  const role = user?.role ?? 'USER';
  const email = user?.email ?? 'judge.buyer@darkhold.exchange';
  const handle = email.split('@')[0];

  return (
    <MockBootstrap>
      <AppShell title="Operator Profile & Settings">
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {/* Subtitle / Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                <Clock size={13} className="text-[var(--lav)]" />
                <span suppressHydrationWarning>Active session initialized at {sessionStartTime || '--:--:--'}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--buy)]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Account & Preferences
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/demo"
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--raised)] border border-[var(--line-soft)] hover:border-[var(--line)] text-white inline-flex items-center gap-1.5 transition-all"
              >
                <Terminal size={14} className="text-[var(--lav)]" />
                Operator Console
              </Link>
              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[rgba(255,90,95,0.1)] border border-[rgba(255,90,95,0.25)] text-[var(--sell)] hover:bg-[rgba(255,90,95,0.18)] inline-flex items-center gap-1.5 transition-all"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              HERO PROFILE CARD (Matching ref-app.png super dark aesthetic)
          ═══════════════════════════════════════════════════════════ */}
          <div className="card-pod p-6 relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div
              className="absolute -top-24 -right-24 w-80 h-80 pointer-events-none rounded-full blur-3xl opacity-20"
              style={{ background: 'var(--lav)' }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                {/* 54px Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C5CFF] to-[#4C28D4] border border-[rgba(185,167,255,0.4)] flex items-center justify-center font-display font-bold text-xl text-white shadow-lg">
                  {handle.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white tracking-tight">@{handle}</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[rgba(94,220,245,0.12)] text-[var(--sim)] border border-[rgba(94,220,245,0.25)]">
                      DEMO PERSONA
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[rgba(185,167,255,0.12)] text-[var(--lav)] border border-[rgba(185,167,255,0.25)]">
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] font-mono mt-1">{email}</p>
                  <p className="text-[11px] text-[var(--dim)] mt-0.5">
                    User ID: usr-demo-judge-buyer · Double-entry ledger verified
                  </p>
                </div>
              </div>

              {/* Balance Summary Pod */}
              <div className="p-4 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[var(--muted)] block">
                    Available Balance
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--buy)]">
                    {fmt.price(wallet?.available_balance ?? 150000)}
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-[var(--line-soft)]" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-[var(--muted)] block">
                    Reserved in Escrow
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--cap)]">
                    {fmt.price(wallet?.reserved_balance ?? 27800)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SETTINGS GRID
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display & Interaction Preferences */}
            <div className="card-pod p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--line-soft)]">
                <Sliders size={16} className="text-[var(--lav)]" />
                <h3 className="text-sm font-semibold text-white">Workplace Preferences</h3>
              </div>

              {/* Reduced Effects Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-medium text-white">Reduced Motion & Effects</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Disables glowing ambient light, sparkline animations, and heavy transitions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !reducedEffects;
                    setReducedEffects(next);
                    if (next) {
                      document.documentElement.classList.add('reduce-motion');
                    } else {
                      document.documentElement.classList.remove('reduce-motion');
                    }
                    pushToast({
                      variant: 'info',
                      title: 'Reduced Effects',
                      body: next ? 'Effects reduced for performance.' : 'Full effects enabled.',
                    });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border ${
                    reducedEffects
                      ? 'bg-[var(--lav)] border-[var(--lav)]'
                      : 'bg-[var(--raised)] border-[var(--line-soft)]'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      reducedEffects ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Fast One-Click Bidding Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-[var(--line-soft)]">
                <div>
                  <div className="text-xs font-medium text-white">One-Click Bidding & Orders</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Prefills ladder book prices directly into the order placement dock.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOneClickBidding(!oneClickBidding)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border ${
                    oneClickBidding
                      ? 'bg-[var(--lav)] border-[var(--lav)]'
                      : 'bg-[var(--raised)] border-[var(--line-soft)]'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      oneClickBidding ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound & Haptic Cues Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-[var(--line-soft)]">
                <div>
                  <div className="text-xs font-medium text-white">Trade Fill Notifications</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Shows instant floating toasts when limit orders match or settle.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEffects(!soundEffects)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border ${
                    soundEffects
                      ? 'bg-[var(--lav)] border-[var(--lav)]'
                      : 'bg-[var(--raised)] border-[var(--line-soft)]'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                      soundEffects ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Invariant & Settlement Guard */}
            <div className="card-pod p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--line-soft)]">
                <Shield size={16} className="text-[var(--buy)]" />
                <h3 className="text-sm font-semibold text-white">Ledger & Anti-Scalp Protection</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                  <CheckCircle2 size={16} className="text-[var(--buy)] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Resale Price Ceiling (120%)</span>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Enforces hard upper bound at 1.2× face value. Any bid or ask exceeding this is blocked by the matching engine.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                  <CheckCircle2 size={16} className="text-[var(--buy)] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Double-Entry Settlement (R1–R8)</span>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Reserve → Match → Settle lifecycle. Available + Reserved balance invariant is verified every 60 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)]">
                  <CheckCircle2 size={16} className="text-[var(--buy)] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Bot Trader Simulation (SIM)</span>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Synthetic market makers maintain liquid order book depths across all four marketplace assets.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              QUICK SWITCH DEMO PERSONAS
          ═══════════════════════════════════════════════════════════ */}
          <div className="card-pod p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Switch Demo Persona</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Select one of the pre-configured role profiles to test different platform permissions and views.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Judge Buyer', role: 'USER' as const, email: 'judge.buyer@darkhold.exchange', desc: 'Simulated collector with $1,500' },
                { name: 'Judge Seller', role: 'USER' as const, email: 'judge.seller@darkhold.exchange', desc: 'Pass holder with active listings' },
                { name: 'Festival Issuer', role: 'ISSUER' as const, email: 'issuer@darkholdfest.com', desc: 'Primary pass minting authority' },
                { name: 'Operator Admin', role: 'OPERATOR' as const, email: 'operator@darkhold.exchange', desc: 'Full demo controls & recon tests' },
              ].map((persona) => {
                const isActive = email === persona.email;
                return (
                  <button
                    key={persona.email}
                    onClick={() => {
                      const { setUser, setWallet } = useUserStore.getState();
                      setUser(
                        { id: `usr-${persona.name.toLowerCase().replace(' ', '-')}`, email: persona.email, role: persona.role },
                        'token-sim'
                      );
                      setWallet({
                        available_balance: persona.role === 'OPERATOR' ? 500000 : 150000,
                        reserved_balance: 27800,
                        total_balance: persona.role === 'OPERATOR' ? 527800 : 177800,
                      });
                      pushToast({
                        variant: 'success',
                        title: `Switched to ${persona.name}`,
                        body: `Signed in as ${persona.email}`,
                      });
                    }}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      isActive
                        ? 'bg-[var(--raised)] border-[var(--lav)] ring-1 ring-[var(--lav)]'
                        : 'bg-[var(--inset)] border-[var(--line-soft)] hover:border-[var(--line)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{persona.name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--buy)]" />}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--muted)] block mt-1">{persona.email}</span>
                    <span className="text-[11px] text-[var(--dim)] block mt-1.5 leading-snug">{persona.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
