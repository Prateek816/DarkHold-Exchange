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
} from "./types";
import { fakeServer } from "@/mocks/fake-server";
import type { ApiErrorPayload} from "./errors";
import { formatErrorMessage } from "./errors";
import { USE_MOCK } from "./config";

const unsupportedRequestId = () =>
  `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let payload: Partial<ApiErrorPayload> | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (payload?.code) {
      throw {
        code: payload.code,
        message: payload.message,
        context: payload.context,
        requestId: payload.requestId ?? unsupportedRequestId(),
      } satisfies ApiErrorPayload;
    }

    const fallbackId = unsupportedRequestId();
    throw {
      code: "INTERNAL_ERROR",
      context: { request_id: fallbackId },
      requestId: fallbackId,
    } satisfies ApiErrorPayload;
  }

  return (await response.json()) as T;
}

export class ApiClient {
  public async getAssets(): Promise<Asset[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getAssets());
    const res = await fetch("/api/assets");
    return readResponse<Asset[]>(res);
  }

  public async getAsset(id: string): Promise<Asset | null> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getAsset(id) || null);
    const res = await fetch(`/api/assets/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return readResponse<Asset>(res);
  }

  public async getBook(assetId: string): Promise<BookSnapshot> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getBook(assetId));
    const res = await fetch(`/api/book/${encodeURIComponent(assetId)}`);
    return readResponse<BookSnapshot>(res);
  }

  public async getTrades(assetId: string): Promise<TradeTick[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getTrades(assetId));
    const res = await fetch(`/api/trades/${encodeURIComponent(assetId)}`);
    return readResponse<TradeTick[]>(res);
  }

  public async getCandles(
    assetId: string,
    interval: "5s" | "1m" = "1m"
  ): Promise<Candle[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getCandles(assetId, interval));
    const res = await fetch(
      `/api/candles/${encodeURIComponent(assetId)}?interval=${interval}`
    );
    return readResponse<Candle[]>(res);
  }

  public async getWallet(): Promise<WalletBalance> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getWallet());
    const res = await fetch("/api/wallet");
    return readResponse<WalletBalance>(res);
  }

  public async getOrders(): Promise<Order[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getOrders());
    const res = await fetch("/api/orders");
    return readResponse<Order[]>(res);
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
      if (result.error) throw result.error;
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
    return readResponse<{ data: Order }>(res);
  }

  public async cancelOrder(orderId: string): Promise<{ data: Order }> {
    if (USE_MOCK) {
      const result = fakeServer.cancelOrder(orderId);
      if (result.error) throw result.error;
      return Promise.resolve({ data: result.data! });
    }

    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
    });
    return readResponse<{ data: Order }>(res);
  }

  public async getAuctions(): Promise<DutchAuction[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getAuctions());
    const res = await fetch("/api/auctions");
    return readResponse<DutchAuction[]>(res);
  }

  public async getAuction(id: string): Promise<DutchAuction | null> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getAuction(id) || null);
    const res = await fetch(`/api/auctions/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return readResponse<DutchAuction>(res);
  }

  public async createAuction(params: {
    idempotencyKey: string;
    assetId: string;
    qty: number;
    startPrice: number;
    floorPrice: number;
    stepSeconds: number;
    durationMinutes: number;
  }): Promise<DutchAuction> {
    if (!USE_MOCK) {
      const requestId = unsupportedRequestId();
      throw {
        code: "BACKEND_UNSUPPORTED",
        context: {
          request_id: requestId,
          field_message:
            "Auction creation has no deployed REST contract in this build. No auction was created and no units were reserved.",
        },
        requestId,
      } satisfies ApiErrorPayload;
    }

    const result = fakeServer.createAuction(params);
    if (result.error) throw result.error;
    return result.data!;
  }

  public async acceptAuction(
    auctionId: string,
    expectedPrice: number
  ): Promise<TransactionReceipt> {
    if (!USE_MOCK) {
      const requestId = unsupportedRequestId();
      throw {
        code: "BACKEND_UNSUPPORTED",
        context: {
          request_id: requestId,
          field_message:
            "Auction acceptance has no deployed REST contract in this build. Nothing was purchased and no credits moved.",
        },
        requestId,
      } satisfies ApiErrorPayload;
    }

    const result = fakeServer.acceptAuction(auctionId, expectedPrice);
    if (result.error) throw result.error;
    return result.data!;
  }

  public async getReconciliationRings(): Promise<ReconciliationRing[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getReconciliationRings());
    const res = await fetch("/api/admin/reconciliation");
    return readResponse<ReconciliationRing[]>(res);
  }

  public async getMlScores(): Promise<MLRiskAccount[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getMlScores());
    const res = await fetch("/api/admin/ml-scores");
    return readResponse<MLRiskAccount[]>(res);
  }

  public async getReceipts(): Promise<TransactionReceipt[]> {
    if (USE_MOCK) return Promise.resolve(fakeServer.getReceipts());
    const res = await fetch("/api/receipts");
    return readResponse<TransactionReceipt[]>(res);
  }
}

export function describeApiError(error: unknown): string {
  const candidate = error as Partial<ApiErrorPayload> | undefined;
  if (candidate?.code) {
    return formatErrorMessage(candidate.code, candidate.context);
  }
  return "The request could not be completed. Nothing was changed.";
}

export const api = new ApiClient();
