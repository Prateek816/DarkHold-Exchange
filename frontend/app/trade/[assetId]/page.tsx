'use client';

import React, { useState, use } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { MockBootstrap } from '@/components/shell/MockBootstrap';
import { useMarketStore } from '@/lib/store';
import { MarketHeader } from '@/components/market/MarketHeader';
import { PriceChart } from '@/components/market/PriceChart';
import { OrderBookLadder } from '@/components/market/OrderBookLadder';
import { RecentTrades } from '@/components/market/RecentTrades';
import { OrderForm } from '@/components/trading/OrderForm';
import { OrdersTabs } from '@/components/trading/OrdersTabs';
import { HaltedBanner } from '@/components/shell/Banners';
import ElectricBorder from '@/components/ui/ElectricBorder';

import { MOCK_ASSETS } from '@/mocks/fixtures';

export default function TradeTerminalPage({ params }: { params: Promise<{ assetId: string }> }) {
  const resolvedParams = use(params);
  const assetId = resolvedParams.assetId || 'dfest-wkd';

  const { assets, markets } = useMarketStore();
  const [selectedBookPrice, setSelectedBookPrice] = useState<number | null>(null);

  const asset = assets.find((a) => a.id === assetId) || MOCK_ASSETS.find((a) => a.id === assetId) || MOCK_ASSETS[0];
  const market = asset ? markets[asset.id] : null;

  if (!asset) {
    return (
      <MockBootstrap>
        <AppShell title="Trading Terminal">
          <div className="surface p-8 text-center text-sm text-[var(--text-muted)]">
            Asset not found.
          </div>
        </AppShell>
      </MockBootstrap>
    );
  }

  const book = market?.book ?? null;
  const trades = market?.trades ?? [];
  const candles = market?.candles1m ?? [];
  const spread = book?.spread ?? 0;
  const spreadPct = book?.spread_percent ?? 0;

  return (
    <MockBootstrap>
      <AppShell title="Trading Terminal">
        <div className="space-y-4 max-w-7xl mx-auto pb-6">
          {/* Breadcrumb & Terminal Title */}
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="font-semibold text-white">Trading Terminal</span>
            <span>·</span>
            <span className="text-[var(--lav)] font-mono">{asset.symbol}</span>
            <span>·</span>
            <span>{asset.name}</span>
          </div>

          {/* Halted Banner if Asset is Halted */}
          {asset.is_halted && <HaltedBanner assetName={asset.name} />}

          {/* 1. Header Strip */}
          <MarketHeader asset={asset} spread={spread} spreadPct={spreadPct} />

          {/* 2. Cockpit Grid: Chart (Center-Left), Order Book (Center-Right), Form (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chart + Recent Trades Column (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="h-[420px]">
                <PriceChart
                  candles={candles}
                  ceilingPrice={asset.ceiling_price}
                  lastPrice={asset.last_price}
                  onSelectPrice={(p) => setSelectedBookPrice(p)}
                />
              </div>

              {/* Order Tabs below chart */}
              <OrdersTabs assetId={asset.id} />
            </div>

            {/* Order Book + Order Form Column (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Order Form with Electric Current Border */}
              <ElectricBorder
                borderRadius={24}
                color="#5EDCF5"
                glowColor="#19E3B1"
                speed={0.4}
                chaos={0.12}
                spread={0.2}
                thickness={1.0}
                strands={2}
                glow={0.25}
                intensity={0.45}
                arcs={0}
                flicker={0.1}
                active={true}
                interactive={true}
                className="w-full"
              >
                <OrderForm asset={asset} selectedPrice={selectedBookPrice} />
              </ElectricBorder>

              {/* Order Book Ladder */}
              <div className="h-[360px]">
                <OrderBookLadder
                  book={book}
                  ceilingPrice={asset.ceiling_price}
                  onSelectPrice={(p) => setSelectedBookPrice(p)}
                />
              </div>

              {/* Recent Trades Stream */}
              <div className="h-[280px]">
                <RecentTrades trades={trades} />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </MockBootstrap>
  );
}
