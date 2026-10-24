'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ParticleRibbon } from '@/components/landing/ParticleRibbon';
import { TiltCard } from '@/components/landing/TiltCard';
import { LiveMarketCockpit } from '@/components/landing/LiveMarketCockpit';
import { DutchDecaySimulator } from '@/components/landing/DutchDecaySimulator';
import { LiveSimulatorSandbox } from '@/components/landing/LiveSimulatorSandbox';
import { SectionDivider } from '@/components/landing/SectionDivider';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { soundFx } from '@/lib/sound';
import { fmt } from '@/lib/formatters';
import {
  ArrowRight, ShieldCheck, Gavel, TrendingUp, BookOpen, Lock,
  Zap, Volume2, VolumeX, Sparkles, CheckCircle2, ChevronDown, Plus, Minus, X
} from 'lucide-react';

/* ── Dynamically Anchored Floating Tag ──────────────────── */
interface DynamicTagProps {
  label: string;
  ticker: string;
  price: string;
  change: string;
  color: string;
  pos?: { x: number; y: number };
  defaultPos: { left: string; top: string };
  onClick: () => void;
}

function DynamicTag({
  label,
  ticker,
  price,
  change,
  color,
  pos,
  defaultPos,
  onClick,
}: DynamicTagProps) {
  const pinLength = 32;

  const style = pos
    ? {
        left: `${pos.x}px`,
        top: `${pos.y - pinLength - 42}px`,
        transform: 'translate(-50%, 0)',
      }
    : {
        left: defaultPos.left,
        top: defaultPos.top,
        transform: 'translate(-50%, 0)',
      };

  return (
    <div
      onClick={onClick}
      className="absolute z-20 flex flex-col items-center group cursor-pointer transition-all duration-150 ease-out hover:scale-105 select-none"
      style={style}
    >
      {/* Frosted Glass Badge with Specular Border */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-[rgba(255,255,255,0.15)] shadow-2xl backdrop-blur-xl transition-all group-hover:border-[var(--lavender)]"
        style={{
          background: 'rgba(10, 10, 16, 0.88)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${color}35`,
        }}
      >
        <div
          className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
          style={{ background: color }}
        >
          {label[0]}
        </div>
        <div className="flex flex-col text-left">
          <div className="text-white font-semibold leading-tight flex items-center gap-1.5">
            <span>{label}</span>
            <span className="text-[10px] text-[var(--buy)] font-mono">{change}</span>
          </div>
          <div className="text-[var(--text-dim)] text-[10px] font-mono">
            {ticker} · {price}
          </div>
        </div>
      </div>

      {/* Connecting Pin Line */}
      <div
        style={{
          width: 1.5,
          height: pinLength,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.15))',
        }}
      />
      {/* Anchor Ring */}
      <div className="relative flex items-center justify-center">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <div
          className="absolute w-5 h-5 rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: color, opacity: 0.45 }}
        />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedTag, setSelectedTag] = useState<{
    label: string;
    ticker: string;
    price: string;
    ceiling: string;
    faceValue: string;
    change: string;
    id: string;
  } | null>(null);

  // Live ticking stats
  const [liveVolume, setLiveVolume] = useState(4200375640);
  const [liveTrades, setLiveTrades] = useState(10445);

  // FAQ accordion open index
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveVolume((v) => v + Math.floor(Math.random() * 450) + 50);
      if (Math.random() > 0.6) {
        setLiveTrades((t) => t + 1);
      }
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleAnchorUpdate = useCallback((newAnchors: Record<string, { x: number; y: number }>) => {
    setAnchors(newAnchors);
  }, []);

  const toggleSound = () => {
    const enabled = soundFx.toggle();
    setSoundEnabled(enabled);
  };

  return (
    <div
      style={{ background: '#050508', minHeight: '100dvh', color: 'var(--text)' }}
      className="overflow-x-hidden selection:bg-[var(--lavender)] selection:text-black font-ui"
    >
      {/* Ambient Top Glow matching workplace */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 pointer-events-none opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #7B2FF7 0%, #B9A7FF 25%, transparent 70%)',
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* ═══════════════════════════════════════════════════════════
          HEADER / NAVBAR (Frosted Glassmorphic Pill)
      ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-7xl mx-auto">
        <nav className="surface-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,16,0.75)] backdrop-blur-xl rounded-full px-5 py-3 flex items-center justify-between shadow-2xl">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-extrabold text-white text-sm shadow-md transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #7B2FF7, #B9A7FF)',
                boxShadow: '0 0 16px rgba(185, 167, 255, 0.4)',
              }}
            >
              D
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm tracking-tight text-white leading-tight">
                Darkhold Exchange
              </span>
              <span className="text-[9px] font-mono text-[var(--lavender)] tracking-wider uppercase">
                Festival Market
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[var(--text-muted)]">
            <Link href="/market" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/trade" className="hover:text-white transition-colors">Terminal</Link>
            <Link href="/auctions" className="hover:text-white transition-colors">Auctions</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
            <a href="#cockpit" className="hover:text-white transition-colors">Live Cockpit</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Sound Synthesizer Toggle */}
            <button
              onClick={toggleSound}
              className="px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle Web Audio Synthesizer"
            >
              {soundEnabled ? <Volume2 size={13} className="text-[var(--mint)]" /> : <VolumeX size={13} />}
              <span className="font-mono text-[10px] hidden sm:inline">{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
            </button>

            <Link href="/login" className="text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] cursor-pointer hidden sm:inline-flex items-center">
              Sign In
            </Link>
            <Link href="/login" className="btn-primary text-xs h-8 px-4 rounded-full shadow-md">
              Launch App
            </Link>
          </div>
        </nav>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION (Confined 3D Particle Ribbon + 3D Holographic Pass)
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-100px)] flex items-center overflow-hidden pt-8 pb-16">
        {/* Particle Ribbon with Workplace Theme Palette */}
        <ParticleRibbon onAnchorUpdate={handleAnchorUpdate} />

        {/* Floating Tags anchored in real-time coordinates to wave */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none" aria-hidden>
          <div className="pointer-events-auto">
            {/* Tag 1: Darkhold Fest */}
            <DynamicTag
              label="Darkhold Fest"
              ticker="DFEST-WKD"
              price="$138.50"
              change="+4.2%"
              color="#FFB547"
              pos={anchors['tag-1']}
              defaultPos={{ left: '56%', top: '22%' }}
              onClick={() => {
                soundFx.playChime(700);
                setSelectedTag({
                  label: 'Darkhold Fest Weekend Pass',
                  ticker: 'DFEST-WKD',
                  price: '$138.50',
                  ceiling: '$144.00 (1.2x)',
                  faceValue: '$120.00',
                  change: '+4.2%',
                  id: 'dfest-wkd',
                });
              }}
            />

            {/* Tag 2: Moonrise GA */}
            <DynamicTag
              label="Moonrise GA"
              ticker="MOON-GA"
              price="$88.00"
              change="+2.1%"
              color="#5EDCF5"
              pos={anchors['tag-2']}
              defaultPos={{ left: '78%', top: '38%' }}
              onClick={() => {
                soundFx.playChime(600);
                setSelectedTag({
                  label: 'Moonrise GA Pass',
                  ticker: 'MOON-GA',
                  price: '$88.00',
                  ceiling: '$102.00 (1.2x)',
                  faceValue: '$85.00',
                  change: '+2.1%',
                  id: 'moon-ga',
                });
              }}
            />

            {/* Tag 3: Sigil Pin */}
            <DynamicTag
              label="Sigil Pin"
              ticker="SIGIL-PIN"
              price="$24.00"
              change="+0.8%"
              color="#B9A7FF"
              pos={anchors['tag-3']}
              defaultPos={{ left: '64%', top: '64%' }}
              onClick={() => {
                soundFx.playChime(800);
                setSelectedTag({
                  label: 'Sigil Collector Pin',
                  ticker: 'SIGIL-PIN',
                  price: '$24.00',
                  ceiling: '$30.00 (1.2x)',
                  faceValue: '$25.00',
                  change: '+0.8%',
                  id: 'sigil-pin',
                });
              }}
            />
          </div>
        </div>

        {/* Hero Content Container */}
        <div className="relative z-20 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl animate-reveal">
            {/* Eyebrow Capsule */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(25,227,177,0.1)] border border-[rgba(25,227,177,0.3)] mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)] animate-pulse" />
              <span className="text-[10.5px] font-mono font-bold text-[var(--mint)] tracking-wider uppercase">
                ANTI-SCALPING PROTOCOL · GUARANTEED PRICE CEILINGS
              </span>
            </div>

            {/* Massive Fluid Headline */}
            <h1
              className="font-display font-extrabold leading-[1.04] text-white tracking-tight mb-6"
              style={{ fontSize: 'clamp(2.8rem, 5.4vw, 4.8rem)' }}
            >
              The Future of<br />
              <span className="bg-gradient-to-r from-white via-[#E0D9FF] to-[#B9A7FF] bg-clip-text text-transparent">
                Festival Passes
              </span><br />
              Is Transparent.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed mb-9 max-w-[520px]">
              Trade, auction, and verify festival tickets and limited drops through a simulated fair-price marketplace. Anti-scalping 120% ceilings and double-entry ledger finality guaranteed.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/market" className="btn-mint text-sm px-8 py-3.5 rounded-full shadow-mint">
                Start Trading <ArrowRight size={16} />
              </Link>
              <Link href="/auctions" className="btn-ghost text-sm px-8 py-3.5 rounded-full">
                Explore Dutch Auctions
              </Link>
            </div>

            {/* Verified Ledger Badge */}
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[var(--text-dim)] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--buy)]" />
                <span>Double-Entry Ledger (R1–R8)</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--ceiling)]" />
                <span>Max 1.2x Resale Ceiling</span>
              </div>
              <span>·</span>
              <span className="text-[var(--lavender)]">$1,500 Demo Credits</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE TAG INSPECTOR MODAL
      ═══════════════════════════════════════════════════════════ */}
      {selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="surface p-6 rounded-3xl border border-[rgba(185,167,255,0.3)] max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedTag(null)}
              className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md"
                style={{ background: 'linear-gradient(135deg,#7B2FF7,#19E3B1)' }}
              >
                {selectedTag.label[0]}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{selectedTag.label}</h3>
                <span className="font-mono text-xs text-[var(--text-dim)]">{selectedTag.ticker}</span>
              </div>
            </div>

            <div className="space-y-2 surface-2 p-3.5 rounded-2xl border border-[var(--border)] font-mono text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Current Price:</span>
                <span className="font-bold text-white">{selectedTag.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Resale Ceiling:</span>
                <span className="font-bold text-[var(--ceiling)]">{selectedTag.ceiling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Face Value:</span>
                <span className="text-[var(--text-muted)]">{selectedTag.faceValue}</span>
              </div>
            </div>

            <Link
              href={`/trade/${selectedTag.id}`}
              className="btn-primary w-full py-2.5 text-xs font-bold rounded-xl text-center block"
            >
              Trade in Cockpit →
            </Link>
          </div>
        </div>
      )}

      {/* ── SECTION DIVIDER 1 ─────────────────────────────────────── */}
      <SectionDivider label="Verified Real-Time Telemetry" glowColor="#7B2FF7" />

      {/* ═══════════════════════════════════════════════════════════
          REAL-TIME TELEMETRY STATS SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-8 relative z-20">
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* Card 1: All-time simulated volume */}
            <div className="surface p-7 rounded-3xl border border-[rgba(255,255,255,0.06)] relative overflow-hidden group hover:border-[rgba(185,167,255,0.3)] transition-all">
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, #7B2FF7, #B9A7FF)' }}
              />
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--lavender)] mb-2 font-semibold">
                All-time simulated volume
              </div>
              <div className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-white tabular tracking-tight">
                ${liveVolume.toLocaleString('en-US')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-3 flex items-center gap-1.5 font-mono">
                <span className="text-[var(--buy)]">● LIVE LEDGER</span>
                <span>Reconciled across R1–R8 double-entry invariants</span>
              </div>
            </div>

            {/* Card 2: Total Simulated Trades */}
            <div className="surface p-7 rounded-3xl border border-[rgba(255,255,255,0.06)] relative overflow-hidden group hover:border-[rgba(25,227,177,0.3)] transition-all">
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, #5EDCF5, #19E3B1)' }}
              />
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--mint)] mb-2 font-semibold">
                Total Simulated Trades
              </div>
              <div className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-white tabular tracking-tight">
                {liveTrades.toLocaleString('en-US')}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mt-3 flex items-center gap-1.5 font-mono">
                <span className="text-[var(--sim)]">● SIM BOTS ACTIVE</span>
                <span>Continuous Level 2 market liquidity guaranteed</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 2 ─────────────────────────────────────── */}
      <div id="cockpit">
        <SectionDivider label="Interactive Market Cockpit & Live Charts" glowColor="#19E3B1" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE MARKET COCKPIT (Candlesticks + Live Order Book)
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-10 max-w-6xl mx-auto">
        <ScrollReveal delay={120}>
          <div className="text-center mb-8">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight mb-2">
              Explore Live Market Depth in Real-Time
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Switch assets, scrub historical candles, or inspect live order book depth with full anti-scalping price ceiling visualization.
            </p>
          </div>

          <LiveMarketCockpit />
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 3 ─────────────────────────────────────── */}
      <SectionDivider label="Dutch Auction Dynamic Price Decay" glowColor="#FFB547" />

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE DUTCH AUCTION DECAY SIMULATOR
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-10 max-w-6xl mx-auto">
        <ScrollReveal delay={120}>
          <div className="text-center mb-8">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight mb-2">
              Dynamic Dutch Auction Drop Simulator
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Drag the time slider to watch ticket prices decay step-by-step from ceiling to floor. Test instant ledger buy execution.
            </p>
          </div>

          <DutchDecaySimulator />
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 4 ─────────────────────────────────────── */}
      <SectionDivider label="Exchange Mechanics & 3D Feature Grid" glowColor="#B9A7FF" />

      {/* ═══════════════════════════════════════════════════════════
          FEATURE GRID (3×2 3D Glowing Specular TiltCards)
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-14 max-w-7xl mx-auto text-center">
        <ScrollReveal delay={120}>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-3 tracking-tight">
            Take Full Control of Your Passes
          </h2>
          <p className="text-[var(--text-muted)] text-sm sm:text-base mb-12 max-w-lg mx-auto">
            Built for fans, not predatory scalpers. Darkhold Exchange enforces algorithmic price ceilings and transparent double-entry settlement.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {/* Tile 1 */}
            <TiltCard glowColor="rgba(255, 181, 71, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(255,181,71,0.12)', boxShadow: '0 0 24px rgba(255,181,71,0.2)' }}
                  >
                    <ShieldCheck size={24} className="text-[var(--ceiling)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    1.2x Resale Price Ceilings
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Every asset is capped at 120% of verified face value. The matching engine rejects bids above the ceiling instantly.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--ceiling)]">
                  <span>Anti-Scalping Rule #R7</span>
                  <span className="font-bold">Active</span>
                </div>
              </div>
            </TiltCard>

            {/* Tile 2 */}
            <TiltCard glowColor="rgba(25, 227, 177, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(25,227,177,0.12)', boxShadow: '0 0 24px rgba(25,227,177,0.2)' }}
                  >
                    <Gavel size={24} className="text-[var(--mint)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    Dutch Auction Drops
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    High-demand limited merch and VIP passes decay in price over time until a buyer accepts or floor price is reached.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--mint)]">
                  <span>Dynamic Price Decay</span>
                  <span className="font-bold">Live Drops</span>
                </div>
              </div>
            </TiltCard>

            {/* Tile 3 */}
            <TiltCard glowColor="rgba(185, 167, 255, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(185,167,255,0.12)', boxShadow: '0 0 24px rgba(185,167,255,0.2)' }}
                  >
                    <BookOpen size={24} className="text-[var(--lavender)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    Double-Entry Ledger
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Every trade follows Reserve → Match → Settle with R1–R8 mathematical reconciliation checks and zero optimistic balance drift.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--lavender)]">
                  <span>Zero-Sum Commodity</span>
                  <span className="font-bold">Deterministic</span>
                </div>
              </div>
            </TiltCard>

            {/* Tile 4 */}
            <TiltCard glowColor="rgba(61, 220, 110, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(61,220,110,0.12)', boxShadow: '0 0 24px rgba(61,220,110,0.2)' }}
                  >
                    <TrendingUp size={24} className="text-[var(--buy)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    Level 2 Order Book
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Real-time market depth with asks, bids, and spreads. Click any level to instantly prefill price in the trading terminal.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--buy)]">
                  <span>Depth Visualizer</span>
                  <span className="font-bold">0.1s Tick</span>
                </div>
              </div>
            </TiltCard>

            {/* Tile 5 */}
            <TiltCard glowColor="rgba(255, 90, 95, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(255,90,95,0.12)', boxShadow: '0 0 24px rgba(255,90,95,0.2)' }}
                  >
                    <Lock size={24} className="text-[var(--sell)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    Strict Holding Caps
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Whale prevention enforced by code: accounts are limited to 4 units per festival pass, preventing market cornering.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--sell)]">
                  <span>Max 4 Passes / Account</span>
                  <span className="font-bold">Enforced</span>
                </div>
              </div>
            </TiltCard>

            {/* Tile 6 */}
            <TiltCard glowColor="rgba(94, 220, 245, 0.45)">
              <div className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] h-full flex flex-col justify-between backdrop-blur-xl">
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: 'rgba(94,220,245,0.12)', boxShadow: '0 0 24px rgba(94,220,245,0.2)' }}
                  >
                    <Zap size={24} className="text-[var(--sim)]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-white mb-2">
                    Autonomous SIM Bots
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Clearly labeled SIM traders generate continuous order book depth and immediate fill availability 24/7.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-center text-[11px] font-mono text-[var(--sim)]">
                  <span>SIM Trader Engine</span>
                  <span className="font-bold">Active</span>
                </div>
              </div>
            </TiltCard>
          </div>
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 5 ─────────────────────────────────────── */}
      <SectionDivider label="Mathematical Invariants & 3D Network" glowColor="#7B2FF7" />

      {/* ═══════════════════════════════════════════════════════════
          SPLIT 3D HOLOGRAPHIC ILLUSTRATION SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
        <ScrollReveal delay={150}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: 3D Holographic Cube Network */}
            <div className="relative h-80 sm:h-96 rounded-3xl overflow-hidden surface border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-2xl">
              <div className="relative">
                <svg width="240" height="240" viewBox="0 0 200 200" fill="none" aria-hidden className="transition-transform duration-700 hover:rotate-6">
                  <defs>
                    <linearGradient id="cubeTop" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B9A7FF" />
                      <stop offset="100%" stopColor="#7B2FF7" />
                    </linearGradient>
                    <linearGradient id="cubeLeft" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#5841CC" />
                      <stop offset="100%" stopColor="#3A2B99" />
                    </linearGradient>
                    <linearGradient id="cubeRight" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7B5FE0" />
                      <stop offset="100%" stopColor="#5841CC" />
                    </linearGradient>
                  </defs>
                  {/* Top face */}
                  <polygon points="100,40 160,75 100,110 40,75" fill="url(#cubeTop)" opacity="0.95" />
                  {/* Left face */}
                  <polygon points="40,75 100,110 100,160 40,125" fill="url(#cubeLeft)" />
                  {/* Right face */}
                  <polygon points="160,75 100,110 100,160 160,125" fill="url(#cubeRight)" />
                  {/* Verified Checkmark */}
                  <path d="M82,100 L96,115 L118,90" stroke="#19E3B1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Ambient glow shadow */}
                  <ellipse cx="100" cy="165" rx="55" ry="12" fill="#7B2FF7" opacity="0.4" />
                </svg>

                {/* Orbiting Satellite Cubes */}
                {[
                  { x: -75, y: -25, s: 0.5, c: '#5EDCF5' },
                  { x: 75,  y: -35, s: 0.4, c: '#19E3B1' },
                  { x: -50, y: 70,  s: 0.35, c: '#B9A7FF' },
                  { x: 80,  y: 60,  s: 0.45, c: '#FFB547' },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="absolute animate-bounce"
                    style={{
                      left: `calc(50% + ${m.x}px)`,
                      top: `calc(50% + ${m.y}px)`,
                      transform: `scale(${m.s})`,
                      animationDuration: `${3 + i * 0.8}s`,
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
                      <polygon points="20,4 34,12 20,20 6,12" fill={m.c} opacity="0.8" />
                      <polygon points="6,12 20,20 20,36 6,28" fill={m.c} opacity="0.5" />
                      <polygon points="34,12 20,20 20,36 34,28" fill={m.c} opacity="0.6" />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Radial glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 50%, rgba(123,47,247,0.2) 0%, transparent 70%)' }}
                aria-hidden
              />
            </div>

            {/* Right: Content & Checklist */}
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight mb-4 leading-tight">
                Fully Simulated.<br />Completely Transparent.
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 max-w-md">
                We built Darkhold Exchange to prove that secondary festival ticket markets don&apos;t have to be corrupt, predatory, or scalper-ridden. Every trade is mathematically validated.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Anti-Scalping Ceilings', desc: '120% cap hardcoded into matching engine.' },
                  { title: 'Cryptographic Ledger', desc: 'Double-entry settlement with R1–R8 invariants.' },
                  { title: 'Continuous SIM Liquidity', desc: 'Real-time order book depth without deadlocks.' },
                  { title: 'Zero Counterparty Risk', desc: 'Funds reserved in escrow before order acceptance.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(25,227,177,0.12)] text-[var(--mint)] flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-snug">{item.title}</div>
                      <div className="text-[11px] text-[var(--text-dim)] mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 6 ─────────────────────────────────────── */}
      <SectionDivider label="Interactive Matching Sandbox" glowColor="#19E3B1" />

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE SIMULATOR SANDBOX
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <ScrollReveal delay={120}>
          <LiveSimulatorSandbox />
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 7 ─────────────────────────────────────── */}
      <SectionDivider label="Community Feedback & Producers" glowColor="#FFB547" />

      {/* ═══════════════════════════════════════════════════════════
          COMMUNITY REVIEWS / TESTIMONIALS
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
        <ScrollReveal delay={150}>
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl text-white mb-2">
              Loved by Fans & Organizers
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Authentic community feedback on fair secondary festival ticketing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Maya Chen',
                role: 'Festival Producer · SoundWave',
                quote: 'The 1.2x price ceiling completely eradicated bots from our ticket drops. Genuine music fans actually got to attend without paying 5x markups.',
                avatar: 'M',
              },
              {
                name: 'Liam Vance',
                role: 'Pass Collector & Techno Fan',
                quote: 'Dutch auctions make buying VIP passes thrilling and fair. You watch the price drop until it hits your budget, with zero fake bidding wars.',
                avatar: 'L',
              },
              {
                name: 'Sarah Kowalski',
                role: 'Tour Manager & Merch Lead',
                quote: 'Instant ledger settlement means my ticket barcode is verified immediately without escrow scam anxiety. The transparency is unmatched.',
                avatar: 'S',
              },
            ].map((t, i) => (
              <div key={i} className="surface p-6 rounded-3xl border border-[rgba(255,255,255,0.06)] flex flex-col justify-between backdrop-blur-xl">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md"
                    style={{ background: 'linear-gradient(135deg,#7B2FF7,#19E3B1)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-[var(--text-dim)]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 8 ─────────────────────────────────────── */}
      <SectionDivider label="Frequently Asked Questions" glowColor="#5EDCF5" />

      {/* ═══════════════════════════════════════════════════════════
          INTERACTIVE FAQ ACCORDION
      ═══════════════════════════════════════════════════════════ */}
      <section id="faq" className="px-6 md:px-12 py-16 max-w-4xl mx-auto">
        <ScrollReveal delay={120}>
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-white mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Everything you need to know about Darkhold Exchange mechanics
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does the 1.2x price ceiling stop scalping?',
                a: 'Every listed asset has an immutable verified face value. The matching engine mathematically rejects any limit order or market ask higher than 120% of face value, eliminating profit margins for speculative resellers.',
              },
              {
                q: 'How do Dutch auctions work on Darkhold?',
                a: 'Dutch auctions begin at a ceiling price and automatically decay in discrete intervals towards a reserve floor price. Any fan can accept at the current asking price to immediately lock in ownership.',
              },
              {
                q: 'Are the funds and passes simulated or real money?',
                a: 'Darkhold Exchange is currently operating in simulated testnet mode. All credits are simulated credits and accounts receive 1,500 demo credits on registration to trade festival passes risk-free.',
              },
              {
                q: 'What are SIM bot traders and why are they labeled?',
                a: 'SIM traders are automated algorithmic bots that place resting orders and generate continuous Level 2 market depth. They are clearly labeled with cyan SIM badges so users can distinguish bot liquidity from human trades.',
              },
              {
                q: 'How does double-entry ledger settlement work?',
                a: 'Every trade transaction enforces zero-sum commodity conservation: credits debited from the buyer equal credits credited to the seller, and passes reserved in escrow transfer upon match without optimistic drift.',
              },
            ].map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="surface rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setOpenFaq(isOpen ? null : i);
                    }}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-white hover:text-[var(--lavender)] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <Minus size={16} className="text-[var(--lavender)] shrink-0" />
                    ) : (
                      <Plus size={16} className="text-[var(--text-dim)] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-[var(--text-muted)] leading-relaxed border-t border-[rgba(255,255,255,0.04)] animate-fade-in">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </section>

      {/* ── SECTION DIVIDER 9 ─────────────────────────────────────── */}
      <SectionDivider label="Start Trading Now" glowColor="#19E3B1" />

      {/* ═══════════════════════════════════════════════════════════
          FINAL HERO CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto relative overflow-hidden">
        <ScrollReveal delay={120}>
          <div className="surface p-10 md:p-16 rounded-3xl border border-[rgba(185,167,255,0.3)] relative text-center shadow-deep overflow-hidden">
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 50%, rgba(123,47,247,0.25) 0%, transparent 70%)' }}
              aria-hidden
            />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="chip chip-mint text-xs font-bold mb-4 inline-flex">
                INSTANT DEMO CREDITS AVAILABLE
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white mb-4 tracking-tight leading-tight">
                Experience the Future of Fair Festival Exchange
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-muted)] mb-8 max-w-lg mx-auto leading-relaxed">
                Join thousands of simulated fans trading festival passes with mathematically guaranteed price ceilings and ledger finality.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/market" className="btn-mint text-sm px-9 py-4 rounded-full shadow-mint">
                  Claim $1,500 Credits & Trade <ArrowRight size={16} />
                </Link>
                <Link href="/admin/demo" className="btn-ghost text-sm px-8 py-4 rounded-full">
                  Operator Demo Console
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] px-6 md:px-12 py-12 max-w-7xl mx-auto text-xs text-[var(--text-dim)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 text-left">
          <div>
            <div className="font-display font-bold text-white text-sm mb-3">Marketplace</div>
            <ul className="space-y-2">
              <li><Link href="/market" className="hover:text-white transition-colors">All Passes</Link></li>
              <li><Link href="/trade/dfest-wkd" className="hover:text-white transition-colors">Trading Terminal</Link></li>
              <li><Link href="/auctions" className="hover:text-white transition-colors">Dutch Auctions</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm mb-3">Protocol</div>
            <ul className="space-y-2">
              <li><Link href="/portfolio" className="hover:text-white transition-colors">Portfolio & Wallet</Link></li>
              <li><Link href="/admin/demo" className="hover:text-white transition-colors">Reconciliation Engine</Link></li>
              <li><span className="text-[var(--text-dim)]">Invariants R1–R8</span></li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm mb-3">Security</div>
            <ul className="space-y-2">
              <li><span className="text-[var(--text-dim)]">Anti-Scalping 1.2x</span></li>
              <li><span className="text-[var(--text-dim)]">Deterministic Ledger</span></li>
              <li><span className="text-[var(--text-dim)]">Holding Caps</span></li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm mb-3">Simulation</div>
            <ul className="space-y-2">
              <li><span className="text-[var(--text-dim)]">Autonomous SIM Bots</span></li>
              <li><span className="text-[var(--text-dim)]">1,500 Starter Credits</span></li>
              <li><span className="text-[var(--text-dim)]">Testnet Environment</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 Darkhold Exchange. Simulated market. Funds are simulated credits. Activity includes simulated traders (SIM).</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/admin/demo" className="hover:text-white transition-colors">Operator Role</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
