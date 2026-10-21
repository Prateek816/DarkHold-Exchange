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
} from "./types";
import { fakeServer } from "@/mocks/fake-server";
import { ApiErrorPayload, formatErrorMessage } from "./errors";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export class ApiClient {
  public async getAssets(): Promise<Asset[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getAssets());
    }
    const res = await fetch("/api/assets");
    return res.json();
  }

  public async getAsset(id: string): Promise<Asset | null> {
    if (USE_MOCK) {
      const asset = fakeServer.getAsset(id);
      return Promise.resolve(asset || null);
    }
    const res = await fetch(`/api/assets/${id}`);
    return res.json();
  }

  public async getBook(assetId: string): Promise<BookSnapshot> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getBook(assetId));
    }
    const res = await fetch(`/api/book/${assetId}`);
    return res.json();
  }

  public async getTrades(assetId: string): Promise<TradeTick[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getTrades(assetId));
    }
    const res = await fetch(`/api/trades/${assetId}`);
    return res.json();
  }

  public async getCandles(assetId: string, interval: "5s" | "1m" = "1m"): Promise<Candle[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getCandles(assetId, interval));
    }
    const res = await fetch(`/api/candles/${assetId}?interval=${interval}`);
    return res.json();
  }

  public async getWallet(): Promise<WalletBalance> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getWallet());
    }
    const res = await fetch("/api/wallet");
    return res.json();
  }

  public async getOrders(): Promise<Order[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getOrders());
    }
    const res = await fetch("/api/orders");
    return res.json();
  }

  public async submitOrder(params: {
    idempotencyKey: string;
    assetId: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    price: number;
    qty: number;
  }): Promise<{ data: Order }> {
    if (USE_MOCK) {
      const result = fakeServer.submitOrder(params);
      if (result.error) {
        throw result.error;
      }
      return Promise.resolve({ data: result.data! });
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json();
      throw err;
    }
    return res.json();
  }

  public async cancelOrder(orderId: string): Promise<{ data: Order }> {
    if (USE_MOCK) {
      const result = fakeServer.cancelOrder(orderId);
      if (result.error) {
        throw result.error;
      }
      return Promise.resolve({ data: result.data! });
    }

    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json();
      throw err;
    }
    return res.json();
  }

  public async getAuctions(): Promise<DutchAuction[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getAuctions());
    }
    const res = await fetch("/api/auctions");
    return res.json();
  }

  public async getAuction(id: string): Promise<DutchAuction | null> {
    if (USE_MOCK) {
      const auc = fakeServer.getAuction(id);
      return Promise.resolve(auc || null);
    }
    const res = await fetch(`/api/auctions/${id}`);
    return res.json();
  }

  public async getReconciliationRings(): Promise<ReconciliationRing[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getReconciliationRings());
    }
    const res = await fetch("/api/admin/reconciliation");
    return res.json();
  }

  public async getMlScores(): Promise<MLRiskAccount[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getMlScores());
    }
    const res = await fetch("/api/admin/ml-scores");
    return res.json();
  }

  public async getReceipts(): Promise<TransactionReceipt[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getReceipts());
    }
    const res = await fetch("/api/receipts");
    return res.json();
  }
}

export const api = new ApiClient();
