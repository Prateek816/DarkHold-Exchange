import {
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
import { ApiErrorPayload } from "@/lib/errors";

// In-memory mock server state
class FakeServerStore {
  public assets: Asset[] = [...MOCK_ASSETS];
  public orders: Order[] = [...MOCK_ORDERS];
  public wallet: WalletBalance = JSON.parse(JSON.stringify(MOCK_WALLET));
  public auctions: DutchAuction[] = [...MOCK_AUCTIONS];
  public rings: ReconciliationRing[] = [...MOCK_RECONCILIATION_RINGS];
  public mlScores: MLRiskAccount[] = [...MOCK_ML_RISK_SCORES];
  public receipts: TransactionReceipt[] = [
    {
      trade_id: "TRD-4998",
      ledger_tx_id: "LTX-8849201",
      asset_id: "DARKHOLD-PASS-2026",
      asset_name: "Darkhold Fest Weekend Pass",
      side: "BUY",
      qty: 1,
      price: 26500,
      total_cost: 26500,
      counterparty_id: "sim_bot_echo_4",
      counterparty_is_sim: true,
      matched_at: Date.now() - 3600000,
      settled_at: Date.now() - 3598500,
      balance_before: 500000,
      balance_after: 473500,
      settlement_status: "COMPLETED",
    },
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
      matched_at: Date.now() - 14400000,
      settled_at: Date.now() - 14399100,
      balance_before: 454000,
      balance_after: 473500,
      settlement_status: "COMPLETED",
    },
  ];

  // Map to enforce idempotency
  private processedKeys: Set<string> = new Set();

  public getAssets(): Asset[] {
    return this.assets;
  }

  public getAsset(id: string): Asset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  public getBook(assetId: string): BookSnapshot {
    return generateMockBookSnapshot(assetId, Date.now() % 100000);
  }

  public getTrades(assetId: string): TradeTick[] {
    return generateMockTrades(assetId, 30);
  }

  public getCandles(assetId: string, interval: "5s" | "1m" = "1m"): Candle[] {
    return generateSeededCandles(assetId, interval, 60);
  }

  public getWallet(): WalletBalance {
    return this.wallet;
  }

  public getOrders(): Order[] {
    return this.orders;
  }

  public getAuctions(): DutchAuction[] {
    return this.auctions;
  }

  public getAuction(id: string): DutchAuction | undefined {
    return this.auctions.find((a) => a.auction_id === id);
  }

  public getReconciliationRings(): ReconciliationRing[] {
    return this.rings;
  }

  public getMlScores(): MLRiskAccount[] {
    return this.mlScores;
  }

  public getReceipts(): TransactionReceipt[] {
    return this.receipts;
  }

  // Submit Order Mock Handler
  public submitOrder(params: {
    idempotencyKey: string;
    assetId: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    price: number;
    qty: number;
  }): { status: number; data?: Order; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check Idempotency conflict
    if (this.processedKeys.has(params.idempotencyKey)) {
      return {
        status: 409,
        error: {
          code: "IDEMPOTENCY_CONFLICT",
          requestId,
        },
      };
    }
    this.processedKeys.add(params.idempotencyKey);

    const asset = this.getAsset(params.assetId);
    if (!asset) {
      return {
        status: 404,
        error: {
          code: "INTERNAL_ERROR",
          requestId,
        },
      };
    }

    if (asset.is_halted) {
      return {
        status: 400,
        error: {
          code: "ASSET_NOT_TRADABLE",
          requestId,
        },
      };
    }

    // Server truth enforcement: Price ceiling (The Ward)
    if (params.side === "BUY" && params.type === "LIMIT" && params.price > asset.ceiling_price) {
      return {
        status: 422,
        error: {
          code: "PRICE_ABOVE_CEILING",
          context: {
            ceiling: asset.ceiling_price,
            face: asset.face_value,
            pct: asset.ceiling_pct,
          },
          requestId,
        },
      };
    }

    // Balance check for Buy
    const estimatedCost = params.type === "LIMIT" ? params.price * params.qty : asset.ceiling_price * params.qty;
    if (params.side === "BUY" && this.wallet.available_credits < estimatedCost) {
      return {
        status: 400,
        error: {
          code: "INSUFFICIENT_FUNDS",
          context: {
            needed: estimatedCost,
            available: this.wallet.available_credits,
          },
          requestId,
        },
      };
    }

    // Holdings check for Sell
    if (params.side === "SELL") {
      const holding = this.wallet.holdings.find((h) => h.asset_id === params.assetId);
      if (!holding || holding.available_units < params.qty) {
        return {
          status: 400,
          error: {
            code: "INSUFFICIENT_HOLDINGS",
            context: {
              available: holding?.available_units ?? 0,
            },
            requestId,
          },
        };
      }
    }

    // Order ACCEPTED (202 - not filled yet, fills happen over matching engine pipeline)
    const newOrder: Order = {
      order_id: `ORD-${Date.now().toString().slice(-4)}`,
      idempotency_key: params.idempotencyKey,
      asset_id: params.assetId,
      side: params.side,
      type: params.type,
      price: params.price,
      qty: params.qty,
      matched_qty: 0,
      remaining_qty: params.qty,
      status: "OPEN",
      settlement_status: "PENDING", // Reserved state
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Server slides funds to reserved
    if (params.side === "BUY") {
      this.wallet.available_credits -= estimatedCost;
      this.wallet.reserved_credits += estimatedCost;
    } else {
      const holding = this.wallet.holdings.find((h) => h.asset_id === params.assetId);
      if (holding) {
        holding.available_units -= params.qty;
        holding.reserved_units += params.qty;
      }
    }

    this.orders.unshift(newOrder);

    return {
      status: 202,
      data: newOrder,
    };
  }

  // Cancel Order Mock Handler
  public cancelOrder(orderId: string): { status: number; data?: Order; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const order = this.orders.find((o) => o.order_id === orderId);

    if (!order) {
      return {
        status: 404,
        error: { code: "INTERNAL_ERROR", requestId },
      };
    }

    if (order.status === "FILLED" || order.status === "CANCELED") {
      return {
        status: 400,
        error: { code: "ORDER_NOT_CANCELABLE", requestId },
      };
    }

    order.status = "CANCELED";
    order.settlement_status = "COMPLETED";
    order.updated_at = Date.now();

    // Release reserved funds
    if (order.side === "BUY") {
      const refund = order.price * order.remaining_qty;
      this.wallet.reserved_credits -= refund;
      this.wallet.available_credits += refund;
    } else {
      const holding = this.wallet.holdings.find((h) => h.asset_id === order.asset_id);
      if (holding) {
        holding.reserved_units -= order.remaining_qty;
        holding.available_units += order.remaining_qty;
      }
    }

    return {
      status: 200,
      data: order,
    };
  }
}

export const fakeServer = new FakeServerStore();
