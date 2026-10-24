'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore, useToastStore } from '@/lib/store';
import { ArrowLeft, Shield, AlertCircle, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setUser, setWallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isOperator = email.includes('admin') || email.includes('operator');
      const isIssuer = email.includes('issuer');
      const role = isOperator ? 'OPERATOR' : isIssuer ? 'ISSUER' : 'USER';

      setUser(
        {
          id: `usr-${email.split('@')[0]}`,
          email,
          role,
        },
        'token-jwt-simulated-9988'
      );
      setWallet({
        available_balance: isOperator ? 500000 : 150000,
        reserved_balance: 27800,
        total_balance: isOperator ? 527800 : 177800,
      });

      pushToast({
        variant: 'success',
        title: isRegister ? 'Account Registered' : 'Signed In',
        body: `Welcome to Darkhold Exchange. Signed in as ${role}.`,
      });

      router.push('/market');
    }, 500);
  };

  const handleDemoPersona = (persona: {
    name: string;
    email: string;
    role: 'USER' | 'OPERATOR' | 'ISSUER';
    balance: number;
  }) => {
    setUser(
      {
        id: `usr-${persona.name.toLowerCase().replace(' ', '-')}`,
        email: persona.email,
        role: persona.role,
      },
      'token-demo-auto'
    );
    setWallet({
      available_balance: persona.balance,
      reserved_balance: 27800,
      total_balance: persona.balance + 27800,
    });
    pushToast({
      variant: 'success',
      title: `Signed in as ${persona.name}`,
      body: `Loaded ${persona.role} profile with simulated wallet.`,
    });
    router.push('/market');
  };

  return (
    <div style={{ background: 'var(--bg-1)', minHeight: '100dvh', color: 'var(--text)' }} className="flex flex-col">
      {/* Top bar */}
      <div className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--muted)] hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Landing
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C5CFF] to-[#4C28D4] border border-[rgba(185,167,255,0.4)] flex items-center justify-center font-display font-bold text-xs text-white">
            D
          </div>
          <span className="font-bold text-sm text-white">Darkhold Exchange</span>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md card-pod p-8 relative shadow-2xl border border-[var(--line-soft)]">
          {/* Subtle purple radial glow */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none rounded-full blur-3xl opacity-35"
            style={{ background: 'var(--lav)' }}
          />

          <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
              {isRegister ? 'Join the Exchange' : 'Sign in to Darkhold'}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Simulated festival pass marketplace with double-entry settlement.
            </p>
          </div>

          {/* Segmented Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] mb-5 relative z-10">
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isRegister ? 'bg-[var(--raised)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'
              }`}
              onClick={() => { setIsRegister(false); setErrorMsg(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isRegister ? 'bg-[var(--raised)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'
              }`}
              onClick={() => { setIsRegister(true); setErrorMsg(null); }}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[rgba(255,90,95,0.1)] border border-[rgba(255,90,95,0.25)] text-[var(--sell)] text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* One-Click Demo Personas */}
          <div className="mb-5 pb-5 border-b border-[var(--line-soft)] relative z-10">
            <span className="text-[10px] uppercase font-mono font-semibold text-[var(--muted)] block mb-2">
              Quick Demo Personas (Instant Access)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Judge Buyer', email: 'judge.buyer@darkhold.exchange', role: 'USER' as const, balance: 150000 },
                { name: 'Judge Seller', email: 'judge.seller@darkhold.exchange', role: 'USER' as const, balance: 85000 },
                { name: 'Festival Issuer', email: 'issuer@darkholdfest.com', role: 'ISSUER' as const, balance: 250000 },
                { name: 'Operator Admin', email: 'operator@darkhold.exchange', role: 'OPERATOR' as const, balance: 500000 },
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleDemoPersona(p)}
                  className="p-2.5 rounded-xl bg-[var(--inset)] border border-[var(--line-soft)] hover:border-[var(--lav)] text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-[var(--lav)] transition-colors">
                      {p.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--buy)]" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--muted)] block mt-0.5">
                    {p.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="judge.buyer@darkhold.exchange"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs text-white focus:outline-none focus:border-[var(--lav)] transition-colors"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--inset)] border border-[var(--line)] text-xs text-white focus:outline-none focus:border-[var(--lav)] transition-colors"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[var(--lav)] text-[var(--lav-dark)] hover:brightness-110 shadow-sm transition-all cursor-pointer mt-2"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In to Workplace'}
            </button>
          </form>

          {/* Simulated Notice */}
          <div className="mt-6 pt-4 border-t border-[var(--line-soft)] text-center relative z-10">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] font-mono">
              <Shield size={12} className="text-[var(--sim)]" />
              <span>Simulated credits · Non-custodial ledger settlement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
