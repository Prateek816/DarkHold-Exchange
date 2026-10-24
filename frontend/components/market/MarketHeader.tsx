'use client';

import React, { useState, useEffect } from 'react';
import { Asset } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import { DimTail } from '@/components/primitives/DimTail';
import { ShieldCheck, Info, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MarketHeaderProps {
  asset: Asset;
  spread: number;
  spreadPct: number;
}

export function MarketHeader({ asset, spread, spreadPct }: MarketHeaderProps) {
  const [flashClass, setFlashClass] = useState('');
  const [prevPrice, setPrevPrice] = useState(asset.last_price);

  useEffect(() => {
    if (asset.last_price > prevPrice) {
      setFlashClass('bg-[rgba(61,220,110,0.2)] text-[var(--buy)]');
    } else if (asset.last_price < prevPrice) {
      setFlashClass('bg-[rgba(255,90,95,0.2)] text-[var(--sell)]');
    }
    setPrevPrice(asset.last_price);
    const timer = setTimeout(() => setFlashClass(''), 800);
    return () => clearTimeout(timer);
  }, [asset.last_price]);

  return (
    <div className="card-pod p-4 flex flex-wrap items-center justify-between gap-4">
      {/* Asset Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)] flex items-center justify-center font-bold text-sm text-[var(--lav)] shadow-sm">
          {asset.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-white leading-none">
              {asset.name}
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--raised)] text-[var(--muted)]">
              {asset.symbol}
            </span>
            {asset.has_sim && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(94,220,245,0.12)] text-[var(--sim)] border border-[rgba(94,220,245,0.25)]">
                SIM
              </span>
            )}
            {asset.is_halted && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(255,90,95,0.15)] text-[var(--sell)] border border-[rgba(255,90,95,0.3)]">
                HALTED
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-2 font-mono">
            <span>Category: {asset.category}</span>
            <span>·</span>
            <span>Holding cap: {asset.holding_cap} max/account</span>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="flex items-center flex-wrap gap-5 text-xs font-mono">
        {/* Face Value */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Face Value</span>
          <span className="text-white font-medium">{fmt.price(asset.face_value)}</span>
        </div>

        {/* Resale Ceiling */}
        <div className="flex flex-col relative group cursor-help">
          <div className="flex items-center gap-1 text-[10px] text-[var(--cap)] uppercase font-semibold">
            <span>Resale Ceiling</span>
            <Info size={11} />
          </div>
          <span className="text-[var(--cap)] font-bold">
            {fmt.price(asset.ceiling_price)}
          </span>
          {/* Tooltip */}
          <div className="absolute top-full right-0 sm:left-0 mt-1 hidden group-hover:block z-50 w-60 p-2.5 rounded-xl bg-[var(--raised)] border border-[var(--line)] text-[11px] text-[var(--muted)] shadow-2xl leading-relaxed">
            Resale cap is strictly 120% of face value ({fmt.price(asset.face_value)}). Limit orders exceeding this bound are rejected by the matching engine.
          </div>
        </div>

        {/* Last Price + Flash */}
        <div className={`flex flex-col p-1.5 rounded-lg transition-all duration-300 ${flashClass}`}>
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Last Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">
              <DimTail value={fmt.price(asset.last_price)} />
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                asset.change_24h >= 0
                  ? 'bg-[rgba(61,220,110,0.12)] text-[var(--buy)]'
                  : 'bg-[rgba(255,90,95,0.12)] text-[var(--sell)]'
              }`}
            >
              {fmt.pct(asset.change_24h)}
            </span>
          </div>
        </div>

        {/* Best Bid / Best Ask */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Best Bid / Ask</span>
          <div>
            <span className="text-[var(--buy)] font-medium">{fmt.price(asset.best_bid)}</span>
            <span className="mx-1 text-[var(--dim)]">/</span>
            <span className="text-[var(--sell)] font-medium">{fmt.price(asset.best_ask)}</span>
          </div>
        </div>

        {/* Spread */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">Spread</span>
          <span className="text-white">
            {spread > 0 ? `${fmt.price(spread)} (${spreadPct.toFixed(2)}%)` : 'No spread'}
          </span>
        </div>
      </div>
    </div>
  );
}
