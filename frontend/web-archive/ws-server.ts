'use client';

import { useEffect, useRef } from 'react';
import { useMarketStore, useAuctionsStore, useDemoStore } from '@/lib/store';
import { TradeTick } from '@/lib/types';

export function MockWebSocketEngine() {
  const simRunning = useDemoStore((s) => s.simRunning);
  const simSpeed = useDemoStore((s) => s.simSpeed);
  const selectedAssetId = useMarketStore((s) => s.selectedAssetId);
  const updateBookLevel = useMarketStore((s) => s.updateBookLevel);
  const recordTrade = useMarketStore((s) => s.recordTrade);
  const setConnected = useMarketStore((s) => s.setConnected);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const auctionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setConnected(true);

    if (!simRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
      return;
    }

    // Trade and Order Book ticks
    const intervalMs = Math.max(800, 2400 / simSpeed);
    timerRef.current = setInterval(() => {
      const assetId = selectedAssetId || 'dfest-wkd';
      const isSim = Math.random() > 0.15; // 85% bot activity, 15% organic

      // Random price around best bid/ask
      const book = useMarketStore.getState().orderBooks[assetId];
      if (!book) return;

      const side: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const basePrice = side === 'BUY' ? book.bids[0]?.price || 13800 : book.asks[0]?.price || 13900;
      const qty = Math.floor(Math.random() * 3) + 1;

      const trade: TradeTick = {
        id: `tr-sim-${Date.now().toString().slice(-5)}`,
        asset_id: assetId,
        price: basePrice,
        quantity: qty,
        side,
        timestamp: Date.now(),
        is_sim: isSim,
      };

      recordTrade(trade);

      // Book depth fluctuation
      const targetSide = Math.random() > 0.5 ? 'bids' : 'asks';
      const targetLevel = book[targetSide][Math.floor(Math.random() * Math.min(3, book[targetSide].length))];
      if (targetLevel) {
        const delta = Math.random() > 0.6 ? 1 : -1;
        updateBookLevel(assetId, targetSide, targetLevel.price, delta);
      }
    }, intervalMs);

    // Dutch Auction decay ticks
    auctionTimerRef.current = setInterval(() => {
      const { auctions } = useAuctionsStore.getState();
      const activeAuction = auctions.find((a) => a.id === 'auc-sigil-01' && a.status === 'ACTIVE');
      if (activeAuction && activeAuction.current_price > activeAuction.floor_price) {
        const nextPrice = Math.max(activeAuction.floor_price, activeAuction.current_price - 10);
        useAuctionsStore.setState({
          auctions: auctions.map((a) => (a.id === activeAuction.id ? { ...a, current_price: nextPrice } : a)),
        });
      }
    }, 3000 / simSpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
    };
  }, [simRunning, simSpeed, selectedAssetId, updateBookLevel, recordTrade, setConnected]);

  return null;
}
