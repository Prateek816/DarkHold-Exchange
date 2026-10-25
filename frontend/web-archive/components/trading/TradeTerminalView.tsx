"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { fakeWs } from "@/mocks/fake-websocket";
import type {
  Asset,
  BookSnapshot,
  Candle,
  Order,
  OrderStatus,
  TradeTick,
  TransactionReceipt,
} from "@/lib/types";
import { TerminalHeader } from "@/components/trading/TerminalHeader";
import { DepthChart } from "@/components/trading/DepthChart";
import { SpreadChart } from "@/components/trading/SpreadChart";
import { OrderBookLadder } from "@/components/trading/OrderBookLadder";
import { TradeTape } from "@/components/trading/TradeTape";
import { OrderForm } from "@/components/trading/OrderForm";
import { BottomTabs } from "@/components/trading/BottomTabs";
import { useUiStore } from "@/lib/stores/uiStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { GlobalBanners } from "@/components/shell/GlobalBanners";
import { SimBadge } from "@/components/ui/SimBadge";

const CandleChart = dynamic(
  () => import("@/components/trading/CandleChart").then((mod) => mod.CandleChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] w-full items-center justify-center border border-glass-border bg-canvas-elevated font-mono text-[11px] text-text-dim sm:h-[440px]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-400" />
        Loading simulated candle history…
      </div>
    ),
  }
);

const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["FILLED", "CANCELED", "REJECTED"];

/** Merge a server order into local state without allowing status to regress. */
function mergeOrder(existing: Order | undefined, incoming: Order): Order {
  if (!existing) return incoming;

  const existingTerminal = TERMINAL_ORDER_STATUSES.includes(existing.status);
  const incomingTerminal = TERMINAL_ORDER_STATUSES.includes(incoming.status);

  let status = existing.status;
  if (incomingTerminal && !existingTerminal) status = incoming.status;
  else if (!existingTerminal && !incomingTerminal) {
    const rank: Record<OrderStatus, number> = {
      PENDING_SUBMIT: 0,
      OPEN: 1,
      PARTIALLY_FILLED: 2,
      FILLED: 3,
      CANCELED: 3,
      REJECTED: 3,
    };
    status = rank[incoming.status] >= rank[existing.status] ? incoming.status : existing.status;
  }

  const matchedQty = Math.max(existing.matched_qty, incoming.matched_qty);
  const settlementStatus =
    incoming.settlement_status !== "PENDING"
      ? incoming.settlement_status
      : existing.settlement_status !== "PENDING"
        ? existing.settlement_status
        : "PENDING";

  return {
    ...existing,
    ...incoming,
    status,
    matched_qty: matchedQty,
    remaining_qty:
      TERMINAL_ORDER_STATUSES.includes(status) && incoming.remaining_qty === 0
        ? 0
        : Math.max(0, incoming.qty - matchedQty),
    average_price: incoming.average_price ?? existing.average_price,
    reject_reason: incoming.reject_reason ?? existing.reject_reason,
    settlement_status: settlementStatus,
    updated_at: Math.max(existing.updated_at, incoming.updated_at),
  };
}

function mergeOrders(existing: Order[], incoming: Order[]): Order[] {
  const byId = new Map(existing.map((order) => [order.order_id, order]));
  incoming.forEach((order) => {
    byId.set(order.order_id, mergeOrder(byId.get(order.order_id), order));
  });
  return Array.from(byId.values()).sort((a, b) => b.created_at - a.created_at);
}

/** Trades are keyed by the server sequence number; duplicates are dropped. */
function mergeTrades(existing: TradeTick[], incoming: TradeTick[]): TradeTick[] {
  const bySeq = new Map(existing.map((trade) => [trade.seq, trade]));
  incoming.forEach((trade) => bySeq.set(trade.seq, trade));
  return Array.from(bySeq.values()).sort((a, b) => b.seq - a.seq).slice(0, 80);
}

/** Candles are replaced by open_time, never appended as duplicates. */
function mergeCandles(existing: Candle[], incoming: Candle[]): Candle[] {
  const byOpenTime = new Map(existing.map((candle) => [candle.open_time, candle]));
  incoming.forEach((candle) => byOpenTime.set(candle.open_time, candle));
  return Array.from(byOpenTime.values()).sort((a, b) => a.open_time - b.open_time);
}

function mergeReceipts(
  existing: TransactionReceipt[],
  incoming: TransactionReceipt[]
): TransactionReceipt[] {
  const byId = new Map(existing.map((receipt) => [receipt.ledger_tx_id, receipt]));
  incoming.forEach((receipt) => byId.set(receipt.ledger_tx_id, receipt));
  return Array.from(byId.values()).sort((a, b) => b.settled_at - a.settled_at);
}

interface TradeTerminalViewProps {
  assetId: string;
}

export function TradeTerminalView({ assetId }: TradeTerminalViewProps) {
  const { connectionState, setConnectionState, addToast } = useUiStore();
  const { setWalletFromServer } = useWalletStore();

  const [interval, setIntervalState] = useState<"5s" | "1m">("5s");
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);
  const [lastPriceFlash, setLastPriceFlash] = useState<"up" | "down" | null>(null);

  const [bookSnapshot, setBookSnapshot] = useState<BookSnapshot | null>(null);
  const [trades, setTrades] = useState<TradeTick[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candleLoading, setCandleLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<TransactionReceipt[]>([]);
  const [isAssetHalted, setIsAssetHalted] = useState<boolean>(false);
  const [spreadHistory, setSpreadHistory] = useState<{ time: number; spread: number }[]>([]);

  // Refs to track last synced data to avoid cascading renders
  const lastSyncedOrdersRef = useRef<string>("");
  const lastSyncedReceiptsRef = useRef<string>("");
  const lastSyncedAssetHaltedRef = useRef<boolean | null>(null);
  const lastSyncedCandlesKeyRef = useRef<string>("");

  const asOfSeqRef = useRef<number>(0);
  const lastPriceRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => api.getAsset(assetId),
    refetchInterval: 30_000,
  });

  const { data: initialOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
  });

  const { data: initialReceipts = [] } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => api.getReceipts(),
  });

  useEffect(() => {
    if (initialOrders.length > 0) {
      const ordersKey = JSON.stringify(initialOrders.map((o) => o.order_id).sort());
      if (lastSyncedOrdersRef.current !== ordersKey) {
        lastSyncedOrdersRef.current = ordersKey;
        setOrders((previous) => mergeOrders(previous, initialOrders));
      }
    }
  }, [initialOrders]);

  useEffect(() => {
    if (initialReceipts.length > 0) {
      const receiptsKey = JSON.stringify(initialReceipts.map((r) => r.ledger_tx_id).sort());
      if (lastSyncedReceiptsRef.current !== receiptsKey) {
        lastSyncedReceiptsRef.current = receiptsKey;
        setReceipts((previous) => mergeReceipts(previous, initialReceipts));
      }
    }
  }, [initialReceipts]);

  // Seeded tape history is loaded once per asset. It is fictional, but it is
  // still server data rather than a client-side invention.
  useEffect(() => {
    let cancelled = false;
    api.getTrades(assetId).then((serverTrades) => {
      if (cancelled) return;
      setTrades((previous) => mergeTrades(previous, serverTrades));
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    let cancelled = false;
    const candlesKey = `${assetId}:${interval}`;
    if (lastSyncedCandlesKeyRef.current !== candlesKey) {
      lastSyncedCandlesKeyRef.current = candlesKey;
      setCandleLoading(true);
      setCandles([]);
    }
    api.getCandles(assetId, interval).then((serverCandles) => {
      if (cancelled) return;
      setCandles(serverCandles);
      setCandleLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId, interval]);

  useEffect(() => {
    api.getWallet().then((wallet) => setWalletFromServer(wallet));
  }, [setWalletFromServer]);

  /**
   * Refresh every ledger surface from the server. Used after a submission,
   * cancellation or settlement, and after explicit retries.
   */
  const refreshLedger = useCallback(async () => {
    const [wallet, serverOrders, serverReceipts, serverTrades, serverCandles] =
      await Promise.all([
        api.getWallet(),
        api.getOrders(),
        api.getReceipts(),
        api.getTrades(assetId),
        api.getCandles(assetId, interval),
      ]);

    setWalletFromServer(wallet);
    setOrders((previous) => mergeOrders(previous, serverOrders));
    setReceipts((previous) => mergeReceipts(previous, serverReceipts));
    setTrades((previous) => mergeTrades(previous, serverTrades));
    setCandles((previous) => mergeCandles(previous, serverCandles));
  }, [assetId, interval, setWalletFromServer]);

  useEffect(() => {
    if (!asset) return;
    if (lastSyncedAssetHaltedRef.current !== asset.is_halted) {
      lastSyncedAssetHaltedRef.current = asset.is_halted;
      setIsAssetHalted(asset.is_halted);
    }
  }, [asset]);

  useEffect(() => {
    if (lastPriceRef.current === null && trades[0]) {
      lastPriceRef.current = trades[0].price;
    }
  }, [trades]);

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
        if (!data.assetId || data.assetId === assetId) {
          setIsAssetHalted(Boolean(data.isHalted));
        }
      }

      if (event === `book_snapshot:${assetId}`) {
        const snapshot = data as BookSnapshot;
        // Server sequence is the only ordering authority. A late or duplicate
        // snapshot must never replace a newer book.
        if (snapshot.as_of_seq <= asOfSeqRef.current) return;
        asOfSeqRef.current = snapshot.as_of_seq;
        setBookSnapshot(snapshot);

        const bid = snapshot.bids[0]?.price;
        const ask = snapshot.asks[0]?.price;
        if (bid && ask) {
          setSpreadHistory((previous) => {
            const last = previous[previous.length - 1];
            if (last && last.time === snapshot.timestamp) return previous;
            return [...previous, { time: snapshot.timestamp, spread: ask - bid }].slice(-40);
          });
        }
      }

      if (event === `trade_tick:${assetId}`) {
        const tick = data as TradeTick;
        setTrades((previous) => {
          if (previous.some((trade) => trade.seq === tick.seq)) return previous;
          return mergeTrades(previous, [tick]);
        });

        if (lastPriceRef.current !== null && tick.price !== lastPriceRef.current) {
          setLastPriceFlash(tick.price > lastPriceRef.current ? "up" : "down");
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setLastPriceFlash(null), 240);
        }
        lastPriceRef.current = tick.price;
      }

      if (event === `candle_update:${assetId}:${interval}`) {
        const update = data as Candle;
        if (update.interval !== interval) return;
        setCandles((previous) => {
          const index = previous.findIndex((candle) => candle.open_time === update.open_time);
          if (index < 0) return mergeCandles(previous, [update]);
          const next = [...previous];
          next[index] = update;
          return next;
        });
      }

      if (event === "order_update") {
        const update = data as Partial<Order> & { order_id: string };
        setOrders((previous) =>
          previous.map((order) =>
            order.order_id === update.order_id
              ? mergeOrder(order, { ...order, ...update })
              : order
          )
        );
      }

      if (event === "order_settled") {
        setOrders((previous) =>
          previous.map((order) =>
            order.order_id === data.order_id
              ? mergeOrder(order, {
                  ...order,
                  settlement_status: "COMPLETED",
                  updated_at: data.updated_at ?? Date.now(),
                })
              : order
          )
        );
      }

      if (event === "settlement_completed") {
        addToast({
          type: "success",
          title: "Settlement recorded",
          message: `Order ${data.order_id} completed mock settlement. Ledger ${data.ledger_tx_id}.`,
        });
        void refreshLedger();
      }
    });

    return () => {
      fakeWs.unsubscribe(bookChannel);
      fakeWs.unsubscribe(tradesChannel);
      fakeWs.unsubscribe(candleChannel);
      fakeWs.unsubscribe(userChannel);
      removeListener();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [
    assetId,
    interval,
    addToast,
    setConnectionState,
    refreshLedger,
  ]);

  if (assetLoading || !asset) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 font-mono text-text">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-400" />
        <span className="text-[12px]">Loading simulated market for {assetId}…</span>
      </div>
    );
  }

  const bids = bookSnapshot?.bids ?? [];
  const asks = bookSnapshot?.asks ?? [];
  const bestBid = bids[0]?.price ?? asset.best_bid;
  const bestAsk = asks[0]?.price ?? asset.best_ask;
  const currentSpread = bestAsk && bestBid ? bestAsk - bestBid : null;
  const lastTrade = trades[0];
  const lastPrice = lastTrade?.price ?? asset.last_price;
  const lastTradeAt = lastTrade?.timestamp ?? asset.last_price_timestamp;
  const halted = isAssetHalted || asset.is_halted;

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border pb-3">
        <Link
          href="/market"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim transition-colors hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          Board
        </Link>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
          <SimBadge label="Mock venue" />
          <span aria-hidden="true">/</span>
          <span>REST ticket · simulated feed</span>
        </div>
      </div>

      <GlobalBanners
        connectionState={connectionState}
        isAssetHalted={halted}
        haltedAssetName={asset.name}
      />

      <TerminalHeader
        asset={asset}
        bestBid={bestBid}
        bestAsk={bestAsk}
        lastPrice={lastPrice}
        lastTradeAt={lastTradeAt}
        lastPriceFlash={lastPriceFlash}
        bookSeq={bookSnapshot?.as_of_seq}
      />

      <CandleChart
        candles={candles}
        loading={candleLoading}
        ceilingPrice={asset.ceiling_price}
        lastTradePrice={lastPrice}
        interval={interval}
        onIntervalChange={setIntervalState}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DepthChart bids={bids} asks={asks} height={140} />
            <SpreadChart
              spreadHistory={spreadHistory}
              currentSpread={currentSpread ?? undefined}
              bestBid={bestBid}
              bestAsk={bestAsk}
            />
          </div>

          <BottomTabs
            orders={orders}
            receipts={receipts}
            onOrderCanceled={refreshLedger}
          />
        </div>

        <aside
          id="ticket"
          className="order-first flex flex-col gap-4 lg:order-none lg:col-span-4"
          aria-label="Order ticket and live book"
        >
          <OrderForm
            asset={asset}
            prefilledPrice={prefilledPrice}
            isHalted={halted}
            onOrderSubmitted={refreshLedger}
          />

          <OrderBookLadder
            bids={bids}
            asks={asks}
            lastPrice={lastPrice}
            ceilingPrice={asset.ceiling_price}
            asOfSeq={bookSnapshot?.as_of_seq}
            snapshotAt={bookSnapshot?.timestamp}
            onPriceClick={(price) => setPrefilledPrice(price)}
          />

          <TradeTape trades={trades} />
        </aside>
      </div>

      <p className="border-t border-glass-border pt-4 font-mono text-[9px] leading-relaxed tracking-[0.04em] text-text-dim">
        Simulated venue. Orders are matched and receipted by the in-browser mock ledger. No real
        money, venue, ticket or counterparty is involved. Seeded candles are illustrative; engine
        candles appear only when a mock print exists.
      </p>
    </div>
  );
}
