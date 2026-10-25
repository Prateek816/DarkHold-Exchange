import type {
  Asset,
  BookSnapshot,
  TradeTick,
  Candle,
  Order,
  WalletBalance,
  DutchAuction,
  ReconciliationRing,
  MLRiskAccount,
  TransactionReceipt,
} from "@/lib/types";
import { MOCK_ASSETS } from "./fixtures/assets";
import { generateMockBookSnapshot } from "./fixtures/orderBook";
import { generateMockTrades } from "./fixtures/trades";
import { generateSeededCandles } from "./fixtures/candles";
import { MOCK_ORDERS } from "./fixtures/orders";
import { MOCK_WALLET } from "./fixtures/wallet";
import { MOCK_AUCTIONS } from "./fixtures/auctions";
import { MOCK_RECONCILIATION_RINGS } from "./fixtures/reconciliation";
import { MOCK_ML_RISK_SCORES } from "./fixtures/mlScores";
import type { ApiErrorPayload, ErrorCode } from "@/lib/errors";

type MockResult<T> = {
  status: number;
  data?: T;
  error?: ApiErrorPayload;
};

type MockEvent = {
  event: string;
  data: Record<string, unknown>;
};

type OrderRequest = {
  idempotencyKey: string;
  assetId: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: number;
  qty: number;
};

type AuctionRequest = {
  idempotencyKey: string;
  assetId: string;
  qty: number;
  startPrice: number;
  floorPrice: number;
  stepSeconds: number;
  durationMinutes: number;
};

type FillBasis = {
  balanceBefore: number;
  balanceAfter: number;
  totalCost: number;
  matchedQty: number;
  matchedAt: number;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const requestId = () => `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// In-memory mock authority. It is intentionally a single store so orders,
// reservations, receipts and auctions cannot drift from each other.
class FakeServerStore {
  public assets: Asset[] = clone(MOCK_ASSETS);
  public orders: Order[] = clone(MOCK_ORDERS);
  public wallet: WalletBalance = clone(MOCK_WALLET);
  public auctions: DutchAuction[] = clone(MOCK_AUCTIONS);
  public rings: ReconciliationRing[] = clone(MOCK_RECONCILIATION_RINGS);
  public mlScores: MLRiskAccount[] = clone(MOCK_ML_RISK_SCORES);
  public receipts: TransactionReceipt[] = this.buildReceiptFixtures();

  private seq = 100_000;
  private submissionKeys = new Map<string, { fingerprint: string; orderId: string }>();
  private auctionKeys = new Map<string, { fingerprint: string; auctionId: string }>();
  private tradesByAsset = new Map<string, TradeTick[]>();
  private candleStore = new Map<string, Candle[]>();
  private pendingSettlements = new Map<string, number>();
  private fillBasis = new Map<string, FillBasis>();
  private settledOrders = new Set<string>();

  // ---------------------------------------------------------------- reads

  public getAssets(): Asset[] {
    return clone(this.assets);
  }

  public getAsset(id: string): Asset | undefined {
    const asset = this.assets.find((item) => item.id === id);
    return asset ? clone(asset) : undefined;
  }

  public getBook(assetId: string): BookSnapshot {
    this.seq += 1;
    const asset = this.assets.find((item) => item.id === assetId);
    const snapshot = generateMockBookSnapshot(
      assetId,
      this.seq,
      undefined,
      asset?.last_price
    );

    if (asset) {
      asset.best_bid = snapshot.bids[0]?.price ?? asset.best_bid;
      asset.best_ask = snapshot.asks[0]?.price ?? asset.best_ask;
      asset.available_ask_qty = snapshot.asks.reduce((sum, level) => sum + level.qty, 0);
    }

    return clone(snapshot);
  }

  public getTrades(assetId: string): TradeTick[] {
    if (!this.tradesByAsset.has(assetId)) {
      this.tradesByAsset.set(assetId, generateMockTrades(assetId, 30));
    }
    return clone(this.tradesByAsset.get(assetId) ?? []);
  }

  public getCandles(assetId: string, interval: "5s" | "1m" = "1m"): Candle[] {
    return clone(this.getCandlesInternal(assetId, interval));
  }

  public getWallet(): WalletBalance {
    this.settleDue();
    return clone(this.wallet);
  }

  public getOrders(): Order[] {
    this.settleDue();
    return clone(
      [...this.orders].sort((a, b) => b.created_at - a.created_at)
    );
  }

  public getAuctions(): DutchAuction[] {
    this.auctions.forEach((auction) => this.refreshAuction(auction));
    return clone(
      [...this.auctions].sort((a, b) => b.start_time - a.start_time)
    );
  }

  public getAuction(id: string): DutchAuction | undefined {
    const auction = this.auctions.find((item) => item.auction_id === id);
    if (!auction) return undefined;
    this.refreshAuction(auction);
    return clone(auction);
  }

  public getReconciliationRings(): ReconciliationRing[] {
    return clone(this.rings);
  }

  public getMlScores(): MLRiskAccount[] {
    return clone(this.mlScores);
  }

  public getReceipts(): TransactionReceipt[] {
    this.settleDue();
    return clone(
      [...this.receipts].sort((a, b) => b.settled_at - a.settled_at)
    );
  }

  // ------------------------------------------------------------ simulator

  /**
   * Produces a simulated trade print and updates every dependent candle.
   * Called by the fake WebSocket only. There is no print without this call.
   */
  public simulateTrade(assetId: string): {
    tick: TradeTick;
    candles: Array<{ interval: "5s" | "1m"; candle: Candle }>;
  } | null {
    const asset = this.assets.find((item) => item.id === assetId);
    if (!asset || asset.is_halted) return null;

    const book = this.getBook(assetId);
    const isBuy = Math.random() > 0.48;
    const levels = isBuy ? book.asks : book.bids;
    const touch = levels[0]?.price ?? asset.last_price;
    const offset = (Math.floor(Math.random() * 3) - 1) * 25;
    const price = Math.max(1, Math.min(touch + offset, asset.ceiling_price));
    const qty = Math.floor(Math.random() * 3) + 1;
    const ts = Date.now();

    this.seq += 1;
    const tick: TradeTick = {
      seq: this.seq,
      trade_id: `TRD-SIM-${this.seq}`,
      asset_id: assetId,
      price,
      qty,
      aggressor_side: isBuy ? "BUY" : "SELL",
      is_sim: true,
      timestamp: ts,
    };

    this.recordTrade(tick);
    const candles = this.applyTickToCandles(tick);
    return { tick, candles };
  }

  public setHalted(assetId: string, halted: boolean) {
    const asset = this.assets.find((item) => item.id === assetId);
    if (asset) asset.is_halted = halted;
  }

  public isHalted(assetId: string): boolean {
    return Boolean(this.assets.find((item) => item.id === assetId)?.is_halted);
  }

  /** Move one unit of the first resting buy order through a partial fill. */
  public triggerPartialFill(): MockEvent[] {
    const order = this.orders.find(
      (item) =>
        item.side === "BUY" &&
        (item.status === "OPEN" || item.status === "PARTIALLY_FILLED") &&
        item.remaining_qty > 0
    );
    if (!order) return [];

    const asset = this.assets.find((item) => item.id === order.asset_id);
    if (!asset) return [];

    const qty = 1;
    const price = order.price > 0 ? order.price : asset.last_price;
    const cost = price * qty;

    this.wallet.reserved_credits = Math.max(0, this.wallet.reserved_credits - cost);
    this.wallet.total_credits -= cost;

    const holding = this.wallet.holdings.find((item) => item.asset_id === order.asset_id);
    if (holding) {
      const previousQty = holding.total_units;
      holding.total_units += qty;
      holding.available_units += qty;
      holding.avg_cost = Math.round(
        (holding.avg_cost * previousQty + price * qty) / Math.max(1, holding.total_units)
      );
      holding.current_price = asset.last_price;
    } else {
      this.wallet.holdings.push({
        asset_id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        available_units: qty,
        reserved_units: 0,
        total_units: qty,
        avg_cost: price,
        current_price: asset.last_price,
      });
    }

    order.matched_qty += qty;
    order.remaining_qty -= qty;
    order.status = order.remaining_qty === 0 ? "FILLED" : "PARTIALLY_FILLED";
    order.average_price = price;
    order.updated_at = Date.now();

    const ts = Date.now();
    this.seq += 1;
    const tick: TradeTick = {
      seq: this.seq,
      trade_id: `TRD-FILL-${this.seq}`,
      asset_id: order.asset_id,
      price,
      qty,
      aggressor_side: order.side,
      is_sim: true,
      timestamp: ts,
    };
    this.recordTrade(tick);
    const candles = this.applyTickToCandles(tick);
    this.markForSettlement(order, {
      balanceBefore: this.wallet.total_credits + cost,
      balanceAfter: this.wallet.total_credits,
      totalCost: cost,
      matchedQty: qty,
      matchedAt: ts,
    });

    return [
      {
        event: "order_update",
        data: {
          order_id: order.order_id,
          status: order.status,
          matched_qty: order.matched_qty,
          remaining_qty: order.remaining_qty,
          average_price: order.average_price,
          settlement_status: order.settlement_status,
          updated_at: order.updated_at,
        },
      },
      ...candles.map(({ interval, candle }) => ({
        event: `candle_update:${order.asset_id}:${interval}`,
        data: candle as unknown as Record<string, unknown>,
      })),
    ];
  }

  public settleDue(): MockEvent[] {
    const now = Date.now();
    const events: MockEvent[] = [];

    this.pendingSettlements.forEach((settleAt, orderId) => {
      if (settleAt > now) return;
      const order = this.orders.find((item) => item.order_id === orderId);
      this.pendingSettlements.delete(orderId);

      if (!order || order.settlement_status === "COMPLETED") return;
      const basis = this.fillBasis.get(orderId);
      if (!basis || basis.matchedQty <= 0) return;

      order.settlement_status = "COMPLETED";
      order.updated_at = now;

      if (!this.settledOrders.has(orderId)) {
        this.settledOrders.add(orderId);
        const asset = this.assets.find((item) => item.id === order.asset_id);
        const receipt: TransactionReceipt = {
          trade_id: `TRD-${orderId.replace(/^ORD-/, "")}`,
          ledger_tx_id: `LTX-${Date.now().toString(36).toUpperCase()}-${Math.floor(
            Math.random() * 900 + 100
          )}`,
          asset_id: order.asset_id,
          asset_name: asset?.name ?? order.asset_id,
          side: order.side,
          qty: basis.matchedQty,
          price: Math.round(basis.totalCost / Math.max(1, basis.matchedQty)),
          total_cost: basis.totalCost,
          counterparty_id: "sim_liquidity_engine",
          counterparty_is_sim: true,
          matched_at: basis.matchedAt,
          settled_at: now,
          balance_before: basis.balanceBefore,
          balance_after: basis.balanceAfter,
          settlement_status: "COMPLETED",
        };
        this.receipts.unshift(receipt);
      }

      events.push({
        event: "order_settled",
        data: {
          order_id: order.order_id,
          settlement_status: order.settlement_status,
          updated_at: order.updated_at,
        },
      });
      events.push({
        event: "settlement_completed",
        data: {
          order_id: order.order_id,
          settlement_status: "COMPLETED",
          ledger_tx_id: this.receipts[0]?.ledger_tx_id ?? "LTX-UNKNOWN",
        },
      });
    });

    return events;
  }

  public forceSettlement(): MockEvent[] {
    this.pendingSettlements.forEach((_value, key) => {
      this.pendingSettlements.set(key, 0);
    });
    return this.settleDue();
  }

  public getPendingSettlementCount(): number {
    return this.pendingSettlements.size;
  }

  // ---------------------------------------------------------------- orders

  public submitOrder(params: OrderRequest): MockResult<Order> {
    const id = requestId();
    const fingerprint = JSON.stringify(params);

    const existing = this.submissionKeys.get(params.idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return this.fail(id, "IDEMPOTENCY_CONFLICT");
      }
      const order = this.orders.find((item) => item.order_id === existing.orderId);
      return order ? { status: 202, data: clone(order) } : this.fail(id, "INTERNAL_ERROR");
    }

    const asset = this.assets.find((item) => item.id === params.assetId);
    if (!asset) return this.fail(id, "VALIDATION_FAILED", undefined, "Unknown asset.");

    if (asset.is_halted) return this.fail(id, "ASSET_NOT_TRADABLE");
    if (!Number.isInteger(params.qty) || params.qty < 1) {
      return this.fail(id, "VALIDATION_FAILED", undefined, "Quantity must be a whole number.");
    }
    if (params.type === "LIMIT" && (!Number.isInteger(params.price) || params.price < 1)) {
      return this.fail(id, "VALIDATION_FAILED", undefined, "Limit price must be positive.");
    }
    if (params.type === "LIMIT" && params.price > asset.ceiling_price) {
      return this.fail(id, "PRICE_ABOVE_CEILING", {
        ceiling: asset.ceiling_price,
        face: asset.face_value,
        pct: asset.ceiling_pct,
      });
    }

    const reservePrice =
      params.type === "LIMIT" ? params.price : asset.ceiling_price;
    const estimate = reservePrice * params.qty;

    if (params.side === "BUY" && this.wallet.available_credits < estimate) {
      return this.fail(id, "INSUFFICIENT_FUNDS", {
        needed: estimate,
        available: this.wallet.available_credits,
      });
    }

    const holding = this.wallet.holdings.find((item) => item.asset_id === params.assetId);
    if (params.side === "SELL" && (!holding || holding.available_units < params.qty)) {
      return this.fail(id, "INSUFFICIENT_HOLDINGS", {
        available: holding?.available_units ?? 0,
      });
    }

    // Work out executable quantity before reserving anything. A market order
    // with no eligible liquidity is rejected without touching the wallet.
    const book = this.getBook(asset.id);
    const levels = params.side === "BUY" ? book.asks : book.bids;
    const eligibleLevels = levels.filter((level) => {
      if (params.side === "BUY" && level.price > asset.ceiling_price) return false;
      if (params.type === "MARKET") return true;
      return params.side === "BUY" ? level.price <= params.price : level.price >= params.price;
    });

    if (params.type === "MARKET" && eligibleLevels.length === 0) {
      return this.fail(id, "NO_LIQUIDITY");
    }

    // Reserve exactly what the accepted ticket requires, before it can rest.
    if (params.side === "BUY") {
      this.wallet.available_credits -= estimate;
      this.wallet.reserved_credits += estimate;
    } else if (holding) {
      holding.available_units -= params.qty;
      holding.reserved_units += params.qty;
    }

    const now = Date.now();
    const order: Order = {
      order_id: `ORD-${now.toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      idempotency_key: params.idempotencyKey,
      asset_id: params.assetId,
      side: params.side,
      type: params.type,
      price: params.type === "LIMIT" ? params.price : 0,
      qty: params.qty,
      matched_qty: 0,
      remaining_qty: params.qty,
      status: "OPEN",
      settlement_status: "PENDING",
      created_at: now,
      updated_at: now,
    };

    let remainingToFill = params.qty;
    let matchedCost = 0;
    let matchedQty = 0;

    for (const level of eligibleLevels) {
      if (remainingToFill <= 0) break;
      const take = Math.min(remainingToFill, level.qty);
      remainingToFill -= take;
      matchedQty += take;
      matchedCost += take * level.price;
      if (params.type === "MARKET") break;
    }

    order.matched_qty = matchedQty;
    order.remaining_qty = params.qty - matchedQty;
    order.average_price = matchedQty > 0 ? Math.round(matchedCost / matchedQty) : undefined;

    if (matchedQty > 0) {
      if (params.side === "BUY") {
        const reservedForMatched = reservePrice * matchedQty;
        this.wallet.reserved_credits -= reservedForMatched;
        this.wallet.total_credits -= matchedCost;
        this.wallet.available_credits += reservedForMatched - matchedCost;
        this.addUnitsToHolding(asset, matchedQty, order.average_price ?? reservePrice);
        this.markForSettlement(order, {
          balanceBefore: this.wallet.total_credits + matchedCost,
          balanceAfter: this.wallet.total_credits,
          totalCost: matchedCost,
          matchedQty,
          matchedAt: now,
        });
      } else if (holding) {
        holding.reserved_units -= matchedQty;
        holding.total_units -= matchedQty;
        this.wallet.available_credits += matchedCost;
        this.wallet.total_credits += matchedCost;
        this.markForSettlement(order, {
          balanceBefore: this.wallet.total_credits - matchedCost,
          balanceAfter: this.wallet.total_credits,
          totalCost: matchedCost,
          matchedQty,
          matchedAt: now,
        });
      }

      asset.last_price = order.average_price ?? asset.last_price;
      asset.last_price_timestamp = now;
      const ts = Date.now();
      this.seq += 1;
      this.recordTrade({
        seq: this.seq,
        trade_id: `TRD-USER-${this.seq}`,
        asset_id: asset.id,
        price: order.average_price ?? asset.last_price,
        qty: matchedQty,
        aggressor_side: params.side,
        is_sim: true,
        timestamp: ts,
      });
      this.applyTickToCandles({
        seq: this.seq,
        trade_id: `TRD-USER-${this.seq}`,
        asset_id: asset.id,
        price: order.average_price ?? asset.last_price,
        qty: matchedQty,
        aggressor_side: params.side,
        is_sim: true,
        timestamp: ts,
      });
    }

    if (order.remaining_qty === 0) {
      order.status = "FILLED";
    } else if (params.type === "MARKET") {
      // Market orders cannot rest. Release the unfilled reservation and leave
      // the partially executed order in history with an explicit reason.
      order.status = "CANCELED";
      order.reject_reason = "Unfilled remainder canceled: no further eligible liquidity.";
      order.settlement_status = matchedQty > 0 ? "PENDING" : "COMPLETED";
      if (params.side === "BUY") {
        const release = reservePrice * order.remaining_qty;
        this.wallet.reserved_credits -= release;
        this.wallet.available_credits += release;
      } else if (holding) {
        holding.reserved_units -= order.remaining_qty;
        holding.available_units += order.remaining_qty;
      }
    } else {
      order.status = matchedQty > 0 ? "PARTIALLY_FILLED" : "OPEN";
    }

    this.orders.unshift(order);
    this.submissionKeys.set(params.idempotencyKey, {
      fingerprint,
      orderId: order.order_id,
    });

    return { status: 202, data: clone(order) };
  }

  public cancelOrder(orderId: string): MockResult<Order> {
    const id = requestId();
    const order = this.orders.find((item) => item.order_id === orderId);
    if (!order) return this.fail(id, "VALIDATION_FAILED", undefined, "Unknown order.");

    if (order.status === "FILLED" || order.status === "CANCELED" || order.status === "REJECTED") {
      return this.fail(id, "ORDER_NOT_CANCELABLE");
    }

    order.status = "CANCELED";
    order.updated_at = Date.now();

    if (order.side === "BUY") {
      const refundPrice = order.price > 0 ? order.price : this.assetPrice(order.asset_id);
      const refund = refundPrice * order.remaining_qty;
      this.wallet.reserved_credits = Math.max(0, this.wallet.reserved_credits - refund);
      this.wallet.available_credits += refund;
    } else {
      const holding = this.wallet.holdings.find((item) => item.asset_id === order.asset_id);
      if (holding) {
        holding.reserved_units = Math.max(0, holding.reserved_units - order.remaining_qty);
        holding.available_units += order.remaining_qty;
      }
    }

    order.remaining_qty = 0;
    if (order.matched_qty === 0) order.settlement_status = "COMPLETED";

    return { status: 200, data: clone(order) };
  }

  // --------------------------------------------------------------- auctions

  public createAuction(params: AuctionRequest): MockResult<DutchAuction> {
    const id = requestId();
    const fingerprint = JSON.stringify(params);

    const existing = this.auctionKeys.get(params.idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return this.fail(id, "IDEMPOTENCY_CONFLICT");
      const auction = this.auctions.find((item) => item.auction_id === existing.auctionId);
      return auction ? { status: 201, data: clone(auction) } : this.fail(id, "INTERNAL_ERROR");
    }

    const asset = this.assets.find((item) => item.id === params.assetId);
    const holding = this.wallet.holdings.find((item) => item.asset_id === params.assetId);
    if (!asset || !holding) {
      return this.fail(id, "VALIDATION_FAILED", undefined, "You do not hold this asset.");
    }
    if (!Number.isInteger(params.qty) || params.qty < 1 || params.qty > holding.available_units) {
      return this.fail(
        id,
        "VALIDATION_FAILED",
        { available: holding.available_units },
        "Auction quantity exceeds available units."
      );
    }
    if (params.startPrice > asset.ceiling_price) {
      return this.fail(id, "PRICE_ABOVE_CEILING", {
        ceiling: asset.ceiling_price,
        face: asset.face_value,
        pct: asset.ceiling_pct,
      });
    }
    if (params.floorPrice < 1 || params.floorPrice > params.startPrice) {
      return this.fail(
        id,
        "VALIDATION_FAILED",
        undefined,
        "Floor price must be positive and no higher than the start price."
      );
    }

    holding.available_units -= params.qty;
    holding.reserved_units += params.qty;

    const now = Date.now();
    const auction: DutchAuction = {
      auction_id: `AUC-${now.toString(36).toUpperCase()}`,
      asset_id: asset.id,
      asset_name: `${asset.name} — demo lot`,
      seller_id: "trader_01",
      is_sim_seller: false,
      qty: params.qty,
      start_price: params.startPrice,
      floor_price: params.floorPrice,
      ceiling_price: asset.ceiling_price,
      current_price: params.startPrice,
      start_time: now,
      end_time: now + params.durationMinutes * 60_000,
      step_seconds: params.stepSeconds,
      price_decrement: Math.max(1, Math.round((params.startPrice - params.floorPrice) / 40)),
      next_step_in_seconds: params.stepSeconds,
      status: "ACTIVE",
    };

    this.auctions.unshift(auction);
    this.auctionKeys.set(params.idempotencyKey, {
      fingerprint,
      auctionId: auction.auction_id,
    });

    return { status: 201, data: clone(auction) };
  }

  public acceptAuction(
    auctionId: string,
    expectedPrice?: number
  ): MockResult<TransactionReceipt> {
    const id = requestId();
    const auction = this.auctions.find((item) => item.auction_id === auctionId);
    if (!auction) return this.fail(id, "VALIDATION_FAILED", undefined, "Unknown auction.");
    this.refreshAuction(auction);

    if (auction.status === "SOLD") return this.fail(id, "AUCTION_ALREADY_SOLD");
    if (auction.status !== "ACTIVE") return this.fail(id, "AUCTION_NOT_ACTIVE");
    if (auction.seller_id === "trader_01") {
      return this.fail(
        id,
        "VALIDATION_FAILED",
        undefined,
        "You cannot accept your own auction in this demo."
      );
    }
    if (expectedPrice !== undefined && auction.current_price !== expectedPrice) {
      return this.fail(id, "PRICE_MOVED", { current_price: auction.current_price });
    }

    const totalCost = auction.current_price * auction.qty;
    if (this.wallet.available_credits < totalCost) {
      return this.fail(id, "INSUFFICIENT_FUNDS", {
        needed: totalCost,
        available: this.wallet.available_credits,
      });
    }

    const asset = this.assets.find((item) => item.id === auction.asset_id);
    if (!asset) return this.fail(id, "INTERNAL_ERROR");
    if (asset.is_halted) return this.fail(id, "ASSET_NOT_TRADABLE");

    const now = Date.now();
    this.wallet.available_credits -= totalCost;
    this.wallet.total_credits -= totalCost;
    this.addUnitsToHolding(asset, auction.qty, auction.current_price);

    auction.status = "SOLD";
    auction.winning_buyer_id = "trader_01";
    auction.next_step_in_seconds = 0;
    asset.last_price = auction.current_price;
    asset.last_price_timestamp = now;
    asset.has_active_auction = this.auctions.some(
      (item) => item.asset_id === asset.id && item.status === "ACTIVE"
    );

    const receipt: TransactionReceipt = {
      trade_id: `TRD-${auction.auction_id}`,
      ledger_tx_id: `LTX-${now.toString(36).toUpperCase()}-${Math.floor(
        Math.random() * 900 + 100
      )}`,
      asset_id: auction.asset_id,
      asset_name: auction.asset_name,
      side: "BUY",
      qty: auction.qty,
      price: auction.current_price,
      total_cost: totalCost,
      counterparty_id: auction.seller_id,
      counterparty_is_sim: auction.is_sim_seller,
      matched_at: now,
      settled_at: now,
      balance_before: this.wallet.total_credits + totalCost,
      balance_after: this.wallet.total_credits,
      settlement_status: "COMPLETED",
    };
    this.receipts.unshift(receipt);

    this.seq += 1;
    this.recordTrade({
      seq: this.seq,
      trade_id: `TRD-AUC-${this.seq}`,
      asset_id: auction.asset_id,
      price: auction.current_price,
      qty: auction.qty,
      aggressor_side: "BUY",
      is_sim: true,
      timestamp: now,
    });
    this.applyTickToCandles({
      seq: this.seq,
      trade_id: `TRD-AUC-${this.seq}`,
      asset_id: auction.asset_id,
      price: auction.current_price,
      qty: auction.qty,
      aggressor_side: "BUY",
      is_sim: true,
      timestamp: now,
    });

    return { status: 200, data: clone(receipt) };
  }

  // --------------------------------------------------------------- internals

  private fail(
    requestIdValue: string,
    code: ErrorCode,
    context?: ApiErrorPayload["context"],
    message?: string
  ): MockResult<never> {
    return {
      status: 400,
      error: {
        code,
        message,
        context,
        requestId: requestIdValue,
      },
    };
  }

  private refreshAuction(auction: DutchAuction) {
    if (auction.status !== "ACTIVE") return;
    const now = Date.now();

    if (now >= auction.end_time) {
      auction.current_price = auction.floor_price;
      auction.next_step_in_seconds = 0;
      auction.status = "EXPIRED";
      return;
    }

    if (now < auction.start_time) {
      auction.current_price = auction.start_price;
      auction.next_step_in_seconds = Math.ceil((auction.start_time - now) / 1000);
      return;
    }

    const stepMs = Math.max(1, auction.step_seconds) * 1000;
    const elapsedMs = now - auction.start_time;
    const steps = Math.floor(elapsedMs / stepMs);
    auction.current_price = Math.max(
      auction.floor_price,
      auction.start_price - steps * auction.price_decrement
    );
    auction.next_step_in_seconds =
      auction.current_price <= auction.floor_price
        ? 0
        : Math.max(1, auction.step_seconds - Math.floor((elapsedMs % stepMs) / 1000));
  }

  private getCandlesInternal(assetId: string, interval: "5s" | "1m"): Candle[] {
    const key = `${assetId}:${interval}`;
    if (!this.candleStore.has(key)) {
      this.candleStore.set(key, generateSeededCandles(assetId, interval, 60));
    }
    return this.candleStore.get(key) ?? [];
  }

  private applyTickToCandles(tick: TradeTick): Array<{
    interval: "5s" | "1m";
    candle: Candle;
  }> {
    return (["5s", "1m"] as const).map((interval) => {
      const stepMs = interval === "5s" ? 5000 : 60_000;
      const bucketMs = Math.floor(tick.timestamp / stepMs) * stepMs;
      const candles = this.getCandlesInternal(tick.asset_id, interval);
      const openTimeSec = Math.floor(bucketMs / 1000);
      const last = candles[candles.length - 1];

      let candle: Candle;
      if (last && last.open_time === openTimeSec) {
        last.high = Math.max(last.high, tick.price);
        last.low = Math.min(last.low, tick.price);
        last.close = tick.price;
        last.volume += tick.qty;
        last.close_time = Math.floor((bucketMs + stepMs) / 1000);
        last.origin = "ENGINE";
        candle = { ...last };
      } else {
        candle = {
          open_time: openTimeSec,
          close_time: Math.floor((bucketMs + stepMs) / 1000),
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.qty,
          interval,
          origin: "ENGINE",
        };
        candles.push(candle);
        if (candles.length > 120) candles.shift();
      }

      return { interval, candle: { ...candle } };
    });
  }

  private recordTrade(tick: TradeTick) {
    const existing = this.tradesByAsset.get(tick.asset_id) ?? [];
    if (existing.some((item) => item.seq === tick.seq)) return;
    this.tradesByAsset.set(tick.asset_id, [tick, ...existing].slice(0, 120));

    const asset = this.assets.find((item) => item.id === tick.asset_id);
    if (asset) {
      asset.last_price = tick.price;
      asset.last_price_timestamp = tick.timestamp;
      asset.volume_24h += tick.qty;
      asset.sparkline_1h = [...asset.sparkline_1h.slice(-19), tick.price];
    }
  }

  private addUnitsToHolding(asset: Asset, qty: number, price: number) {
    const holding = this.wallet.holdings.find((item) => item.asset_id === asset.id);
    if (holding) {
      const priorUnits = holding.total_units;
      holding.total_units += qty;
      holding.available_units += qty;
      holding.avg_cost = Math.round(
        (holding.avg_cost * priorUnits + price * qty) / Math.max(1, holding.total_units)
      );
      holding.current_price = asset.last_price;
    } else {
      this.wallet.holdings.push({
        asset_id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        available_units: qty,
        reserved_units: 0,
        total_units: qty,
        avg_cost: price,
        current_price: asset.last_price,
      });
    }
  }

  private markForSettlement(order: Order, basis: FillBasis) {
    order.settlement_status = "PENDING";
    this.fillBasis.set(order.order_id, basis);
    this.pendingSettlements.set(order.order_id, Date.now() + 2500);
  }

  private assetPrice(assetId: string): number {
    return this.assets.find((item) => item.id === assetId)?.last_price ?? 0;
  }

  private buildReceiptFixtures(): TransactionReceipt[] {
    const now = Date.now();
    return [
      {
        trade_id: "TRD-4890",
        ledger_tx_id: "LTX-8739104",
        asset_id: "MOONRISE-GA-2026",
        asset_name: "Moonrise GA Pass",
        side: "SELL",
        qty: 1,
        price: 19500,
        total_cost: 19500,
        counterparty_id: "sim_market_maker",
        counterparty_is_sim: true,
        matched_at: now - 14_400_000,
        settled_at: now - 14_390_000,
        balance_before: 371500,
        balance_after: 391000,
        settlement_status: "COMPLETED",
      },
      {
        trade_id: "TRD-4301",
        ledger_tx_id: "LTX-7300168",
        asset_id: "DARKHOLD-HOODIE-LTD",
        asset_name: "Darkhold Hoodie Limited",
        side: "BUY",
        qty: 1,
        price: 13000,
        total_cost: 13000,
        counterparty_id: "sim_merch_desk",
        counterparty_is_sim: true,
        matched_at: now - 86_000_000,
        settled_at: now - 85_995_000,
        balance_before: 384500,
        balance_after: 371500,
        settlement_status: "COMPLETED",
      },
      {
        trade_id: "TRD-3894",
        ledger_tx_id: "LTX-6184420",
        asset_id: "DARKHOLD-PASS-2026",
        asset_name: "Darkhold Fest Weekend Pass",
        side: "BUY",
        qty: 3,
        price: 26500,
        total_cost: 79500,
        counterparty_id: "sim_curator_bot",
        counterparty_is_sim: true,
        matched_at: now - 172_000_000,
        settled_at: now - 171_995_000,
        balance_before: 464000,
        balance_after: 384500,
        settlement_status: "COMPLETED",
      },
      {
        trade_id: "TRD-3107",
        ledger_tx_id: "LTX-5027731",
        asset_id: "MOONRISE-GA-2026",
        asset_name: "Moonrise GA Pass",
        side: "BUY",
        qty: 2,
        price: 18000,
        total_cost: 36000,
        counterparty_id: "sim_gate_desk",
        counterparty_is_sim: true,
        matched_at: now - 345_000_000,
        settled_at: now - 344_995_000,
        balance_before: 500000,
        balance_after: 464000,
        settlement_status: "COMPLETED",
      },
    ];
  }
}

export const fakeServer = new FakeServerStore();
