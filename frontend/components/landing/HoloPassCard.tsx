'use client';

import React, { useRef, useState } from 'react';
import { soundFx } from '@/lib/sound';
import { ShieldCheck, Sparkles, RefreshCw, Flame, QrCode } from 'lucide-react';

interface HoloPassCardProps {
  assetName?: string;
  symbol?: string;
  faceValue?: string;
  resaleCap?: string;
  serial?: string;
}

export function HoloPassCard({
  assetName = 'Darkhold Fest Weekend Pass',
  symbol = 'DFEST-WKD',
  faceValue = '$120.00',
  resaleCap = '$144.00 (1.2x)',
  serial = 'DH-2026-FEST-0842',
}: HoloPassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -14;
    const rotY = ((x - centerX) / centerX) * 14;
    setRotate({ x: rotX, y: rotY });
    setMousePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    soundFx.playHover();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000 select-none">
      {/* 3D Floating Tilt Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleFlip}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9.5] cursor-pointer transition-transform duration-150 ease-out preserve-3d"
        style={{
          transform: isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y + (isFlipped ? 180 : 0)}deg) scale3d(1.03, 1.03, 1.03)`
            : `rotateX(0deg) rotateY(${isFlipped ? 180 : 0}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Ambient Back Glow */}
        <div
          className="absolute -inset-2 rounded-3xl blur-2xl opacity-40 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #7B2FF7 0%, #19E3B1 50%, transparent 70%)',
            opacity: isHovered ? 0.6 : 0.25,
          }}
        />

        {/* ── CARD FRONT ── */}
        <div
          className={`absolute inset-0 rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-[rgba(185,167,255,0.35)] shadow-2xl flex flex-col justify-between overflow-hidden backface-hidden ${
            isFlipped ? 'pointer-events-none' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(20,16,36,0.92) 0%, rgba(10,10,18,0.95) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Holographic Iridescent Foil Sheen Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge transition-opacity duration-300"
            style={{
              background: `linear-gradient(${mousePos.x * 2.5}deg, rgba(255,0,150,0.35), rgba(0,255,200,0.35), rgba(255,220,0,0.35), rgba(185,167,255,0.4))`,
              opacity: isHovered ? 0.65 : 0.2,
            }}
          />

          {/* Specular Spotlight Following Cursor */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.22) 0%, transparent 55%)`,
              opacity: isHovered ? 1 : 0,
            }}
          />

          {/* Top Row: Sigil Badge + Category Chip + 3D Flip Action */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #7B2FF7, #19E3B1)',
                  boxShadow: '0 0 16px rgba(25, 227, 177, 0.4)',
                }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--lavender)] font-bold block">
                  GENUINE FESTIVAL ADMISSION
                </span>
                <span className="text-xs font-mono text-[var(--text-dim)]">{serial}</span>
              </div>
            </div>

            <button
              onClick={handleFlip}
              title="Flip pass to inspect cryptographic ledger proof"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.12)] text-[11px] font-mono text-[var(--text-muted)] hover:text-white transition-all"
            >
              <RefreshCw size={11} className={isHovered ? 'animate-spin' : ''} />
              <span>Flip 3D</span>
            </button>
          </div>

          {/* Middle: Big Title & Price Ceilings */}
          <div className="relative z-10 my-auto py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(25,227,177,0.15)] text-[var(--mint)] border border-[rgba(25,227,177,0.3)]">
                SIMULATED ASSET
              </span>
              <span className="text-xs font-mono text-[var(--text-dim)]">· Tier 1 VIP</span>
            </div>
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
              {assetName}
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-1">Symbol: {symbol} · 3-Day Full Access</p>
          </div>

          {/* Bottom Row: Barcode + Face Value + Anti-Scalp Ceiling */}
          <div className="relative z-10 pt-3 border-t border-[rgba(255,255,255,0.1)] flex items-end justify-between">
            <div className="flex items-center gap-4">
              {/* Simulated Barcode */}
              <div className="flex items-end gap-[2px] h-7 opacity-80">
                {[3, 7, 2, 8, 4, 1, 6, 3, 8, 2, 5, 7, 3, 6, 2, 8, 4, 6].map((h, i) => (
                  <div
                    key={i}
                    className="w-[2.5px] bg-white rounded-sm"
                    style={{ height: `${h * 3.5}px` }}
                  />
                ))}
              </div>
              <div className="hidden sm:block text-[10px] font-mono text-[var(--text-dim)]">
                <div>Face: <strong className="text-white">{faceValue}</strong></div>
                <div>Ceiling: <strong className="text-[var(--ceiling)]">{resaleCap}</strong></div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(255,181,71,0.12)] border border-[rgba(255,181,71,0.3)] text-right">
              <ShieldCheck size={14} className="text-[var(--ceiling)]" />
              <span className="text-[11px] font-mono font-bold text-[var(--ceiling)]">Anti-Scalp Protected</span>
            </div>
          </div>
        </div>

        {/* ── CARD BACK (Ledger & Invariants Proof) ── */}
        <div
          className={`absolute inset-0 rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-[rgba(25,227,177,0.35)] shadow-2xl flex flex-col justify-between overflow-hidden backface-hidden [transform:rotateY(180deg)] ${
            !isFlipped ? 'pointer-events-none' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(12,18,24,0.95) 0%, rgba(8,10,14,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--mint)]" />
              <span className="font-mono font-bold text-xs text-white">Cryptographic Ledger Receipt</span>
            </div>
            <button
              onClick={handleFlip}
              className="text-[10px] font-mono text-[var(--lavender)] hover:underline"
            >
              Flip Back ↗
            </button>
          </div>

          {/* Audit Specifications */}
          <div className="space-y-2.5 my-auto text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">State Invariant:</span>
              <span className="text-[var(--mint)] font-bold">R1–R8 Zero-Sum Balanced</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Immutable Face Value:</span>
              <span className="text-white">{faceValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Hardcoded Ceiling:</span>
              <span className="text-[var(--ceiling)] font-bold">{resaleCap}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Ledger Commit Hash:</span>
              <span className="text-[var(--lavender)]">0x7f4a...d91c2b84</span>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[10px] font-mono text-[var(--text-dim)] flex items-center justify-between">
            <span>Deterministic Double-Entry Settlement</span>
            <span className="text-[var(--mint)] font-bold">100% FINAL</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-3 text-[11px] font-mono text-[var(--text-dim)]">
        Interactive 3D Hologram · Move mouse to tilt or click to flip
      </div>
    </div>
  );
}
