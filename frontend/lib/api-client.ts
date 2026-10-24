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
  AuthUser,
  AuthSessionResponse,
} from "./types";
import { fakeServer } from "@/mocks/fake-server";
import { ApiErrorPayload } from "./errors";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window === "undefined"
    ? process.env.BACKEND_URL || "http://localhost:4000"
    : "");

export class ApiClient {
  private authToken: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.authToken = localStorage.getItem("dkh_auth_token");
    } else {
      this.authToken = null;
    }
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("dkh_auth_token", token);
      } else {
        localStorage.removeItem("dkh_auth_token");
      }
    }
  }

  public getAuthToken(): string | null {
    if (!this.authToken && typeof window !== "undefined") {
      this.authToken = localStorage.getItem("dkh_auth_token");
    }
    return this.authToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token =
      this.authToken ||
      (typeof window !== "undefined" ? localStorage.getItem("dkh_auth_token") : null);

    if (token && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        let errorPayload: ApiErrorPayload;
        try {
          const json = await res.json();
          errorPayload = {
            code: json.code || (json.error && json.error.code) || "INTERNAL_ERROR",
            message:
              json.message ||
              (json.error && json.error.message) ||
              `Request failed with status ${res.status}: ${res.statusText}`,
            context: json.context || (json.error && json.error.context),
            requestId: json.requestId || `REQ-ERR-${Date.now().toString(36)}`,
          };
        } catch {
          errorPayload = {
            code: "INTERNAL_ERROR",
            message: `Request failed with status ${res.status}: ${res.statusText}`,
            requestId: `REQ-ERR-${Date.now().toString(36)}`,
          };
        }
        throw errorPayload;
      }

      return res.json();
    } catch (err: any) {
      if (err.code && err.requestId) {
        throw err;
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ApiClient] Request error:", err);
      }
      // Connection failure to real API
      throw {
        code: "ENGINE_UNAVAILABLE",
        message:
          err.message ||
          "Cannot connect to exchange backend server. Please verify the service is running.",
        requestId: `REQ-CONN-${Date.now().toString(36)}`,
      } as ApiErrorPayload;
    }
  }

  public async getAssets(): Promise<Asset[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getAssets());
    }
    const res = await this.request<any>("/api/assets");
    return Array.isArray(res) ? res : (res?.items || res?.data || []);
  }

  public async getAsset(id: string): Promise<Asset | null> {
    if (USE_MOCK) {
      const asset = fakeServer.getAsset(id);
      return Promise.resolve(asset || null);
    }
    try {
      return await this.request<Asset>(`/api/assets/${id}`);
    } catch (err: any) {
      if (err.code === "ASSET_NOT_TRADABLE" || err.code === "VALIDATION_FAILED") {
        return null;
      }
      throw err;
    }
  }

  public async getBook(assetId: string): Promise<BookSnapshot> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getBook(assetId));
    }
    return this.request<BookSnapshot>(`/api/book/${assetId}`);
  }

  public async getTrades(assetId: string): Promise<TradeTick[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getTrades(assetId));
    }
    const res = await this.request<any>(`/api/trades/${assetId}`);
    return Array.isArray(res) ? res : (res?.items || res?.data || []);
  }

  public async getCandles(assetId: string, interval: "5s" | "1m" = "1m"): Promise<Candle[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getCandles(assetId, interval));
    }
    const res = await this.request<any>(`/api/candles/${assetId}?interval=${interval}`);
    return Array.isArray(res) ? res : (res?.candles || res?.items || []);
  }

  public async getWallet(): Promise<WalletBalance> {
    try {
      return await this.request<WalletBalance>("/api/wallet");
    } catch (err) {
      if (USE_MOCK) {
        return Promise.resolve(fakeServer.getWallet());
      }
      throw err;
    }
  }

  public async getOrders(): Promise<Order[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getOrders());
    }
    const res = await this.request<any>("/api/orders");
    return Array.isArray(res) ? res : (res?.items || res?.data || []);
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

    const res = await this.request<any>("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify({
        ...params,
        asset: params.assetId,
      }),
    });
    return { data: res.data || res };
  }

  public async cancelOrder(orderId: string): Promise<{ data: Order }> {
    if (USE_MOCK) {
      const result = fakeServer.cancelOrder(orderId);
      if (result.error) {
        throw result.error;
      }
      return Promise.resolve({ data: result.data! });
    }

    const res = await this.request<any>(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    });
    return { data: res.data || res };
  }

  public async getAuctions(): Promise<DutchAuction[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getAuctions());
    }
    const res = await this.request<any>("/api/auctions");
    return Array.isArray(res) ? res : (res?.items || res?.auctions || []);
  }

  public async getAuction(id: string): Promise<DutchAuction | null> {
    if (USE_MOCK) {
      const auc = fakeServer.getAuction(id);
      return Promise.resolve(auc || null);
    }
    try {
      return await this.request<DutchAuction>(`/api/auctions/${id}`);
    } catch {
      return null;
    }
  }

  public async buyAuction(params: {
    auctionId: string;
    maxPrice?: number;
  }): Promise<{ auction: DutchAuction; receipt: TransactionReceipt }> {
    if (USE_MOCK) {
      const result = fakeServer.buyAuction(params);
      if (result.error) {
        throw result.error;
      }
      return Promise.resolve(result.data!);
    }

    return this.request<{ auction: DutchAuction; receipt: TransactionReceipt }>(
      `/api/auctions/${params.auctionId}/buy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      }
    );
  }

  public async acceptAuction(
    auctionId: string,
    maxPrice?: number
  ): Promise<{ auction: DutchAuction; receipt: TransactionReceipt }> {
    return this.buyAuction({ auctionId, maxPrice });
  }

  public async createAuction(params: {
    idempotencyKey?: string;
    assetId: string;
    qty: number;
    startPrice: number;
    floorPrice: number;
    durationMinutes: number;
    stepSeconds?: number;
  }): Promise<{ data: DutchAuction }> {
    if (USE_MOCK) {
      const result = fakeServer.createAuction(params);
      if (result.error) {
        throw result.error;
      }
      return Promise.resolve({ data: result.data! });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (params.idempotencyKey) {
      headers["Idempotency-Key"] = params.idempotencyKey;
    }

    return this.request<{ data: DutchAuction }>("/api/auctions", {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
  }

  // ================= Auth Client Methods =================
  public async login(params: { email: string; password: string }): Promise<AuthSessionResponse> {
    const data = await this.request<AuthSessionResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    this.setAuthToken(data.token);
    return data;
  }

  public async register(params: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthSessionResponse> {
    const data = await this.request<AuthSessionResponse>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    this.setAuthToken(data.token);
    return data;
  }

  public async getSession(): Promise<AuthUser | null> {
    try {
      const data = await this.request<{ user: AuthUser }>("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.request<void>("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // ignore network error on logout
    }
    this.setAuthToken(null);
  }

  public async getReconciliationRings(): Promise<ReconciliationRing[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getReconciliationRings());
    }
    return this.request<ReconciliationRing[]>("/api/admin/reconciliation");
  }

  public async getMlScores(): Promise<MLRiskAccount[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getMlScores());
    }
    return this.request<MLRiskAccount[]>("/api/admin/ml-scores");
  }

  public async getReceipts(): Promise<TransactionReceipt[]> {
    if (USE_MOCK) {
      return Promise.resolve(fakeServer.getReceipts());
    }
    return this.request<TransactionReceipt[]>("/api/receipts");
  }
}

export const api = new ApiClient();
