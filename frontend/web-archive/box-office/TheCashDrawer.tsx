'use client';

import React from 'react';
import { Wallet, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useUserStore } from '@/lib/store';

export function TheCashDrawer({ compact = false }: { compact?: boolean }) {
  const wallet = useUserStore((s) => s.wallet);

  return (
    <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full p-1 text-xs font-mono select-none backdrop-blur-xl">
      {/* Available compartment */}
      <div className="flex items-center gap-2 px-3.5 py-1 bg-white/[0.06] rounded-full border border-white/[0.08]">
        <Wallet className="w-3.5 h-3.5 text-cyan" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-ink-muted leading-tight font-semibold">
            AVAILABLE
          </div>
          <div className="font-bold tabular-nums text-market-buy text-xs sm:text-sm">
            {formatCurrency(wallet.available_balance)}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-5 bg-white/[0.1] mx-1" />

      {/* Committed Escrow compartment */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5 text-amber" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-ink-muted leading-tight font-semibold flex items-center gap-1">
            <span>ESCROW</span>
            {wallet.reserved_balance > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_6px_#FFB800] animate-pulse" />
            )}
          </div>
          <div className="font-bold tabular-nums text-white text-xs sm:text-sm">
            {formatCurrency(wallet.reserved_balance)}
          </div>
        </div>
      </div>
    </div>
  );
}
