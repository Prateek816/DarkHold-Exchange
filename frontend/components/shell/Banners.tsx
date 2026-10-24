'use client';

import { useConnStore } from '@/lib/store';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';

export function ConnectionBanner() {
  const status = useConnStore((s) => s.status);
  if (status === 'live') return null;

  if (status === 'reconnecting') {
    return (
      <div className="banner-warn flex items-center gap-2" role="alert">
        <RefreshCw size={13} className="animate-spin" aria-hidden />
        Live data disconnected, reconnecting…
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="banner-error flex items-center gap-2" role="alert">
        <WifiOff size={13} aria-hidden />
        Live data offline. Prices may be stale.
      </div>
    );
  }

  return null;
}

export function HaltedBanner({ assetName }: { assetName: string }) {
  return (
    <div className="banner-error flex items-center gap-2" role="alert" aria-live="assertive">
      <AlertTriangle size={13} aria-hidden />
      Trading is halted for {assetName}. The order form is disabled. Data is read-only.
    </div>
  );
}
