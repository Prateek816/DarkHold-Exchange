import { CandleAggregator, Candle, rebuildActive } from "@darkhold/candles";
import { prisma } from "@/config/db";
import { sseConsumer } from "@/engine/sseConsumer";
import { TradeExecutedEvent } from "@/engine/types";

export type CandleListener = (asset: string, candle: Candle) => void;

export class CandleService {
  private aggregators: Map<string, CandleAggregator> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private listeners: Set<CandleListener> = new Set();

  public onCandleUpdate(listener: CandleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitUpdate(asset: string, candle: Candle) {
    for (const l of this.listeners) {
      try {
        l(asset, candle);
      } catch (err) {
        console.error("[CandleService] Listener error:", err);
      }
    }
  }

  public getOrCreateAggregator(asset: string): CandleAggregator {
    let agg = this.aggregators.get(asset);
    if (!agg) {
      agg = new CandleAggregator({
        intervals: ["5s", "1m"],
        origin: "ENGINE",
      });
      this.aggregators.set(asset, agg);
    }
    return agg;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to live engine trades from SSE consumer
    sseConsumer.onEvent((event) => {
      if (event.type === "TradeExecuted") {
        this.handleTrade(event as TradeExecutedEvent);
      }
    });

    // 1-second flush timer to close candles whose bucket ended even without trades
    this.flushTimer = setInterval(() => {
      this.flushAll(Date.now());
    }, 1000);
  }

  public handleTrade(trade: TradeExecutedEvent) {
    const agg = this.getOrCreateAggregator(trade.asset);
    const result = agg.applyTick({
      seq: trade.seq,
      ts: trade.ts,
      price: trade.price,
      qty: trade.qty,
    });

    // Broadcast updated candles
    for (const updated of result.updated) {
      this.emitUpdate(trade.asset, updated);
    }

    // Persist closed candles
    for (const closed of result.closed) {
      this.persistClosedCandle(trade.asset, closed).catch((err) => {
        console.error("[CandleService] Error persisting closed candle:", err);
      });
    }
  }

  public flushAll(nowMs: number = Date.now()) {
    for (const [asset, agg] of this.aggregators.entries()) {
      const closedCandles = agg.flush(nowMs);
      for (const closed of closedCandles) {
        this.emitUpdate(asset, closed);
        this.persistClosedCandle(asset, closed).catch((err) => {
          console.error("[CandleService] Error persisting flushed candle:", err);
        });
      }
    }
  }

  private async persistClosedCandle(assetSymbol: string, candle: Candle) {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ symbol: assetSymbol }, { id: assetSymbol }],
      },
    });
    const assetId = asset ? asset.id : assetSymbol;

    await prisma.candleRecord.upsert({
      where: {
        assetId_interval_openTime: {
          assetId,
          interval: candle.interval,
          openTime: BigInt(candle.openTime),
        },
      },
      update: {
        open: BigInt(candle.open),
        high: BigInt(candle.high),
        low: BigInt(candle.low),
        close: BigInt(candle.close),
        volume: BigInt(candle.volume),
        tradeCount: candle.tradeCount,
      },
      create: {
        assetId,
        interval: candle.interval,
        openTime: BigInt(candle.openTime),
        open: BigInt(candle.open),
        high: BigInt(candle.high),
        low: BigInt(candle.low),
        close: BigInt(candle.close),
        volume: BigInt(candle.volume),
        tradeCount: candle.tradeCount,
        origin: candle.origin,
      },
    });
  }

  /**
   * Retrieves historical candles for an asset and interval, merging closed candles
   * with the currently active in-memory candle.
   */
  public async getCandles(
    assetIdentifier: string,
    interval: "5s" | "1m" = "1m",
    limit: number = 500
  ): Promise<Candle[]> {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ id: assetIdentifier }, { symbol: assetIdentifier }],
      },
    });
    const assetId = asset ? asset.id : assetIdentifier;
    const symbol = asset ? asset.symbol : assetIdentifier;

    const dbCandles = await prisma.candleRecord.findMany({
      where: {
        assetId,
        interval,
      },
      orderBy: { openTime: "asc" },
      take: limit,
    });

    const result: Candle[] = dbCandles.map((c) => ({
      interval: c.interval as "5s" | "1m",
      openTime: Number(c.openTime),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
      tradeCount: c.tradeCount,
      origin: c.origin as "ENGINE" | "SEEDED_SIM",
    }));

    // Append active in-memory candle if present
    const agg = this.aggregators.get(symbol) || this.aggregators.get(assetId);
    if (agg) {
      const activeList = agg.getActive();
      const activeForInterval = activeList.find((c) => c.interval === interval);
      if (activeForInterval) {
        // If not already in result, append
        const exists = result.some((c) => c.openTime === activeForInterval.openTime);
        if (!exists) {
          result.push(activeForInterval);
        } else {
          // Replace last element with active candle
          const idx = result.findIndex((c) => c.openTime === activeForInterval.openTime);
          if (idx !== -1) result[idx] = activeForInterval;
        }
      }
    }

    // Fallback seed candle if completely empty
    if (result.length === 0 && asset) {
      const now = Date.now();
      const bucketMs = interval === "5s" ? 5000 : 60000;
      const openTime = Math.floor(now / bucketMs) * bucketMs;
      const refPrice = Number(asset.lastPrice || asset.faceValue);

      result.push({
        interval,
        openTime,
        open: refPrice,
        high: refPrice,
        low: refPrice,
        close: refPrice,
        volume: 1,
        tradeCount: 1,
        origin: "SEEDED_SIM",
      });
    }

    return result;
  }

  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const candleService = new CandleService();
