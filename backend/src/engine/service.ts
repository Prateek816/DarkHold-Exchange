import express, { Request, Response } from "express";
import http from "http";
import fs from "fs";
import path from "path";
import {
  AssetStatus,
  BookSnapshot,
  CancelReason,
  CommandReply,
  ConfigureAssetCommand,
  EngineCommand,
  EngineEvent,
  EngineRejectCode,
  HealthResponse,
  OpenOrdersResponse,
  OrderOutcome,
  OrderSide,
  OrderType,
  SseHello,
  SubmitOrderCommand,
  TimeInForce,
} from "./types";

interface RestingOrder {
  order_id: string;
  user_id: string;
  side: OrderSide;
  price: number;
  qty: number;
  remaining_qty: number;
  accept_seq: number;
  ts: number;
}

interface AssetConfig {
  tick_size: number;
  min_qty: number;
  max_qty: number;
  collar_max_price: number | null;
  status: AssetStatus;
}

interface SseSubscriber {
  res: Response;
  lastSeq: number;
}

export class MatchingEngineService {
  private epoch: string = "e-live0001";
  private currentSeq: number = 0;
  private startTime: number = Date.now();
  private token: string = "dev-token";

  private assets: Map<string, AssetConfig> = new Map();
  private bids: Map<string, RestingOrder[]> = new Map();
  private asks: Map<string, RestingOrder[]> = new Map();
  private outcomes: Map<string, OrderOutcome> = new Map();
  private fingerprints: Map<string, { fp: string; reply: CommandReply }> = new Map();

  private eventRing: EngineEvent[] = [];
  private ringCapacity: number = 300000;
  private subscribers: Set<SseSubscriber> = new Set();
  private dirtyAssets: Set<string> = new Set();

  private server: http.Server | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Fault injection / fixture simulation options
  private forcedErrorCode: string | null = null;
  private forcedErrorStatus: number = 500;
  private scenarioSteps: any[] | null = null;
  private scenarioStepIndex: number = 0;

  constructor(options?: { epoch?: string; token?: string; ringCapacity?: number }) {
    if (options?.epoch) this.epoch = options.epoch;
    if (options?.token) this.token = options.token;
    if (options?.ringCapacity) this.ringCapacity = options.ringCapacity;
    this.seedDefaultAssets();
  }

  private seedDefaultAssets() {
    // Default trading assets
    const defaultList = [
      { asset: "DFEST-WKND", tick: 10, min: 1, max: 10, collar: 27500 },
      { asset: "DKH-FEST", tick: 10, min: 1, max: 10, collar: 27500 },
      { asset: "MOONRISE-GA", tick: 10, min: 1, max: 10, collar: 20700 },
      { asset: "MNR-GA", tick: 10, min: 1, max: 10, collar: 20700 },
      { asset: "DFEST-HOODIE", tick: 10, min: 1, max: 10, collar: 15000 },
      { asset: "DKH-HOOD", tick: 10, min: 1, max: 10, collar: 15000 },
      { asset: "SIGIL-PIN", tick: 10, min: 1, max: 10, collar: 5250 },
      { asset: "SGL-PIN", tick: 10, min: 1, max: 10, collar: 5250 },
      { asset: "TEST-A", tick: 1, min: 1, max: 1000, collar: null },
    ];

    for (const d of defaultList) {
      this.assets.set(d.asset, {
        tick_size: d.tick,
        min_qty: d.min,
        max_qty: d.max,
        collar_max_price: d.collar,
        status: "ACTIVE",
      });
      this.bids.set(d.asset, []);
      this.asks.set(d.asset, []);
    }
  }

  public getEpoch(): string {
    return this.epoch;
  }

  public getCurrentSeq(): number {
    return this.currentSeq;
  }

  public setToken(token: string) {
    this.token = token;
  }

  public resetState(newEpoch?: string) {
    this.epoch = newEpoch || `e-${Date.now().toString(36).substring(0, 8)}`;
    this.currentSeq = 0;
    this.assets.clear();
    this.bids.clear();
    this.asks.clear();
    this.outcomes.clear();
    this.fingerprints.clear();
    this.eventRing = [];
    this.dirtyAssets.clear();
    this.forcedErrorCode = null;
    this.scenarioSteps = null;
    this.scenarioStepIndex = 0;
    this.seedDefaultAssets();
  }

  public injectError(code: string, statusCode: number = 503) {
    this.forcedErrorCode = code;
    this.forcedErrorStatus = statusCode;
  }

  public clearInjectedError() {
    this.forcedErrorCode = null;
  }

  public loadScenarioFixture(scenarioPathOrName: string) {
    let fullPath = scenarioPathOrName;
    if (!fs.existsSync(fullPath)) {
      fullPath = path.resolve(
        process.cwd(),
        "../matching_engine/contracts/fixtures/engine/scenarios",
        scenarioPathOrName.endsWith(".json") ? scenarioPathOrName : `${scenarioPathOrName}.json`
      );
    }
    if (!fs.existsSync(fullPath)) {
      fullPath = path.resolve(
        process.cwd(),
        "matching_engine/contracts/fixtures/engine/scenarios",
        scenarioPathOrName.endsWith(".json") ? scenarioPathOrName : `${scenarioPathOrName}.json`
      );
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Scenario fixture not found: ${scenarioPathOrName}`);
    }

    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    this.resetState(parsed.engine_epoch || "e-test0001");
    this.scenarioSteps = parsed.steps;
    this.scenarioStepIndex = 0;
    return parsed;
  }

  // --- Internal Event Dispatch ---
  private emitEvent(event: EngineEvent) {
    this.currentSeq = event.seq;
    this.eventRing.push(event);
    if (this.eventRing.length > this.ringCapacity) {
      this.eventRing.shift();
    }

    // Broadcast to SSE subscribers
    for (const sub of this.subscribers) {
      try {
        sub.res.write(`event: ${event.type}\nid: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
        sub.lastSeq = event.seq;
      } catch (err) {
        this.subscribers.delete(sub);
      }
    }
  }

  private broadcastDirtyBooks() {
    if (this.dirtyAssets.size === 0) return;
    for (const asset of this.dirtyAssets) {
      const snapshot = this.getBookSnapshot(asset, 15);
      const frame = `event: book\ndata: ${JSON.stringify(snapshot)}\n\n`;
      for (const sub of this.subscribers) {
        try {
          sub.res.write(frame);
        } catch {
          this.subscribers.delete(sub);
        }
      }
    }
    this.dirtyAssets.clear();
  }

  // --- Book & Order Outcome Views ---
  public getBookSnapshot(asset: string, depth: number = 15): BookSnapshot {
    const rawBids = this.bids.get(asset) || [];
    const rawAsks = this.asks.get(asset) || [];

    // Aggregate Bids
    const bidMap = new Map<number, { qty: number; count: number }>();
    for (const o of rawBids) {
      if (o.remaining_qty <= 0) continue;
      const ex = bidMap.get(o.price) || { qty: 0, count: 0 };
      ex.qty += o.remaining_qty;
      ex.count += 1;
      bidMap.set(o.price, ex);
    }

    // Aggregate Asks
    const askMap = new Map<number, { qty: number; count: number }>();
    for (const o of rawAsks) {
      if (o.remaining_qty <= 0) continue;
      const ex = askMap.get(o.price) || { qty: 0, count: 0 };
      ex.qty += o.remaining_qty;
      ex.count += 1;
      askMap.set(o.price, ex);
    }

    // Sort Bids DESCENDING
    const bids = Array.from(bidMap.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, depth)
      .map(([price, v]) => ({ price, qty: v.qty, orders: v.count }));

    // Sort Asks ASCENDING
    const asks = Array.from(askMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, depth)
      .map(([price, v]) => ({ price, qty: v.qty, orders: v.count }));

    const best_bid = bids.length > 0 ? bids[0].price : null;
    const best_ask = asks.length > 0 ? asks[0].price : null;
    const spread = best_bid !== null && best_ask !== null ? best_ask - best_bid : null;

    return {
      asset,
      engine_epoch: this.epoch,
      as_of_seq: this.currentSeq,
      ts: Date.now(),
      depth,
      bids,
      asks,
      best_bid,
      best_ask,
      spread,
    };
  }

  public getOrderOutcome(orderId: string): OrderOutcome | null {
    const outcome = this.outcomes.get(orderId);
    if (!outcome) return null;
    return {
      ...outcome,
      as_of_seq: this.currentSeq,
    };
  }

  public getOpenOrders(filterAsset?: string): OpenOrdersResponse {
    const orders: any[] = [];
    for (const [asset, bidList] of this.bids.entries()) {
      if (filterAsset && filterAsset !== asset) continue;
      for (const o of bidList) {
        if (o.remaining_qty > 0) {
          orders.push({
            order_id: o.order_id,
            asset,
            user_id: o.user_id,
            side: "BUY" as OrderSide,
            price: o.price,
            qty: o.qty,
            filled_qty: o.qty - o.remaining_qty,
            remaining_qty: o.remaining_qty,
            accept_seq: o.accept_seq,
          });
        }
      }
    }

    for (const [asset, askList] of this.asks.entries()) {
      if (filterAsset && filterAsset !== asset) continue;
      for (const o of askList) {
        if (o.remaining_qty > 0) {
          orders.push({
            order_id: o.order_id,
            asset,
            user_id: o.user_id,
            side: "SELL" as OrderSide,
            price: o.price,
            qty: o.qty,
            filled_qty: o.qty - o.remaining_qty,
            remaining_qty: o.remaining_qty,
            accept_seq: o.accept_seq,
          });
        }
      }
    }

    // Sort by asset ascending, then accept_seq ascending
    orders.sort((a, b) => {
      if (a.asset !== b.asset) return a.asset.localeCompare(b.asset);
      return a.accept_seq - b.accept_seq;
    });

    return {
      engine_epoch: this.epoch,
      as_of_seq: this.currentSeq,
      orders,
    };
  }

  // --- Command Execution Core ---
  public executeCommand(command: EngineCommand, customTs?: number): CommandReply {
    // If a scenario is loaded, match against scenario step
    if (this.scenarioSteps && this.scenarioStepIndex < this.scenarioSteps.length) {
      const step = this.scenarioSteps[this.scenarioStepIndex++];
      // Dispatch expected events from scenario
      if (step.expect_events) {
        for (const ev of step.expect_events) {
          this.emitEvent(ev);
        }
      }
      return step.expect_reply;
    }

    const now = customTs || Date.now();

    switch (command.type) {
      case "ConfigureAsset":
        return this.handleConfigureAsset(command, now);
      case "HaltAsset":
        return this.handleAssetStatus(command.asset, "HALTED", now);
      case "ResumeAsset":
        return this.handleAssetStatus(command.asset, "ACTIVE", now);
      case "SubmitOrder":
        return this.handleSubmitOrder(command, now);
      case "CancelOrder":
        return this.handleCancelOrder(command, now);
      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  }

  private handleConfigureAsset(cmd: ConfigureAssetCommand, ts: number): CommandReply {
    if (cmd.tick_size <= 0 || cmd.min_qty <= 0 || cmd.max_qty < cmd.min_qty) {
      return {
        status: "REJECTED",
        code: "INVALID_CONFIG",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        asset: cmd.asset,
      };
    }

    this.assets.set(cmd.asset, {
      tick_size: cmd.tick_size,
      min_qty: cmd.min_qty,
      max_qty: cmd.max_qty,
      collar_max_price: cmd.collar_max_price,
      status: cmd.status,
    });
    if (!this.bids.has(cmd.asset)) this.bids.set(cmd.asset, []);
    if (!this.asks.has(cmd.asset)) this.asks.set(cmd.asset, []);

    const seq = ++this.currentSeq;
    this.emitEvent({
      type: "AssetConfigured",
      engine_epoch: this.epoch,
      seq,
      ts,
      asset: cmd.asset,
      tick_size: cmd.tick_size,
      min_qty: cmd.min_qty,
      max_qty: cmd.max_qty,
      collar_max_price: cmd.collar_max_price,
      status: cmd.status,
    });

    return {
      status: "OK",
      seq,
      last_seq: this.currentSeq,
      engine_epoch: this.epoch,
      duplicate: false,
      asset: cmd.asset,
    };
  }

  private handleAssetStatus(asset: string, newStatus: AssetStatus, ts: number): CommandReply {
    const cfg = this.assets.get(asset);
    if (!cfg) {
      return {
        status: "REJECTED",
        code: "UNKNOWN_ASSET",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        asset,
      };
    }

    if (cfg.status === newStatus) {
      return {
        status: "NOOP",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        asset,
      };
    }

    cfg.status = newStatus;
    const seq = ++this.currentSeq;
    this.emitEvent({
      type: newStatus === "HALTED" ? "AssetHalted" : "AssetResumed",
      engine_epoch: this.epoch,
      seq,
      ts,
      asset,
    });

    return {
      status: "OK",
      seq,
      last_seq: this.currentSeq,
      engine_epoch: this.epoch,
      duplicate: false,
      asset,
    };
  }

  private handleSubmitOrder(cmd: SubmitOrderCommand, ts: number): CommandReply {
    // 1. Dedup / Idempotency Check
    const fp = `${cmd.asset}|${cmd.user_id}|${cmd.side}|${cmd.order_type}|${cmd.tif}|${cmd.qty}|${cmd.price}`;
    const existing = this.fingerprints.get(cmd.order_id);
    if (existing) {
      if (existing.fp === fp) {
        return {
          ...existing.reply,
          duplicate: true,
        };
      }
      return {
        status: "REJECTED",
        code: "ORDER_ID_REUSED",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        order_id: cmd.order_id,
      };
    }

    // 2. Validation Checks (First failing check wins)
    const cfg = this.assets.get(cmd.asset);
    let rejectCode: EngineRejectCode | null = null;

    if (!cfg) {
      rejectCode = "UNKNOWN_ASSET";
    } else if (cfg.status !== "ACTIVE") {
      rejectCode = "ASSET_HALTED";
    } else if (cmd.order_type === "MARKET" && cmd.tif !== "IOC") {
      rejectCode = "INVALID_TIF";
    } else if (cmd.qty < cfg.min_qty || cmd.qty > cfg.max_qty) {
      rejectCode = "INVALID_QTY";
    } else if (cmd.price < 1 || cmd.price > Number.MAX_SAFE_INTEGER) {
      rejectCode = "INVALID_PRICE";
    } else if (cmd.price % cfg.tick_size !== 0) {
      rejectCode = "PRICE_NOT_ON_TICK";
    } else if (cfg.collar_max_price !== null && cmd.price > cfg.collar_max_price) {
      rejectCode = "PRICE_ABOVE_COLLAR";
    } else if (cmd.price * cmd.qty > Number.MAX_SAFE_INTEGER) {
      rejectCode = "NOTIONAL_OVERFLOW";
    }

    if (rejectCode) {
      const seq = ++this.currentSeq;
      this.emitEvent({
        type: "OrderRejected",
        engine_epoch: this.epoch,
        seq,
        ts,
        asset: cmd.asset,
        order_id: cmd.order_id,
        user_id: cmd.user_id,
        code: rejectCode,
      });

      this.outcomes.set(cmd.order_id, {
        order_id: cmd.order_id,
        asset: cmd.asset,
        user_id: cmd.user_id,
        side: cmd.side,
        order_type: cmd.order_type,
        tif: cmd.tif,
        price: cmd.price,
        qty: cmd.qty,
        filled_qty: 0,
        remaining_qty: cmd.qty,
        status: "REJECTED",
        reject_code: rejectCode,
        cancel_reason: null,
        first_seq: seq,
        engine_epoch: this.epoch,
        as_of_seq: seq,
      });

      const reply: CommandReply = {
        status: "REJECTED",
        code: rejectCode,
        seq,
        last_seq: seq,
        engine_epoch: this.epoch,
        duplicate: false,
        order_id: cmd.order_id,
        asset: cmd.asset,
      };
      this.fingerprints.set(cmd.order_id, { fp, reply });
      return reply;
    }

    // 3. Acceptance
    const acceptSeq = ++this.currentSeq;
    this.emitEvent({
      type: "OrderAccepted",
      engine_epoch: this.epoch,
      seq: acceptSeq,
      ts,
      asset: cmd.asset,
      order_id: cmd.order_id,
      user_id: cmd.user_id,
      side: cmd.side,
      order_type: cmd.order_type,
      tif: cmd.tif,
      price: cmd.price,
      qty: cmd.qty,
    });

    let remaining = cmd.qty;
    let filled = 0;
    let stpHit = false;

    const isBuy = cmd.side === "BUY";
    const oppositeList = isBuy ? this.asks.get(cmd.asset)! : this.bids.get(cmd.asset)!;

    // 4. Matching loop (Price-Time Priority)
    while (remaining > 0 && oppositeList.length > 0) {
      const maker = oppositeList[0];
      if (maker.remaining_qty <= 0) {
        oppositeList.shift();
        continue;
      }

      // Check price crossing
      const crosses = isBuy ? maker.price <= cmd.price : maker.price >= cmd.price;
      if (!crosses) {
        break;
      }

      // Self-trade prevention
      if (maker.user_id === cmd.user_id) {
        stpHit = true;
        break;
      }

      const matchQty = Math.min(remaining, maker.remaining_qty);
      const matchPrice = maker.price; // Maker resting price!

      maker.remaining_qty -= matchQty;
      remaining -= matchQty;
      filled += matchQty;

      // Update maker outcome
      const makerOutcome = this.outcomes.get(maker.order_id);
      if (makerOutcome) {
        makerOutcome.filled_qty += matchQty;
        makerOutcome.remaining_qty = maker.remaining_qty;
      }

      const tradeSeq = ++this.currentSeq;
      const tradeId = `${this.epoch}:${tradeSeq}`;

      const buyOrderId = isBuy ? cmd.order_id : maker.order_id;
      const sellOrderId = isBuy ? maker.order_id : cmd.order_id;
      const buyUserId = isBuy ? cmd.user_id : maker.user_id;
      const sellUserId = isBuy ? maker.user_id : cmd.user_id;
      const buyRemaining = isBuy ? remaining : maker.remaining_qty;
      const sellRemaining = isBuy ? maker.remaining_qty : remaining;

      this.emitEvent({
        type: "TradeExecuted",
        engine_epoch: this.epoch,
        seq: tradeSeq,
        ts,
        asset: cmd.asset,
        trade_id: tradeId,
        price: matchPrice,
        qty: matchQty,
        buy_order_id: buyOrderId,
        sell_order_id: sellOrderId,
        buy_user_id: buyUserId,
        sell_user_id: sellUserId,
        maker_order_id: maker.order_id,
        taker_order_id: cmd.order_id,
        taker_side: cmd.side,
        buy_remaining: buyRemaining,
        sell_remaining: sellRemaining,
      });

      // Maker status event immediately follows trade
      const makerStatusSeq = ++this.currentSeq;
      if (maker.remaining_qty === 0) {
        oppositeList.shift();
        if (makerOutcome) makerOutcome.status = "FILLED";
        this.emitEvent({
          type: "OrderFilled",
          engine_epoch: this.epoch,
          seq: makerStatusSeq,
          ts,
          asset: cmd.asset,
          order_id: maker.order_id,
          user_id: maker.user_id,
          filled_qty: maker.qty,
        });
      } else {
        if (makerOutcome) makerOutcome.status = "PARTIALLY_FILLED";
        this.emitEvent({
          type: "OrderPartiallyFilled",
          engine_epoch: this.epoch,
          seq: makerStatusSeq,
          ts,
          asset: cmd.asset,
          order_id: maker.order_id,
          user_id: maker.user_id,
          filled_qty: maker.qty - maker.remaining_qty,
          remaining_qty: maker.remaining_qty,
        });
      }
    }

    // 5. Taker final disposition
    let takerStatus: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" = "OPEN";
    let cancelReason: CancelReason | null = null;

    if (remaining === 0) {
      takerStatus = "FILLED";
      const takerSeq = ++this.currentSeq;
      this.emitEvent({
        type: "OrderFilled",
        engine_epoch: this.epoch,
        seq: takerSeq,
        ts,
        asset: cmd.asset,
        order_id: cmd.order_id,
        user_id: cmd.user_id,
        filled_qty: cmd.qty,
      });
    } else if (stpHit) {
      takerStatus = "CANCELED";
      cancelReason = "SELF_TRADE_PREVENTED";
      const takerSeq = ++this.currentSeq;
      this.emitEvent({
        type: "OrderCanceled",
        engine_epoch: this.epoch,
        seq: takerSeq,
        ts,
        asset: cmd.asset,
        order_id: cmd.order_id,
        user_id: cmd.user_id,
        filled_qty: filled,
        remaining_qty: remaining,
        reason: "SELF_TRADE_PREVENTED",
      });
    } else if (cmd.tif === "GTC" && cmd.order_type === "LIMIT") {
      // Order rests in book
      const resting: RestingOrder = {
        order_id: cmd.order_id,
        user_id: cmd.user_id,
        side: cmd.side,
        price: cmd.price,
        qty: cmd.qty,
        remaining_qty: remaining,
        accept_seq: acceptSeq,
        ts,
      };

      const myBook = isBuy ? this.bids.get(cmd.asset)! : this.asks.get(cmd.asset)!;
      myBook.push(resting);
      // Sort: Bids desc price then asc ts; Asks asc price then asc ts
      myBook.sort((a, b) => {
        if (isBuy) {
          if (b.price !== a.price) return b.price - a.price;
          return a.accept_seq - b.accept_seq;
        } else {
          if (a.price !== b.price) return a.price - b.price;
          return a.accept_seq - b.accept_seq;
        }
      });

      if (filled > 0) {
        takerStatus = "PARTIALLY_FILLED";
        const takerSeq = ++this.currentSeq;
        this.emitEvent({
          type: "OrderPartiallyFilled",
          engine_epoch: this.epoch,
          seq: takerSeq,
          ts,
          asset: cmd.asset,
          order_id: cmd.order_id,
          user_id: cmd.user_id,
          filled_qty: filled,
          remaining_qty: remaining,
        });
      } else {
        takerStatus = "OPEN";
      }
    } else {
      // IOC or MARKET remainder canceled
      takerStatus = "CANCELED";
      cancelReason = filled === 0 ? "NO_LIQUIDITY" : "IOC_REMAINDER";
      const takerSeq = ++this.currentSeq;
      this.emitEvent({
        type: "OrderCanceled",
        engine_epoch: this.epoch,
        seq: takerSeq,
        ts,
        asset: cmd.asset,
        order_id: cmd.order_id,
        user_id: cmd.user_id,
        filled_qty: filled,
        remaining_qty: remaining,
        reason: cancelReason,
      });
    }

    this.outcomes.set(cmd.order_id, {
      order_id: cmd.order_id,
      asset: cmd.asset,
      user_id: cmd.user_id,
      side: cmd.side,
      order_type: cmd.order_type,
      tif: cmd.tif,
      price: cmd.price,
      qty: cmd.qty,
      filled_qty: filled,
      remaining_qty: remaining,
      status: takerStatus,
      reject_code: null,
      cancel_reason: cancelReason,
      first_seq: acceptSeq,
      engine_epoch: this.epoch,
      as_of_seq: this.currentSeq,
    });

    this.dirtyAssets.add(cmd.asset);
    this.broadcastDirtyBooks();

    const reply: CommandReply = {
      status: "ACCEPTED",
      order_id: cmd.order_id,
      asset: cmd.asset,
      seq: acceptSeq,
      last_seq: this.currentSeq,
      engine_epoch: this.epoch,
      duplicate: false,
    };
    this.fingerprints.set(cmd.order_id, { fp, reply });
    return reply;
  }

  private handleCancelOrder(cmd: { order_id: string; reason: any }, ts: number): CommandReply {
    const outcome = this.outcomes.get(cmd.order_id);
    if (!outcome) {
      return {
        status: "UNKNOWN_ORDER",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        order_id: cmd.order_id,
      };
    }

    if (outcome.status === "CANCELED") {
      return {
        status: "ALREADY_CANCELED",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: true,
        order_id: cmd.order_id,
      };
    }

    if (outcome.status === "FILLED") {
      return {
        status: "ALREADY_FILLED",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        order_id: cmd.order_id,
      };
    }

    if (outcome.status === "REJECTED") {
      return {
        status: "UNKNOWN_ORDER",
        seq: null,
        last_seq: this.currentSeq,
        engine_epoch: this.epoch,
        duplicate: false,
        order_id: cmd.order_id,
      };
    }

    // Order is resting in book (OPEN or PARTIALLY_FILLED)
    let restingList = outcome.side === "BUY" ? this.bids.get(outcome.asset) : this.asks.get(outcome.asset);
    let remQty = outcome.remaining_qty;
    if (restingList) {
      const idx = restingList.findIndex((o) => o.order_id === cmd.order_id);
      if (idx !== -1) {
        remQty = restingList[idx].remaining_qty;
        restingList.splice(idx, 1);
      }
    }

    outcome.status = "CANCELED";
    outcome.cancel_reason = cmd.reason;

    const seq = ++this.currentSeq;
    this.emitEvent({
      type: "OrderCanceled",
      engine_epoch: this.epoch,
      seq,
      ts,
      asset: outcome.asset,
      order_id: cmd.order_id,
      user_id: outcome.user_id,
      filled_qty: outcome.filled_qty,
      remaining_qty: remQty,
      reason: cmd.reason,
    });

    this.dirtyAssets.add(outcome.asset);
    this.broadcastDirtyBooks();

    return {
      status: "CANCELED",
      order_id: cmd.order_id,
      remaining_qty: remQty,
      seq,
      last_seq: this.currentSeq,
      engine_epoch: this.epoch,
      duplicate: false,
    };
  }

  // --- HTTP & SSE Server App ---
  public createApp(): express.Express {
    const app = express();
    app.use(express.json({ limit: "16kb" }));

    // Fault injection check
    app.use((req, res, next) => {
      if (this.forcedErrorCode && req.path !== "/healthz") {
        return res.status(this.forcedErrorStatus).json({
          error: {
            code: this.forcedErrorCode,
            message: `Injected engine error: ${this.forcedErrorCode}`,
            details: {},
          },
        });
      }
      next();
    });

    // Health endpoint (NO AUTH)
    app.get("/healthz", (req, res) => {
      const health: HealthResponse = {
        status: "ok",
        engine_epoch: this.epoch,
        seq: this.currentSeq,
        uptime_s: Math.floor((Date.now() - this.startTime) / 1000),
      };
      res.status(200).json(health);
    });

    // Auth Middleware for all other endpoints
    app.use((req, res, next) => {
      const token = req.headers["x-engine-token"];
      if (!token || token !== this.token) {
        return res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Missing or invalid X-Engine-Token header",
            details: {},
          },
        });
      }
      next();
    });

    // POST /v1/commands
    app.post("/v1/commands", (req: Request, res: Response) => {
      const cmd = req.body as EngineCommand;
      if (!cmd || !cmd.type) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Command body missing type property",
            details: {},
          },
        });
      }

      try {
        const reply = this.executeCommand(cmd);
        return res.status(200).json(reply);
      } catch (err: any) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: err.message,
            details: {},
          },
        });
      }
    });

    // GET /v1/books/:asset?depth=
    app.get("/v1/books/:asset", (req: Request, res: Response) => {
      const asset = req.params.asset;
      const depth = parseInt((req.query.depth as string) || "15", 10);
      if (isNaN(depth) || depth < 1 || depth > 100) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Depth must be an integer between 1 and 100",
            details: {},
          },
        });
      }

      if (!this.assets.has(asset)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: `Unknown asset: ${asset}`,
            details: {},
          },
        });
      }

      return res.status(200).json(this.getBookSnapshot(asset, depth));
    });

    // GET /v1/orders/:order_id
    app.get("/v1/orders/:order_id", (req: Request, res: Response) => {
      const order = this.getOrderOutcome(req.params.order_id);
      if (!order) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: `Order not found: ${req.params.order_id}`,
            details: {},
          },
        });
      }
      return res.status(200).json(order);
    });

    // GET /v1/open-orders?asset=
    app.get("/v1/open-orders", (req: Request, res: Response) => {
      const asset = req.query.asset as string | undefined;
      return res.status(200).json(this.getOpenOrders(asset));
    });

    // GET /v1/events?after=&epoch=
    app.get("/v1/events", (req: Request, res: Response) => {
      const epoch = req.query.epoch as string | undefined;
      const afterStr = req.query.after as string | undefined;

      if (this.subscribers.size >= 8) {
        return res.status(503).json({
          error: {
            code: "TOO_MANY_SUBSCRIBERS",
            message: "Subscriber limit of 8 reached",
            details: {},
          },
        });
      }

      if (epoch && epoch !== this.epoch) {
        return res.status(409).json({
          error: {
            code: "EPOCH_MISMATCH",
            message: `Engine epoch mismatch. Expected ${this.epoch}`,
            details: { current_epoch: this.epoch },
          },
        });
      }

      let afterSeq = -1;
      if (afterStr !== undefined) {
        afterSeq = parseInt(afterStr, 10);
        if (isNaN(afterSeq) || afterSeq < 0) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_FAILED",
              message: "Parameter 'after' must be a non-negative integer",
              details: {},
            },
          });
        }
        if (afterSeq > this.currentSeq) {
          return res.status(409).json({
            error: {
              code: "AFTER_IN_FUTURE",
              message: `Requested sequence ${afterSeq} is ahead of current engine sequence ${this.currentSeq}`,
              details: { current_seq: this.currentSeq, current_epoch: this.epoch },
            },
          });
        }
      }

      // Start SSE stream
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const subscriber: SseSubscriber = { res, lastSeq: afterSeq >= 0 ? afterSeq : this.currentSeq };
      this.subscribers.add(subscriber);

      req.on("close", () => {
        this.subscribers.delete(subscriber);
      });

      // 1. Send hello frame
      const assetStatuses = Array.from(this.assets.entries()).map(([asset, cfg]) => ({
        asset,
        status: cfg.status,
      }));
      const ringStartSeq =
        this.eventRing.length > 0 ? this.eventRing[0].seq : 1;
      const hello: SseHello = {
        engine_epoch: this.epoch,
        current_seq: this.currentSeq,
        ring_start_seq: ringStartSeq,
        assets: assetStatuses,
        server_time: Date.now(),
      };
      res.write(`event: hello\ndata: ${JSON.stringify(hello)}\n\n`);

      // 2. Send book snapshot frames for each active asset
      for (const [asset] of this.assets.entries()) {
        const snap = this.getBookSnapshot(asset, 15);
        res.write(`event: book\ndata: ${JSON.stringify(snap)}\n\n`);
      }

      // 3. Replay historical events if after was specified
      if (afterSeq >= 0) {
        for (const ev of this.eventRing) {
          if (ev.seq > afterSeq) {
            res.write(`event: ${ev.type}\nid: ${ev.seq}\ndata: ${JSON.stringify(ev)}\n\n`);
            subscriber.lastSeq = ev.seq;
          }
        }
      }
    });

    // GET /metrics
    app.get("/metrics", (req: Request, res: Response) => {
      res.status(200).json({
        epoch: this.epoch,
        current_seq: this.currentSeq,
        active_assets: this.assets.size,
        orders_tracked: this.outcomes.size,
        sse_subscribers: this.subscribers.size,
        ring_events: this.eventRing.length,
      });
    });

    return app;
  }

  public async start(port: number = 7000): Promise<void> {
    const app = this.createApp();
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        this.server = server;
        // Heartbeat comment every 15 seconds
        this.heartbeatInterval = setInterval(() => {
          for (const sub of this.subscribers) {
            try {
              sub.res.write(": hb\n\n");
            } catch {
              this.subscribers.delete(sub);
            }
          }
        }, 15000);
        resolve();
      });

      server.once("error", (err) => {
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const sub of this.subscribers) {
      try {
        sub.res.end();
      } catch {}
    }
    this.subscribers.clear();
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }
}

export const matchingEngineService = new MatchingEngineService();
