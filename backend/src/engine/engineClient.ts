import { env } from "@/config/env";
import {
  EngineCommand,
  CommandReply,
  BookSnapshot,
  OrderOutcome,
  OpenOrdersResponse,
  HealthResponse,
} from "./types";
import { AppError } from "@/utils/errors";

export class EngineHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: any = {}
  ) {
    super(message);
    this.name = "EngineHttpError";
  }
}

export class EngineClient {
  private baseUrl: string;
  private token: string;
  private timeoutMs: number;

  constructor(options?: { baseUrl?: string; token?: string; timeoutMs?: number }) {
    this.baseUrl = (options?.baseUrl || env.ENGINE_URL).replace(/\/+$/, "");
    this.token = options?.token || env.ENGINE_TOKEN;
    this.timeoutMs = options?.timeoutMs || env.ENGINE_CMD_TIMEOUT_MS;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  public getToken(): string {
    return this.token;
  }

  public setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    method: string,
    body?: any,
    customTimeoutMs?: number
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (path !== "/healthz") {
      headers["X-Engine-Token"] = this.token;
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, customTimeoutMs || this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle 401 Unauthenticated
      if (response.status === 401) {
        throw new EngineHttpError(
          401,
          "UNAUTHENTICATED",
          "Engine rejected request: invalid or missing X-Engine-Token"
        );
      }

      // Handle 503 / 504 errors
      if (response.status === 503) {
        let code = "ENGINE_UNAVAILABLE";
        let message = "Matching engine unavailable";
        try {
          const errData = (await response.json()) as any;
          code = errData?.error?.code || code;
          message = errData?.error?.message || message;
        } catch {}
        throw new EngineHttpError(503, code, message, {
          retryAfter: response.headers.get("retry-after") || "1",
        });
      }

      if (response.status === 504) {
        throw new EngineHttpError(
          504,
          "COMMAND_TIMEOUT",
          "Engine command timed out; execution status uncertain"
        );
      }

      if (!response.ok) {
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {}
        const code = errJson?.error?.code || `HTTP_${response.status}`;
        const message = errJson?.error?.message || response.statusText;
        const details = errJson?.error?.details || {};
        throw new EngineHttpError(response.status, code, message, details);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof EngineHttpError) {
        throw err;
      }
      if (err.name === "AbortError") {
        throw new EngineHttpError(
          504,
          "COMMAND_TIMEOUT",
          `Engine request timed out after ${customTimeoutMs || this.timeoutMs}ms`
        );
      }
      throw new EngineHttpError(
        503,
        "ENGINE_UNAVAILABLE",
        `Failed to connect to matching engine at ${this.baseUrl}: ${err.message}`
      );
    }
  }

  /**
   * Dispatches a command to the engine.
   * Note: The engine returns HTTP 200 even for business rejections (with status: 'REJECTED').
   */
  public async sendCommand(command: EngineCommand): Promise<CommandReply> {
    return this.request<CommandReply>("/v1/commands", "POST", command);
  }

  public async getBook(asset: string, depth: number = 15): Promise<BookSnapshot> {
    const clampedDepth = Math.max(1, Math.min(100, depth));
    return this.request<BookSnapshot>(
      `/v1/books/${encodeURIComponent(asset)}?depth=${clampedDepth}`,
      "GET"
    );
  }

  public async getOrder(orderId: string): Promise<OrderOutcome> {
    return this.request<OrderOutcome>(`/v1/orders/${encodeURIComponent(orderId)}`, "GET");
  }

  public async getOpenOrders(asset?: string): Promise<OpenOrdersResponse> {
    const query = asset ? `?asset=${encodeURIComponent(asset)}` : "";
    return this.request<OpenOrdersResponse>(`/v1/open-orders${query}`, "GET");
  }

  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/healthz", "GET", undefined, 2000);
  }
}

export const engineClient = new EngineClient();
