'use client';

import { useEffect, useRef } from 'react';
import { useMarketStore, useUserStore, useConnStore, useToastStore, useDemoStore } from '@/lib/store';
import {
  MOCK_ASSETS, MOCK_ORDER_BOOKS, MOCK_TRADES, MOCK_USER_WALLET,
  MOCK_USER_HOLDINGS, MOCK_USER_ORDERS, MOCK_AUCTIONS, generateInitialCandles,
} from '@/mocks/fixtures';

/** Seeds the Zustand stores from mock fixtures and starts a
 *  lightweight simulated WebSocket tick loop. */
export function MockBootstrap({ children }: { children: React.ReactNode }) {
  const { setAssets, setBook, addTrade, setCandles, setAuctions } = useMarketStore();
  const { setUser, setWallet, setHoldings, setOrders } = useUserStore();
  const setStatus = useConnStore((s) => s.setStatus);
  const push = useToastStore((s) => s.push);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    // Check if store already initialized to prevent wiping user trades on intra-app routing
    const userState = useUserStore.getState();
    if (!userState.isSeeded) {
      setUser({ id: 'usr-demo-01', email: 'demo@darkhold.io', role: 'OPERATOR' }, 'mock-token');
      setWallet(MOCK_USER_WALLET);
      setHoldings(MOCK_USER_HOLDINGS);
      setOrders(MOCK_USER_ORDERS);
      useUserStore.setState({ isSeeded: true });
    }

    if (useMarketStore.getState().assets.length === 0) {
      setAssets(MOCK_ASSETS);
      setAuctions(MOCK_AUCTIONS);

      // Seed books, trades, candles
      for (const asset of MOCK_ASSETS) {
        if (MOCK_ORDER_BOOKS[asset.id]) setBook(asset.id, MOCK_ORDER_BOOKS[asset.id]);
        if (MOCK_TRADES[asset.id]) {
          for (const t of MOCK_TRADES[asset.id]) addTrade(t);
        }
        setCandles(asset.id, '1m', generateInitialCandles(asset.id));
      }
    }

    // Simulate connecting → live
    setStatus('connecting');
    const t1 = setTimeout(() => {
      setStatus('live');
      push({ variant: 'info', title: 'Connected', body: 'Live mock data active.' });
    }, 800);

    // Simulate live price ticks (respects Rule R4 simRunning toggle)
    const interval = setInterval(() => {
      if (!useDemoStore.getState().simRunning) return;

      const { assets, markets } = useMarketStore.getState();
      for (const asset of assets) {
        const book = markets[asset.id]?.book;
        if (!book) continue;
        // Randomly update last price
        if (Math.random() > 0.6) {
          const delta = Math.floor((Math.random() - 0.48) * 50);
          const newTrade = {
            id: `tr-live-${Date.now()}-${asset.id}`,
            asset_id: asset.id,
            price: Math.max(asset.face_value, Math.min(asset.ceiling_price, asset.last_price + delta)),
            quantity: Math.floor(Math.random() * 3) + 1,
            side: (Math.random() > 0.5 ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
            timestamp: Date.now(),
            is_sim: true,
          };
          addTrade(newTrade);
        }
      }
    }, 3000);

    // Simulate auction price decay (respects Rule R4 simRunning toggle)
    const auctionInterval = setInterval(() => {
      if (!useDemoStore.getState().simRunning) return;

      const { auctions, updateAuctionPrice } = useMarketStore.getState();
      for (const a of auctions) {
        if (a.status !== 'ACTIVE') continue;
        const elapsed = (Date.now() - a.start_time) / (a.end_time - a.start_time);
        const interpolated = Math.round(
          a.start_price - (a.start_price - a.floor_price) * Math.min(1, elapsed)
        );
        if (Math.abs(interpolated - a.current_price) >= 10) {
          updateAuctionPrice(a.id, interpolated);
        }
      }
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearInterval(interval);
      clearInterval(auctionInterval);
    };
  }, []);

  return <>{children}</>;
}
