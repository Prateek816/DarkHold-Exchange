'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DutchAuction } from '@/lib/types';
import { fmt } from '@/lib/formatters';
import { sound } from '@/lib/sound';
import { useUserStore, useToastStore } from '@/lib/store';
import { Sparkles, Gavel, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuctionPromoCardProps {
  auctions: DutchAuction[];
}

export function AuctionPromoCard({ auctions }: AuctionPromoCardProps) {
  const activeAuction = auctions.find((a) => a.status === 'ACTIVE') || auctions[0];
  const { wallet, setWallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = () => {
    if (!activeAuction || isAccepting) return;
    setIsAccepting(true);
    sound.playClick();

    setTimeout(() => {
      if (wallet && wallet.available_balance >= activeAuction.current_price) {
        setWallet({
          ...wallet,
          available_balance: wallet.available_balance - activeAuction.current_price,
          total_balance: wallet.total_balance,
        });

        pushToast({
          title: 'Auction Cleared',
          body: `Won 1 unit of ${activeAuction.asset_name} at ${fmt.price(activeAuction.current_price)}. Settled to ledger.`,
          variant: 'success',
        });
        sound.playChime(660);
      } else {
        pushToast({
          title: 'Insufficient Balance',
          body: `You need ${fmt.price(activeAuction.current_price)} credits to clear this auction.`,
          variant: 'error',
        });
      }
      setIsAccepting(false);
    }, 450);
  };

  return (
    <div className="promo-auction-card promo-stars p-5 flex flex-col justify-between h-full relative z-10 group">
      {/* Top right shooting star line */}
      <div className="shooting-star" />

      {/* Top Header Block */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          {/* Logo Tile */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[rgba(185,167,255,0.14)] border border-[rgba(185,167,255,0.25)] flex items-center justify-center text-[var(--lav)] shadow-sm">
              <Sparkles size={16} />
            </div>
            <span className="font-display font-semibold text-xs tracking-wide text-white">
              Darkhold
            </span>
          </div>

          {/* Live Tag */}
          {activeAuction ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(185,167,255,0.18)] text-[var(--lav)] border border-[rgba(185,167,255,0.3)] animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--muted)] bg-[var(--raised)]">
              ENDED
            </span>
          )}
        </div>

        {/* Content Details */}
        {activeAuction ? (
          <div>
            <h3 className="font-display font-semibold text-lg text-white leading-tight">
              Dutch auction live now
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
              {activeAuction.asset_name} · Clearing at{' '}
              <strong className="text-white font-mono">{fmt.price(activeAuction.current_price)}</strong>
            </p>

            <div className="mt-4 p-3 rounded-xl bg-[rgba(5,5,8,0.6)] border border-[rgba(255,255,255,0.06)] backdrop-blur-sm flex items-center justify-between text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--muted)] uppercase">Reserve Floor</span>
                <span className="text-white font-medium">{fmt.price(activeAuction.floor_price)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-[var(--muted)] uppercase">Available</span>
                <span className="text-[var(--buy)] font-medium">{activeAuction.quantity} units</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] flex items-center justify-center mx-auto mb-2 text-[var(--muted)]">
              <Gavel size={18} />
            </div>
            <h4 className="text-sm font-semibold text-white">No active auctions</h4>
            <p className="text-xs text-[var(--muted)] mt-1">Check back for the next scheduled drop.</p>
          </div>
        )}
      </div>

      {/* Two Stacked Full-Width Buttons */}
      <div className="mt-5 space-y-2">
        {activeAuction ? (
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="btn-primary w-full shadow-lg shadow-[rgba(124,92,255,0.25)] flex items-center justify-center gap-1.5"
          >
            {isAccepting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--lav-dark)] border-t-transparent animate-spin" />
                Reserving…
              </span>
            ) : (
              <>
                Accept at current price ({fmt.price(activeAuction.current_price)})
                <CheckCircle2 size={14} />
              </>
            )}
          </button>
        ) : (
          <Link
            href="/auctions"
            className="btn-primary w-full flex items-center justify-center gap-1.5"
          >
            Create an auction
          </Link>
        )}

        <Link
          href="/auctions"
          className="btn-secondary w-full flex items-center justify-center gap-1.5 text-xs"
        >
          View all auctions <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
