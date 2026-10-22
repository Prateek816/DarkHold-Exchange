"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { fakeWs } from "@/mocks/fake-websocket";
import {
  Asset,
  BookSnapshot,
  TradeTick,
  Candle,
  Order,
} from "@/lib/types";
import { TerminalHeader } from "@/components/trading/TerminalHeader";
import dynamic from "next/dynamic";

const CandleChart = dynamic(
  () => import("@/components/trading/CandleChart").then((mod) => mod.CandleChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-card border border-glass-border bg-white/[0.02] font-mono text-xs text-text-dim">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-400" />
        Initializing chart canvas…
      </div>
    ),
  }
);

import { DepthChart } from "@/components/trading/DepthChart";
import { SpreadChart } from "@/components/trading/SpreadChart";
import { OrderBookLadder } from "@/components/trading/OrderBookLadder";
import { TradeTape } from "@/components/trading/TradeTape";
import { OrderForm } from "@/components/trading/OrderForm";
import { BottomTabs } from "@/components/trading/BottomTabs";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { GlobalBanners } from "@/components/shell/GlobalBanners";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TradeTerminalViewProps {
  assetId: string;
}

export function TradeTerminalView({ assetId }: TradeTerminalViewProps) {
  const { connectionState, setConnectionState, addToast } = useUiStore();
  const { setWalletFromServer } = useWalletStore();

  const [interval, setIntervalState] = useState<"5s" | "1m">("1m");
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);
  const [lastPriceFlash, setLastPriceFlash] = useState<"up" | "down" | null>(null);

  const [bookSnapshot, setBookSnapshot] = useState<BookSnapshot | null>(null);
  const [trades, setTrades] = useState<TradeTick[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAssetHalted, setIsAssetHalted] = useState<boolean>(false);

  const asOfSeqRef = useRef<number>(0);

  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => api.getAsset(assetId),
  });

  const { data: initialOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => api.getReceipts(),
  });

  useEffect(() => {
    if (initialOrders.length > 0) {
      setOrders(initialOrders);
    }
  }, [initialOrders]);

  useEffect(() => {
    let isMounted = true;
    api.getCandles(assetId, interval).then((c) => {
      if (isMounted) setCandles(c);
    });
    return () => {
      isMounted = false;
    };
  }, [assetId, interval]);

  useEffect(() => {
    api.getWallet().then((w) => setWalletFromServer(w));
  }, [setWalletFromServer]);

  useEffect(() => {
    const bookChannel = `book:${assetId}`;
    const tradesChannel = `trades:${assetId}`;
    const candleChannel = `candles:${assetId}:${interval}`;
    const userChannel = "user:current";

    fakeWs.subscribe(bookChannel);
    fakeWs.subscribe(tradesChannel);
    fakeWs.subscribe(candleChannel);
    fakeWs.subscribe(userChannel);

    const removeListener = fakeWs.addListener((event, data) => {
      if (event === "connection_change") {
        setConnectionState(data.state);
      }

      if (event === "asset_halt_change") {
        setIsAssetHalted(data.isHalted);
      }

      if (event === `book_snapshot:${assetId}`) {
        const snap = data as BookSnapshot;
        if (snap.as_of_seq > asOfSeqRef.current) {
          asOfSeqRef.current = snap.as_of_seq;
          setBookSnapshot(snap);
        }
      }

      if (event === `trade_tick:${assetId}`) {
        const tick = data as TradeTick;
        setTrades((prev) => {
          if (prev.some((t) => t.seq === tick.seq)) return prev;
          if (prev.length > 0) {
            setLastPriceFlash(tick.price >= prev[0].price ? "up" : "down");
            setTimeout(() => setLastPriceFlash(null), 200);
          }
          return [tick, ...prev].slice(0, 40);
        });
      }

      if (event === `candle_update:${assetId}:1m`) {
        const update = data as Candle;
        setCandles((prev) => {
          const idx = prev.findIndex(
            (c) => c.open_time === update.open_time && c.interval === update.interval
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = update;
            return next;
          }
          return [...prev, update];
        });
      }

      if (event === "order_update") {
        const updated = data as Partial<Order>;
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.order_id === updated.order_id) {
              return { ...ord, ...updated };
            }
            return ord;
          })
        );
      }

      if (event === "settlement_completed") {
        addToast({
          type: "success",
          title: "The Seal Complete",
          message: `Order ${data.order_id} settled on ledger (${data.ledger_tx_id}).`,
        });
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.order_id === data.order_id) {
              return { ...ord, settlement_status: "COMPLETED", status: "FILLED" };
            }
            return ord;
          })
        );
      }
    });

    return () => {
      fakeWs.unsubscribe(bookChannel);
      fakeWs.unsubscribe(tradesChannel);
      fakeWs.unsubscribe(candleChannel);
      fakeWs.unsubscribe(userChannel);
      removeListener();
    };
  }, [assetId, interval, addToast, setConnectionState]);

  if (assetLoading || !asset) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 font-mono text-text">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-brand-400" />
        <span className="text-sm">Initializing Obsidian terminal for {assetId}…</span>
      </div>
    );
  }

  const bids = bookSnapshot?.bids ?? [];
  const asks = bookSnapshot?.asks ?? [];
  const bestBid = bids.length > 0 ? bids[0].price : asset.best_bid;
  const bestAsk = asks.length > 0 ? asks[0].price : asset.best_ask;
  const currentSpread = bestAsk && bestBid ? bestAsk - bestBid : 0;

  return (
    <div className="page-shell">
      {/* Global Banners */}
      <GlobalBanners
        connectionState={connectionState}
        isAssetHalted={isAssetHalted || asset.is_halted}
        haltedAssetName={asset.name}
      />

      {/* Back Link */}
      <div className="flex items-center justify-between gap-3 font-mono text-[10px] text-text-dim">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.025] px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to marketplace</span>
        </Link>
        <span className="uppercase tracking-[0.14em] text-text-dim">
          Obsidian terminal protocol
        </span>
      </div>

      {/* Terminal Header with 4 StatCards */}
      <TerminalHeader
        asset={asset}
        bestBid={bestBid}
        bestAsk={bestAsk}
        lastPriceFlash={lastPriceFlash}
      />

      {/* Primary Terminal Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Large Candlestick Chart, Depth + Spread, Bottom DataTable Tabs */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <CandleChart
            candles={candles}
            ceilingPrice={asset.ceiling_price}
            lastTradePrice={asset.last_price}
            interval={interval}
            onIntervalChange={setIntervalState}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DepthChart bids={bids} asks={asks} height={140} />
            <SpreadChart spreadHistory={[]} currentSpread={currentSpread} />
          </div>

          <BottomTabs
            orders={orders}
            receipts={receipts}
            onOrderCanceled={() => refetchOrders()}
          />
        </div>

        {/* Right Column (4 cols): Order Form, Order Book Ladder, Real-Time Trade Tape */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <OrderForm
            asset={asset}
            prefilledPrice={prefilledPrice}
            onOrderSubmitted={() => refetchOrders()}
          />

          <OrderBookLadder
            bids={bids}
            asks={asks}
            lastPrice={asset.last_price}
            ceilingPrice={asset.ceiling_price}
            onPriceClick={(price) => setPrefilledPrice(price)}
          />

          <TradeTape trades={trades} />
        </div>
      </div>
    </div>
  );
}
