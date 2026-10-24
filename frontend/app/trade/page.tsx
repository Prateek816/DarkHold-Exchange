'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradeIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trade/dfest-wkd');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-xs text-[var(--text-dim)]">
      Loading Trading Terminal…
    </div>
  );
}
