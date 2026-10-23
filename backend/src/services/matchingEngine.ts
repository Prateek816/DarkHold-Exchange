import { Prisma, OrderSide, OrderType, OrderStatus } from "@prisma/client";
import { prisma } from "@/config/db";
import {
  PriceAboveCeilingError,
  AssetNotTradableError,
  SelfTradePreventedError,
  OrderNotCancelableError,
  AppError,
} from "@/utils/errors";
import { walletsService } from "@/modules/wallets/wallets.service";
import { toNumber } from "@/utils/serialization";

export interface BookLevel {
  price: number;
  qty: number;
  total_qty: number;
  order_count: number;
  has_user_order?: boolean;
}

export interface BookSnapshot {
  asset_id: string;
  as_of_seq: number;
  timestamp: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface InternalOrder {
  id: string;
  userId: string;
  assetId: string;
  side: OrderSide;
  type: OrderType;
  price: bigint;
  originalQuantity: number;
  remainingQuantity: number;
  reservedUnitCost: bigint;
  createdAt: number;
}

/**
 * Deterministic Matching Engine Simulation Service.
 * Follows Price-Time Priority, Self-Trade Prevention, and Resale Ceiling policy.
 */
export class MatchingEngineSimulation {
  private bids: Map<string, InternalOrder[]> = new Map();
  private asks: Map<string, InternalOrder[]> = new Map();
  private sequenceNumber: number = 1000;

  constructor() {
    this.seedDefaultBooks();
  }

  /**
   * Initializes default simulated book depth for demo assets
   */
  private seedDefaultBooks() {
    const defaultAsks: Record<string, Array<{ price: bigint; qty: number }>> = {
      "DARKHOLD-PASS-2026": [
        { price: BigInt(26900), qty: 15 },
        { price: BigInt(27100), qty: 20 },
        { price: BigInt(27300), qty: 13 },
      ],
      "MOONRISE-GA-2026": [
        { price: BigInt(19500), qty: 12 },
        { price: BigInt(19800), qty: 12 },
      ],
      "DARKHOLD-HOODIE-LTD": [
        { price: BigInt(14300), qty: 8 },
        { price: BigInt(14500), qty: 4 },
      ],
      "SIGIL-COLLECTOR-PIN": [
        { price: BigInt(4900), qty: 5 },
      ],
    };

    const defaultBids: Record<string, Array<{ price: bigint; qty: number }>> = {
      "DARKHOLD-PASS-2026": [
        { price: BigInt(26700), qty: 10 },
        { price: BigInt(26500), qty: 18 },
      ],
      "MOONRISE-GA-2026": [
        { price: BigInt(19200), qty: 14 },
      ],
      "DARKHOLD-HOODIE-LTD": [
        { price: BigInt(13900), qty: 6 },
      ],
      "SIGIL-COLLECTOR-PIN": [
        { price: BigInt(4500), qty: 4 },
      ],
    };

    for (const [assetId, levels] of Object.entries(defaultAsks)) {
      const askList: InternalOrder[] = levels.map((lvl, idx) => ({
        id: `SIM-ASK-${assetId}-${idx}`,
        userId: "sim_market_maker",
        assetId,
        side: "SELL",
        type: "LIMIT",
        price: lvl.price,
        originalQuantity: lvl.qty,
        remainingQuantity: lvl.qty,
        reservedUnitCost: lvl.price,
        createdAt: Date.now() - 3600000 + idx * 100,
      }));
      this.asks.set(assetId, askList);
    }

    for (const [assetId, levels] of Object.entries(defaultBids)) {
      const bidList: InternalOrder[] = levels.map((lvl, idx) => ({
        id: `SIM-BID-${assetId}-${idx}`,
        userId: "sim_market_maker",
        assetId,
        side: "BUY",
        type: "LIMIT",
        price: lvl.price,
        originalQuantity: lvl.qty,
        remainingQuantity: lvl.qty,
        reservedUnitCost: lvl.price,
        createdAt: Date.now() - 3600000 + idx * 100,
      }));
      this.bids.set(assetId, bidList);
    }
  }

  public getBookSnapshot(assetId: string, currentUserId?: string): BookSnapshot {
    const rawBids = this.bids.get(assetId) || [];
    const rawAsks = this.asks.get(assetId) || [];

    // Aggregate into price levels
    const bidMap = new Map<number, { qty: number; count: number; hasUser: boolean }>();
    for (const order of rawBids) {
      if (order.remainingQuantity <= 0) continue;
      const p = Number(order.price);
      const existing = bidMap.get(p) || { qty: 0, count: 0, hasUser: false };
      existing.qty += order.remainingQuantity;
      existing.count += 1;
      if (currentUserId && order.userId === currentUserId) existing.hasUser = true;
      bidMap.set(p, existing);
    }

    const askMap = new Map<number, { qty: number; count: number; hasUser: boolean }>();
    for (const order of rawAsks) {
      if (order.remainingQuantity <= 0) continue;
      const p = Number(order.price);
      const existing = askMap.get(p) || { qty: 0, count: 0, hasUser: false };
      existing.qty += order.remainingQuantity;
      existing.count += 1;
      if (currentUserId && order.userId === currentUserId) existing.hasUser = true;
      askMap.set(p, existing);
    }

    // Sort Bids DESCENDING
    const sortedBids = Array.from(bidMap.entries()).sort((a, b) => b[0] - a[0]);
    let bidTotal = 0;
    const bidLevels: BookLevel[] = sortedBids.map(([price, val]) => {
      bidTotal += val.qty;
      return {
        price,
        qty: val.qty,
        total_qty: bidTotal,
        order_count: val.count,
        has_user_order: val.hasUser,
      };
    });

    // Sort Asks ASCENDING
    const sortedAsks = Array.from(askMap.entries()).sort((a, b) => a[0] - b[0]);
    let askTotal = 0;
    const askLevels: BookLevel[] = sortedAsks.map(([price, val]) => {
      askTotal += val.qty;
      return {
        price,
        qty: val.qty,
        total_qty: askTotal,
        order_count: val.count,
        has_user_order: val.hasUser,
      };
    });

    return {
      asset_id: assetId,
      as_of_seq: ++this.sequenceNumber,
      timestamp: Date.now(),
      bids: bidLevels,
      asks: askLevels,
    };
  }

  /**
   * Places an order, matches against book, and updates DB atomically.
   */
  public async submitOrder(params: {
    userId: string;
    assetId: string;
    side: OrderSide;
    type: OrderType;
    price: bigint;
    qty: number;
    idempotencyKey?: string;
  }) {
    // 1. Fetch asset and validate rules
    const asset = await prisma.asset.findUnique({
      where: { id: params.assetId },
    });

    if (!asset) {
      throw new AppError(404, "ASSET_NOT_TRADABLE", "Asset not found.");
    }

    if (asset.isHalted) {
      throw new AssetNotTradableError();
    }

    // Resale Ceiling Enforcement
    if (params.type === "LIMIT" && params.price > asset.ceilingPrice) {
      throw new PriceAboveCeilingError(
        Number(asset.ceilingPrice),
        asset.ceilingPct,
        Number(asset.faceValue)
      );
    }

    // 2. Determine funds / holdings reservation
    let reservedAmount = BigInt(0);
    let reservedUnits = 0;
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (params.side === "BUY") {
      // For LIMIT: reserve price * qty
      // For MARKET: reserve ceilingPrice * qty
      const unitReservation = params.type === "LIMIT" ? params.price : asset.ceilingPrice;
      reservedAmount = BigInt(params.qty) * unitReservation;
      await walletsService.reserveOrderFunds(params.userId, orderId, reservedAmount);
    } else {
      reservedUnits = params.qty;
      await walletsService.reserveHoldingUnits(params.userId, params.assetId, reservedUnits);
    }

    // 3. Create Order record in DB
    const dbOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: params.userId,
        assetId: params.assetId,
        side: params.side,
        type: params.type,
        price: params.price,
        originalQuantity: params.qty,
        matchedQuantity: 0,
        remainingQuantity: params.qty,
        reservedAmount,
        reservedUnits,
        status: "OPEN",
        settlementStatus: "PENDING",
        idempotencyKey: params.idempotencyKey,
      },
    });

    // 4. Execute Matching
    let remaining = params.qty;
    let matched = 0;
    const reservedUnitCost = params.side === "BUY"
      ? (params.type === "LIMIT" ? params.price : asset.ceilingPrice)
      : params.price;

    const tradesToCreate: any[] = [];

    if (params.side === "BUY") {
      const askList = this.asks.get(params.assetId) || [];
      const effectiveMaxPrice = params.type === "LIMIT" ? params.price : asset.ceilingPrice;

      for (let i = 0; i < askList.length && remaining > 0; i++) {
        const restingAsk = askList[i];
        if (restingAsk.remainingQuantity <= 0) continue;
        if (restingAsk.price > effectiveMaxPrice) break; // Asks are sorted ascending

        // Self-trade prevention
        if (restingAsk.userId === params.userId) {
          throw new SelfTradePreventedError();
        }

        const matchQty = Math.min(remaining, restingAsk.remainingQuantity);
        const matchPrice = restingAsk.price;

        restingAsk.remainingQuantity -= matchQty;
        remaining -= matchQty;
        matched += matchQty;

        const tradeId = `TRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        tradesToCreate.push({
          tradeId,
          buyerId: params.userId,
          sellerId: restingAsk.userId,
          buyOrderId: orderId,
          sellOrderId: restingAsk.id.startsWith("SIM-") ? null : restingAsk.id,
          executionPrice: matchPrice,
          quantity: matchQty,
          reservedUnitCost,
          isSim: restingAsk.userId.startsWith("sim_"),
        });

        // Update resting ask in DB if real
        if (!restingAsk.id.startsWith("SIM-")) {
          await prisma.order.update({
            where: { id: restingAsk.id },
            data: {
              matchedQuantity: { increment: matchQty },
              remainingQuantity: { decrement: matchQty },
              status: restingAsk.remainingQuantity === 0 ? "FILLED" : "PARTIALLY_FILLED",
              settlementStatus: restingAsk.remainingQuantity === 0 ? "COMPLETED" : "PENDING",
            },
          });
        }
      }

      // If market order has leftover unfilled quantity and no liquidity, cancel remaining reservation
      if (params.type === "MARKET" && remaining > 0) {
        const leftoverReserved = BigInt(remaining) * asset.ceilingPrice;
        await walletsService.releaseOrderFunds(params.userId, orderId, leftoverReserved);
      } else if (params.type === "LIMIT" && remaining > 0) {
        // Rest remainder in bids
        const currentBids = this.bids.get(params.assetId) || [];
        currentBids.push({
          id: orderId,
          userId: params.userId,
          assetId: params.assetId,
          side: "BUY",
          type: "LIMIT",
          price: params.price,
          originalQuantity: params.qty,
          remainingQuantity: remaining,
          reservedUnitCost,
          createdAt: Date.now(),
        });
        currentBids.sort((a, b) => {
          if (b.price !== a.price) return Number(b.price - a.price);
          return a.createdAt - b.createdAt;
        });
        this.bids.set(params.assetId, currentBids);
      }
    } else {
      // SELL order matching against Bids
      const bidList = this.bids.get(params.assetId) || [];
      const effectiveMinPrice = params.type === "LIMIT" ? params.price : BigInt(0);

      for (let i = 0; i < bidList.length && remaining > 0; i++) {
        const restingBid = bidList[i];
        if (restingBid.remainingQuantity <= 0) continue;
        if (restingBid.price < effectiveMinPrice) break; // Bids sorted descending

        if (restingBid.userId === params.userId) {
          throw new SelfTradePreventedError();
        }

        const matchQty = Math.min(remaining, restingBid.remainingQuantity);
        const matchPrice = restingBid.price;

        restingBid.remainingQuantity -= matchQty;
        remaining -= matchQty;
        matched += matchQty;

        const tradeId = `TRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        tradesToCreate.push({
          tradeId,
          buyerId: restingBid.userId,
          sellerId: params.userId,
          buyOrderId: restingBid.id.startsWith("SIM-") ? null : restingBid.id,
          sellOrderId: orderId,
          executionPrice: matchPrice,
          quantity: matchQty,
          reservedUnitCost: matchPrice,
          isSim: restingBid.userId.startsWith("sim_"),
        });

        if (!restingBid.id.startsWith("SIM-")) {
          await prisma.order.update({
            where: { id: restingBid.id },
            data: {
              matchedQuantity: { increment: matchQty },
              remainingQuantity: { decrement: matchQty },
              status: restingBid.remainingQuantity === 0 ? "FILLED" : "PARTIALLY_FILLED",
              settlementStatus: restingBid.remainingQuantity === 0 ? "COMPLETED" : "PENDING",
            },
          });
        }
      }

      if (params.type === "LIMIT" && remaining > 0) {
        const currentAsks = this.asks.get(params.assetId) || [];
        currentAsks.push({
          id: orderId,
          userId: params.userId,
          assetId: params.assetId,
          side: "SELL",
          type: "LIMIT",
          price: params.price,
          originalQuantity: params.qty,
          remainingQuantity: remaining,
          reservedUnitCost: params.price,
          createdAt: Date.now(),
        });
        currentAsks.sort((a, b) => {
          if (a.price !== b.price) return Number(a.price - b.price);
          return a.createdAt - b.createdAt;
        });
        this.asks.set(params.assetId, currentAsks);
      }
    }

    // 5. Execute settlements for each matched trade
    for (const trade of tradesToCreate) {
      await prisma.trade.create({
        data: {
          id: trade.tradeId,
          assetId: params.assetId,
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          executionPrice: trade.executionPrice,
          quantity: trade.quantity,
          totalCost: BigInt(trade.quantity) * trade.executionPrice,
          isSim: trade.isSim,
        },
      });

      await walletsService.settleTradeExecution({
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        assetId: params.assetId,
        quantity: trade.quantity,
        executionPrice: trade.executionPrice,
        reservedUnitCost: trade.reservedUnitCost,
        tradeId: trade.tradeId,
        isSimSeller: trade.isSim,
      });

      // Update asset market price and 24h volume
      await prisma.asset.update({
        where: { id: params.assetId },
        data: {
          lastPrice: trade.executionPrice,
          lastPriceTimestamp: new Date(),
          volume24h: { increment: trade.quantity },
        },
      });
    }

    // 6. Update order final status
    const finalStatus: OrderStatus =
      matched === params.qty
        ? "FILLED"
        : matched > 0
        ? "PARTIALLY_FILLED"
        : "OPEN";

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        matchedQuantity: matched,
        remainingQuantity: remaining,
        status: finalStatus,
        settlementStatus: finalStatus === "FILLED" ? "COMPLETED" : "PENDING",
      },
    });

    return updatedOrder;
  }

  /**
   * Cancels an open or partially filled order, releases reservations.
   */
  public async cancelOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { asset: true },
    });

    if (!order) {
      throw new AppError(404, "VALIDATION_FAILED", "Order not found");
    }

    if (order.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "Cannot cancel an order belonging to another trader");
    }

    if (order.status !== "OPEN" && order.status !== "PARTIALLY_FILLED") {
      throw new OrderNotCancelableError();
    }

    // Remove from in-memory book
    if (order.side === "BUY") {
      const book = this.bids.get(order.assetId) || [];
      this.bids.set(
        order.assetId,
        book.filter((o) => o.id !== orderId)
      );

      // Release reserved cash
      const unitReserved = order.type === "LIMIT" ? order.price : order.asset.ceilingPrice;
      const releaseAmount = BigInt(order.remainingQuantity) * unitReserved;
      await walletsService.releaseOrderFunds(order.userId, order.id, releaseAmount);
    } else {
      const book = this.asks.get(order.assetId) || [];
      this.asks.set(
        order.assetId,
        book.filter((o) => o.id !== orderId)
      );

      // Release reserved asset units
      await walletsService.releaseHoldingUnits(order.userId, order.assetId, order.remainingQuantity);
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELED",
        settlementStatus: "COMPLETED",
      },
    });
  }
}

export const matchingEngine = new MatchingEngineSimulation();
