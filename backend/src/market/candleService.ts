import { CandleAggregator, Candle, rebuildActive } from "@darkhold/candles";
import { prisma } from "@/config/db";
import { sseConsumer } from "@/engine/sseConsumer";
import { TradeExecutedEvent } from "@/engine/types";
import { ENGINE_TO_DB_MAP, resolveEngineSymbol } from "@/utils/assetMapping";
import fs from "fs";
import path from "path";

export type CandleListener = (asset: string, candle: Candle) => void;

function getCandidateAssetIds(rawAsset: string): string[] {
  const engineSym = resolveEngineSymbol(rawAsset) || (ENGINE_TO_DB_MAP[rawAsset] ? rawAsset : null);
  const mapped = engineSym ? ENGINE_TO_DB_MAP[engineSym] : undefined;
  return Array.from(
    new Set([rawAsset, engineSym, mapped?.id, mapped?.symbol].filter((x): x is string => Boolean(x)))
  );
}

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
    const engineSym = resolveEngineSymbol(asset) || asset;
    let agg = this.aggregators.get(engineSym);
    if (!agg) {
      agg = new CandleAggregator({
        intervals: ["5s", "1m"],
        origin: "ENGINE",
      });
      this.aggregators.set(engineSym, agg);
    }
    return agg;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Ensure seeded historical candles are present in DB
    await this.ensureSeededCandles();

    // 2. Listen to live engine trades from SSE consumer
    sseConsumer.onEvent((event) => {
      if (event.type === "TradeExecuted") {
        this.handleTrade(event as TradeExecutedEvent);
      }
    });

    // 3. 1-second flush timer to close candles whose bucket ended even without trades
    this.flushTimer = setInterval(() => {
      this.flushAll(Date.now());
    }, 1000);
  }

  public async ensureSeededCandles(): Promise<void> {
    try {
      const existingSeededCount = await prisma.candleRecord.count({
        where: { origin: "SEEDED_SIM" },
      });
      if (existingSeededCount > 0) return;

      const candidates = [
        process.env.SIM_CANDLES_FILE,
        "/app/ops/seed/candles.seeded.json",
        path.resolve(process.cwd(), "ops/seed/candles.seeded.json"),
        path.resolve(process.cwd(), "../ops/seed/candles.seeded.json"),
        path.resolve(process.cwd(), "../../ops/seed/candles.seeded.json"),
        path.resolve(process.cwd(), "matching_engine/contracts/fixtures/market/candles.seeded.json"),
        path.resolve(__dirname, "../../../../ops/seed/candles.seeded.json"),
        path.resolve(__dirname, "../../../ops/seed/candles.seeded.json"),
        path.resolve(__dirname, "../../../matching_engine/contracts/fixtures/market/candles.seeded.json"),
      ].filter((p): p is string => Boolean(p) && fs.existsSync(p));

      if (candidates.length === 0) {
        console.warn("[CandleService] No candles.seeded.json fixture found to seed.");
        return;
      }

      const filePath = candidates[0];
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);

      const fixtureEnd = Number(data.end_ts) || 0;
      const now = Date.now();
      const shiftMs = fixtureEnd > 0 && now > fixtureEnd ? Math.floor((now - fixtureEnd) / 60000) * 60000 : 0;

      const records: any[] = [];
      for (const [engineSym, assetData] of Object.entries<any>(data.assets || {})) {
        const mapped = ENGINE_TO_DB_MAP[engineSym];
        const dbId = mapped ? mapped.id : engineSym;
        const targetIds = Array.from(new Set([dbId, engineSym]));

        for (const targetId of targetIds) {
          for (const interval of ["1m", "5s"]) {
            const list = assetData.candles?.[interval] || [];
            for (const c of list) {
              records.push({
                assetId: targetId,
                interval: c.interval,
                openTime: BigInt(c.openTime) + BigInt(shiftMs),
                open: BigInt(c.open),
                high: BigInt(c.high),
                low: BigInt(c.low),
                close: BigInt(c.close),
                volume: BigInt(c.volume),
                tradeCount: Number(c.tradeCount || 1),
                origin: "SEEDED_SIM",
              });
            }
          }
        }
      }

      if (records.length > 0) {
        const chunkSize = 1000;
        for (let i = 0; i < records.length; i += chunkSize) {
          await prisma.candleRecord.createMany({
            data: records.slice(i, i + chunkSize),
            skipDuplicates: true,
          });
        }
        console.log(`[CandleService] Seeded ${records.length} historical candles from ${filePath}`);
      }
    } catch (err) {
      console.error("[CandleService] Error ensuring seeded candles:", err);
    }
  }

  public handleTrade(trade: TradeExecutedEvent) {
    const engineSym = resolveEngineSymbol(trade.asset) || trade.asset;
    const agg = this.getOrCreateAggregator(engineSym);
    const result = agg.applyTick({
      seq: trade.seq,
      ts: trade.ts,
      price: trade.price,
      qty: trade.qty,
    });

    // Broadcast updated candles
    for (const updated of result.updated) {
      this.emitUpdate(trade.asset, updated);
      if (engineSym !== trade.asset) {
        this.emitUpdate(engineSym, updated);
      }
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
    const engineSym = resolveEngineSymbol(assetSymbol) || assetSymbol;
    const mapped = ENGINE_TO_DB_MAP[engineSym];
    const dbAssetId = mapped?.id || assetSymbol;
    const targetAssetIds = Array.from(new Set([dbAssetId, engineSym]));

    for (const targetId of targetAssetIds) {
      await prisma.candleRecord.upsert({
        where: {
          assetId_interval_openTime: {
            assetId: targetId,
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
          assetId: targetId,
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
    await this.ensureSeededCandles();
    const candidateIds = getCandidateAssetIds(assetIdentifier);

    const dbCandles = await prisma.candleRecord.findMany({
      where: {
        assetId: { in: candidateIds },
        interval,
      },
      orderBy: { openTime: "asc" },
      take: limit * 2,
    });

    const candleByOpenTime = new Map<number, Candle>();
    for (const c of dbCandles) {
      const openTime = Number(c.openTime);
      const existing = candleByOpenTime.get(openTime);
      if (!existing || (existing.origin === "SEEDED_SIM" && c.origin === "ENGINE")) {
        candleByOpenTime.set(openTime, {
          interval: c.interval as "5s" | "1m",
          openTime,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
          tradeCount: c.tradeCount,
          origin: c.origin as "ENGINE" | "SEEDED_SIM",
        });
      }
    }

    let result: Candle[] = Array.from(candleByOpenTime.values()).sort(
      (a, b) => a.openTime - b.openTime
    );

    // Append active in-memory candle if present
    let agg: CandleAggregator | undefined;
    for (const id of candidateIds) {
      agg = this.aggregators.get(id);
      if (agg) break;
    }

    if (agg) {
      const activeList = agg.getActive();
      const activeForInterval = activeList.find((c) => c.interval === interval);
      if (activeForInterval) {
        const idx = result.findIndex((c) => c.openTime === activeForInterval.openTime);
        if (idx !== -1) {
          result[idx] = activeForInterval;
        } else {
          result.push(activeForInterval);
        }
      }
    }

    if (result.length > limit) {
      result = result.slice(result.length - limit);
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
