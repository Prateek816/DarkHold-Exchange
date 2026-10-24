'use client';

import React from 'react';
import Link from 'next/link';
import { Asset } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import { DimTail, UnitSuffix } from './DimTail';
import { AssetCardSpline } from './AssetCardSpline';
import { ArrowUpRight, TrendingUp, TrendingDown, ShieldCheck, Zap } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const isPositive = asset.change_24h >= 0;
  const deltaStr = isPositive ? `+${asset.change_24h.toFixed(2)}%` : `${asset.change_24h.toFixed(2)}%`;
  const changeValueStr = isPositive ? `+$${((asset.last_price * asset.change_24h) / 10000).toFixed(2)}` : `-$${Math.abs((asset.last_price * asset.change_24h) / 10000).toFixed(2)}`;

  // Formatted price string in dollars
  const priceDollars = (asset.last_price / 100).toFixed(2);

  // Subtle luminous perimeter glow class keyed to asset identity
  const glowClass =
    asset.id === 'dfest-wkd'
      ? 'card-asset-amber'
      : asset.id === 'moon-ga'
      ? 'card-asset-blue'
      : asset.id === 'df-hoodie'
      ? 'card-asset-emerald'
      : '';

  return (
    <Link
      href={`/trade/${asset.id}`}
      className={`card-asset ${glowClass} p-5 flex flex-col justify-between h-full group cursor-pointer block text-inherit no-underline transition-all duration-200 hover:-translate-y-0.5`}
    >
      {/* 1. Header: Tile + Category + Name + Round Arrow Button */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* 36px Tile with Original Glyph */}
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-xs shadow-md shrink-0"
              style={{
                background:
                  asset.id === 'dfest-wkd'
                    ? 'linear-gradient(135deg, #F8B700, #D97706)'
                    : asset.id === 'moon-ga'
                    ? 'linear-gradient(135deg, #1D83E5, #3B82F6)'
                    : 'linear-gradient(135deg, #3DDC6E, #059669)',
                color: asset.id === 'dfest-wkd' ? '#17122E' : '#FFFFFF',
              }}
            >
              {asset.symbol[0]}
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider block">
                {asset.category === 'PASS' ? 'Festival Pass' : 'Limited Merch'}
              </span>
              <h4 className="text-[15px] font-semibold text-white truncate group-hover:text-[var(--lav)] transition-colors leading-tight">
                {asset.name}
              </h4>
            </div>
          </div>

          {/* Round Icon Button (↗) */}
          <div
            title={`Open ${asset.symbol} Terminal`}
            className="round-icon-btn group-hover:border-[var(--lav)] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          >
            <ArrowUpRight size={15} />
          </div>
        </div>

        {/* 2. Price Row: Label + Big Price + Delta Pill */}
        <div className="mt-3">
          <span className="text-[12px] font-medium text-[var(--muted)] block">
            Last price
          </span>
          <div className="flex items-baseline justify-between mt-0.5">
            <div className="text-2xl font-normal text-white">
              <span className="text-xs text-[var(--muted)] mr-0.5">$</span>
              <DimTail value={priceDollars} dimDigits={2} />
              <UnitSuffix suffix="USD" />
            </div>

            {/* Delta Pill */}
            <div
              className={`px-2 py-0.5 rounded-[8px] text-[11px] font-semibold flex items-center gap-1 ${
                isPositive
                  ? 'bg-[var(--buy-dim)] text-[var(--buy)]'
                  : 'bg-[var(--sell-dim)] text-[var(--sell)]'
              }`}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{deltaStr}</span>
            </div>
          </div>
        </div>

        {/* 3. Smooth Neon Waveform Graph with Micro Volume Bars & Interactive Scrubbing */}
        <div className="mt-3">
          <AssetCardSpline
            positive={isPositive}
            faceValue={asset.face_value}
            ceilingPrice={asset.ceiling_price}
            lastPrice={asset.last_price}
            changeValueStr={changeValueStr}
            assetId={asset.id}
          />
        </div>
      </div>

      {/* 4. Compact Bottom Row: Bids, Asks & Badges */}
      <div className="pt-3 border-t border-[var(--line-soft)] flex items-center justify-between text-[11px] font-mono mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Bid:</span>
          <span className="text-[var(--buy)] font-medium">{fmt.price(asset.best_bid)}</span>
          <span className="text-[var(--line-soft)]">/</span>
          <span className="text-[var(--muted)]">Ask:</span>
          <span className="text-[var(--sell)] font-medium">{fmt.price(asset.best_ask)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {asset.has_sim && (
            <span className="px-1.5 py-0.2 rounded-[6px] text-[9px] font-mono text-[var(--sim)] bg-[var(--sim-dim)] border border-[rgba(94,220,245,0.3)]">
              SIM
            </span>
          )}
          {asset.active_auction_id && (
            <span className="px-1.5 py-0.2 rounded-[6px] text-[9px] font-mono text-[var(--lav)] bg-[var(--lav-tint)] border border-[rgba(185,167,255,0.3)]">
              AUCTION
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
