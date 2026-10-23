import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { walletsService } from "@/modules/wallets/wallets.service";
import {
  AssetConfiguredEvent,
  BookSnapshot,
  EngineEvent,
  OrderAcceptedEvent,
  OrderCanceledEvent,
  OrderFilledEvent,
  OrderPartiallyFilledEvent,
  OrderRejectedEvent,
  SseHello,
  TradeExecutedEvent,
} from "./types";

export type EventCallback = (event: EngineEvent) => void;
export type BookCallback = (snapshot: BookSnapshot) => void;

export class SseConsumer {
  private url: string;
  private token: string;
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;

  private currentEpoch: string = "";
  private lastAppliedSeq: number = 0;
  private lastActivityTs: number = Date.now();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;

  private onEventCallbacks: Set<EventCallback> = new Set();
  private onBookCallbacks: Set<BookCallback> = new Set();
  private offsetWaiters: Map<number, Array<() => void>> = new Map();

  constructor(options?: { url?: string; token?: string }) {
    this.url = (options?.url || env.ENGINE_URL).replace(/\/+$/, "");
    this.token = options?.token || env.ENGINE_TOKEN;
  }

  public onEvent(cb: EventCallback): () => void {
    this.onEventCallbacks.add(cb);
    return () => this.onEventCallbacks.delete(cb);
  }

  public onBook(cb: BookCallback): () => void {
    this.onBookCallbacks.add(cb);
    return () => this.onBookCallbacks.delete(cb);
  }

  public getLastSeq(): number {
    return this.lastAppliedSeq;
  }

  public getEpoch(): string {
    return this.currentEpoch;
  }

  public setUrl(url: string) {
    this.url = url.replace(/\/+$/, "");
  }

  public setToken(token: string) {
    this.token = token;
  }

  /**
   * Waits up to timeoutMs for the consumer to reach targetSeq.
   * Enables read-your-writes consistency after cancel or submit.
   */
  public async waitForOffset(targetSeq: number, timeoutMs: number = 1000): Promise<boolean> {
    if (this.lastAppliedSeq >= targetSeq) return true;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const list = this.offsetWaiters.get(targetSeq);
        if (list) {
          const idx = list.indexOf(done);
          if (idx !== -1) list.splice(idx, 1);
        }
        resolve(this.lastAppliedSeq >= targetSeq);
      }, timeoutMs);

      const done = () => {
        clearTimeout(timer);
        resolve(true);
      };

      const existing = this.offsetWaiters.get(targetSeq) || [];
      existing.push(done);
      this.offsetWaiters.set(targetSeq, existing);
    });
  }

  private notifyOffsetWaiters(newSeq: number) {
    for (const [seq, waiters] of this.offsetWaiters.entries()) {
      if (seq <= newSeq) {
        for (const w of waiters) w();
        this.offsetWaiters.delete(seq);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Load stored offset from database with graceful retry for Neon serverless wake-up
    let stored: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        stored = await prisma.consumerOffset.findUnique({
          where: { consumer: "engine-main" },
        });
        break;
      } catch (err: any) {
        if (attempt === 3) {
          console.warn(`[SseConsumer] Database connecting (${err.message}). Defaulting to sequence 0.`);
          this.lastAppliedSeq = 0;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (stored) {
      this.currentEpoch = stored.engineEpoch;
      this.lastAppliedSeq = Number(stored.lastSeq);
    } else {
      this.lastAppliedSeq = 0;
    }

    this.connectLoop();
    this.startWatchdog();
  }

  public stop() {
    this.isRunning = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private startWatchdog() {
    this.watchdogTimer = setInterval(() => {
      // 45s of silence = dead connection
      if (this.isRunning && Date.now() - this.lastActivityTs > 45000) {
        console.warn("[SseConsumer] 45s silence detected, reconnecting...");
        this.reconnect();
      }
    }, 5000);
  }

  private reconnect(delayMs: number = 500) {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.isRunning) this.connectLoop();
    }, delayMs);
  }

  private async connectLoop() {
    if (!this.isRunning) return;

    this.abortController = new AbortController();
    let streamUrl = `${this.url}/v1/events?after=${this.lastAppliedSeq}`;
    if (this.currentEpoch) {
      streamUrl += `&epoch=${encodeURIComponent(this.currentEpoch)}`;
    }

    try {
      const res = await fetch(streamUrl, {
        headers: {
          "X-Engine-Token": this.token,
          Accept: "text/event-stream",
        },
        signal: this.abortController.signal,
      });

      if (!res.ok) {
        if (res.status === 409) {
          // Epoch mismatch or future sequence (synchronize gracefully)
          let errData: any = {};
          try {
            errData = await res.json();
          } catch {}
          if (errData?.error?.code === "EPOCH_MISMATCH" || errData?.error?.code === "AFTER_IN_FUTURE") {
            const newEpoch = errData.error?.details?.current_epoch || this.currentEpoch;
            const currentSeq = Number(errData.error?.details?.current_seq ?? 0);
            console.log(`[SseConsumer] Synchronized consumer offset with engine: epoch=${newEpoch}, seq=${currentSeq}`);
            this.currentEpoch = newEpoch;
            this.lastAppliedSeq = currentSeq;
            try {
              await prisma.consumerOffset.upsert({
                where: { consumer: "engine-main" },
                update: { engineEpoch: newEpoch, lastSeq: BigInt(currentSeq) },
                create: { consumer: "engine-main", engineEpoch: newEpoch, lastSeq: BigInt(currentSeq) },
              });
            } catch {}
            this.reconnect(500);
            return;
          } else {
            console.warn("[SseConsumer] 409 conflict:", errData);
          }
        }
        throw new Error(`SSE stream returned HTTP ${res.status}: ${res.statusText}`);
      }

      const body = res.body;
      if (!body) throw new Error("SSE response body is empty");

      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (this.isRunning) {
        const { done, value } = await reader.read();
        if (done) break;

        this.lastActivityTs = Date.now();
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const rawFrame of parts) {
          if (!this.isRunning || this.abortController?.signal.aborted) break;
          if (!rawFrame.trim()) continue;
          await this.processRawFrame(rawFrame);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("[SseConsumer] Connection error:", err.message);
      this.reconnect(1000);
    }
  }

  private async processRawFrame(raw: string) {
    const lines = raw.split("\n");
    let eventType = "";
    let dataStr = "";
    let idStr = "";

    for (const line of lines) {
      if (line.startsWith(":")) {
        // Comment / heartbeat
        this.lastActivityTs = Date.now();
        continue;
      }
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataStr = line.slice(5).trim();
      } else if (line.startsWith("id:")) {
        idStr = line.slice(3).trim();
      }
    }

    if (!eventType && !dataStr) return;

    if (eventType === "hello") {
      try {
        const hello = JSON.parse(dataStr) as SseHello;
        if (!this.currentEpoch) {
          this.currentEpoch = hello.engine_epoch;
          await prisma.consumerOffset.upsert({
            where: { consumer: "engine-main" },
            update: { engineEpoch: hello.engine_epoch, lastSeq: BigInt(this.lastAppliedSeq) },
            create: { consumer: "engine-main", engineEpoch: hello.engine_epoch, lastSeq: BigInt(this.lastAppliedSeq) },
          });
        }
      } catch (err) {
        console.error("[SseConsumer] Error parsing hello frame:", err);
      }
      return;
    }

    if (eventType === "book") {
      try {
        const snapshot = JSON.parse(dataStr) as BookSnapshot;
        for (const cb of this.onBookCallbacks) cb(snapshot);
      } catch (err) {
        console.error("[SseConsumer] Error parsing book frame:", err);
      }
      return;
    }

    // Sequenced event frame
    try {
      const event = JSON.parse(dataStr) as EngineEvent;
      if (!event.seq) return;

      if (event.seq <= this.lastAppliedSeq) {
        return; // Already applied (duplicate on resume)
      }

      if (event.seq !== this.lastAppliedSeq + 1) {
        console.error(
          `[SseConsumer] Gap detected: expected ${this.lastAppliedSeq + 1}, got ${event.seq}. Reconnecting...`
        );
        this.reconnect(200);
        return;
      }

      // Apply event transactionally to database
      await this.applyEvent(event);

      this.lastAppliedSeq = event.seq;
      this.notifyOffsetWaiters(event.seq);

      for (const cb of this.onEventCallbacks) {
        cb(event);
      }
    } catch (err) {
      console.error("[SseConsumer] Error handling event frame:", err);
      this.reconnect(500);
    }
  }

  /**
   * Applies a single event to the PostgreSQL database atomically.
   */
  public async applyEvent(event: EngineEvent) {
    await prisma.$transaction(
      async (tx) => {
      switch (event.type) {
        case "OrderAccepted": {
          const e = event as OrderAcceptedEvent;
          await tx.order.updateMany({
            where: {
              id: e.order_id,
              status: "PENDING_SUBMIT",
            },
            data: {
              status: "OPEN",
              engineSeq: BigInt(e.seq),
              engineEpoch: e.engine_epoch,
            },
          });
          break;
        }

        case "OrderRejected": {
          const e = event as OrderRejectedEvent;
          const order = await tx.order.findUnique({
            where: { id: e.order_id },
          });
          if (order && order.status === "PENDING_SUBMIT") {
            await tx.order.update({
              where: { id: e.order_id },
              data: {
                status: "REJECTED",
                rejectCode: e.code,
              },
            });
            // Release reserved balance or units
            if (order.side === "BUY" && order.reservedAmount > BigInt(0)) {
              await walletsService.releaseOrderFunds(order.userId, order.id, order.reservedAmount, tx);
            } else if (order.side === "SELL" && order.reservedUnits > 0) {
              await walletsService.releaseHoldingUnits(order.userId, order.assetId, order.reservedUnits, tx);
            }
          }
          break;
        }

        case "TradeExecuted": {
          const e = event as TradeExecutedEvent;
          // Record trade idempotently
          const existingTrade = await tx.trade.findUnique({
            where: { id: e.trade_id },
          });

          if (!existingTrade) {
            // Find asset
            const asset = await tx.asset.findFirst({
              where: {
                OR: [{ symbol: e.asset }, { id: e.asset }],
              },
            });
            const assetId = asset ? asset.id : e.asset;

            await tx.trade.create({
              data: {
                id: e.trade_id,
                assetId,
                buyOrderId: e.buy_order_id,
                sellOrderId: e.sell_order_id,
                buyerId: e.buy_user_id,
                sellerId: e.sell_user_id,
                executionPrice: BigInt(e.price),
                quantity: e.qty,
                totalCost: BigInt(e.price) * BigInt(e.qty),
                isSim: e.buy_user_id.startsWith("sim_") || e.sell_user_id.startsWith("sim_"),
                seq: BigInt(e.seq),
                engineEpoch: e.engine_epoch,
                ts: BigInt(e.ts),
                takerSide: e.taker_side,
                state: "PENDING_SETTLEMENT",
                matchedAt: new Date(e.ts),
              },
            });

            // Update matched quantities on both orders
            await tx.order.updateMany({
              where: { id: e.buy_order_id },
              data: {
                matchedQuantity: { increment: e.qty },
                remainingQuantity: { decrement: e.qty },
              },
            });

            await tx.order.updateMany({
              where: { id: e.sell_order_id },
              data: {
                matchedQuantity: { increment: e.qty },
                remainingQuantity: { decrement: e.qty },
              },
            });
          }
          break;
        }

        case "OrderPartiallyFilled": {
          const e = event as OrderPartiallyFilledEvent;
          await tx.order.updateMany({
            where: {
              id: e.order_id,
              status: { in: ["OPEN", "PENDING_SUBMIT", "PARTIALLY_FILLED"] },
            },
            data: {
              status: "PARTIALLY_FILLED",
            },
          });
          break;
        }

        case "OrderFilled": {
          const e = event as OrderFilledEvent;
          await tx.order.updateMany({
            where: {
              id: e.order_id,
              status: { in: ["OPEN", "PENDING_SUBMIT", "PARTIALLY_FILLED"] },
            },
            data: {
              status: "FILLED",
            },
          });
          break;
        }

        case "OrderCanceled": {
          const e = event as OrderCanceledEvent;
          const order = await tx.order.findUnique({
            where: { id: e.order_id },
          });

          if (order && order.status !== "CANCELED" && order.status !== "FILLED") {
            await tx.order.update({
              where: { id: e.order_id },
              data: {
                status: "CANCELED",
                cancelReason: e.reason,
                remainingQuantity: e.remaining_qty,
              },
            });

            // Release remaining reserved funds or units
            if (order.side === "BUY") {
              const releaseFunds = BigInt(e.remaining_qty) * order.price;
              await walletsService.releaseOrderFunds(order.userId, order.id, releaseFunds, tx);
            } else {
              await walletsService.releaseHoldingUnits(order.userId, order.assetId, e.remaining_qty, tx);
            }
          }
          break;
        }

        case "AssetConfigured":
        case "AssetHalted":
        case "AssetResumed":
          break;
      }

      // Persist offset
      await tx.consumerOffset.upsert({
        where: { consumer: "engine-main" },
        update: {
          lastSeq: BigInt(event.seq),
          engineEpoch: event.engine_epoch,
        },
        create: {
          consumer: "engine-main",
          lastSeq: BigInt(event.seq),
          engineEpoch: event.engine_epoch,
        },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }
}

export const sseConsumer = new SseConsumer();
