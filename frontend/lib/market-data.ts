"use client";

import { ConnectionState, TradeTick, Candle } from "./types";
import { fakeWs } from "@/mocks/fake-websocket";

export type MarketDataListener = (event: string, data: any) => void;

/**
 * Authoritative interface for Exchange Market Data Subscriptions.
 * Decouples frontend components from mock simulation implementations.
 */
export interface IMarketDataService {
  getState(): ConnectionState;
  addListener(listener: MarketDataListener): () => void;
  subscribe(channel: string): void;
  unsubscribe(channel: string): void;
  authenticate?(token: string): void;
  clearAuth?(): void;
}

/**
 * Real Market Data Service for Production Mode.
 * Handles live WebSocket streams on /ws with graceful REST polling fallback.
 */
class RealMarketDataService implements IMarketDataService {
  private listeners: Set<MarketDataListener> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private state: ConnectionState = "CONNECTING";
  private pollIntervalId: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private authenticatedUserId: string | null = null;
  private seenTradeIds: Set<string> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.authToken = localStorage.getItem("dkh_auth_token");
      this.connectWebSocket();
      this.startPollingFallback();
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public addListener(listener: MarketDataListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error("MarketData listener error:", err);
      }
    });
  }

  public authenticate(token: string) {
    this.authToken = token;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "auth", token }));
    }
  }

  public clearAuth() {
    this.authToken = null;
    this.authenticatedUserId = null;
    this.subscribedChannels.forEach((channel) => {
      if (channel.startsWith("user:")) {
        this.unsubscribe(channel);
      }
    });
  }

  public subscribe(channel: string) {
    this.subscribedChannels.add(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channel);
    }
    // Perform initial fetch for instant load
    this.pollChannel(channel);
  }

  public unsubscribe(channel: string) {
    this.subscribedChannels.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      let wsChannel = channel;
      if (channel === "user:current" && this.authenticatedUserId) {
        wsChannel = `user:${this.authenticatedUserId}`;
      }
      this.ws.send(JSON.stringify({ type: "unsubscribe", channel: wsChannel }));
    }
  }

  private sendSubscribe(channel: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let wsChannel = channel;
    if (channel === "user:current" && this.authenticatedUserId) {
      wsChannel = `user:${this.authenticatedUserId}`;
    }
    this.ws.send(JSON.stringify({ type: "subscribe", channel: wsChannel }));
  }

  private connectWebSocket() {
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const token =
        this.authToken ||
        (typeof window !== "undefined" ? localStorage.getItem("dkh_auth_token") : null);

      const baseUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        `${wsProtocol}//${host.includes("3000") ? host.replace("3000", "4000") : host}/ws`;

      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state = "LIVE";
        this.emit("state_change", "LIVE");
        this.emit("connection_change", { state: "LIVE" });

        // Authenticate if token exists
        if (token) {
          this.ws?.send(JSON.stringify({ type: "auth", token }));
        }

        // Resubscribe all channels on connect/reconnect
        this.subscribedChannels.forEach((ch) => {
          this.sendSubscribe(ch);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;
          const data = msg.data;

          if (type === "authenticated") {
            const uid = data?.userId || msg.userId;
            this.authenticatedUserId = uid;
            this.emit("authenticated", { userId: uid });
            // Resubscribe user channel if user:current was requested
            if (this.subscribedChannels.has("user:current") && uid) {
              this.ws?.send(JSON.stringify({ type: "subscribe", channel: `user:${uid}` }));
            }
          } else if (type === "error" && (msg.code === "UNAUTHENTICATED" || msg.code === "FORBIDDEN")) {
            this.emit("auth_error", msg);
          } else if (type === "BookSnapshot" && data) {
            const sym = data.symbol || data.asset;
            const id = data.asset_id || sym;
            this.emit(`book_snapshot:${sym}`, data);
            if (id !== sym) this.emit(`book_snapshot:${id}`, data);
          } else if (type === "TradeTick" && data) {
            const sym = data.symbol || data.asset;
            const id = data.asset_id || sym;
            const isSim = typeof data.is_sim === "boolean"
              ? data.is_sim
              : Boolean(data.buyer_is_simulated || data.seller_is_simulated);

            const tick: TradeTick = {
              seq: data.seq,
              trade_id: data.trade_id || data.id,
              asset_id: id,
              price: data.price,
              qty: data.qty ?? data.quantity,
              aggressor_side: data.aggressor_side || data.taker_side || "BUY",
              is_sim: isSim,
              timestamp: data.timestamp || data.ts || Date.now(),
            };
            this.seenTradeIds.add(tick.trade_id || String(tick.seq));
            // Emit trade_tick for TradeTerminalView
            this.emit(`trade_tick:${id}`, tick);
            if (sym !== id) this.emit(`trade_tick:${sym}`, tick);
            // Also emit trades array for legacy listeners
            this.emit(`trades:${id}`, [tick]);
            if (sym !== id) this.emit(`trades:${sym}`, [tick]);
          } else if (type === "CandleUpdate" && data) {
            const sym = data.symbol || data.asset;
            const id = data.asset_id || sym;
            const candle = data.candle;
            const interval = candle?.interval || "1m";
            this.emit(`candle_update:${id}:${interval}`, candle);
            this.emit(`candles:${id}`, candle);
            if (sym !== id) {
              this.emit(`candle_update:${sym}:${interval}`, candle);
              this.emit(`candles:${sym}`, candle);
            }
          } else if (type === "OrderUpdate" && data) {
            this.emit("order_update", data);
          } else if ((type === "SettlementCompleted" || type === "settlement_completed") && data) {
            this.emit("settlement_completed", data);
          } else if ((type === "AuctionPriceUpdate" || type === "auction_price_update") && data) {
            this.emit(`auction:${data.auction_id}`, data);
            this.emit(`auction_price_update:${data.auction_id}`, data);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.state = "RECONNECTING";
        this.emit("state_change", "RECONNECTING");
        this.emit("connection_change", { state: "RECONNECTING" });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.state = "DISCONNECTED";
        this.emit("state_change", "DISCONNECTED");
        this.emit("connection_change", { state: "DISCONNECTED" });
      };
    } catch {
      this.state = "DISCONNECTED";
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, 3000);
  }

  private async pollChannel(channel: string) {
    try {
      if (channel.startsWith("book:")) {
        const assetId = channel.replace("book:", "");
        const res = await fetch(`/api/book/${assetId}`);
        if (res.ok) {
          const snapshot = await res.json();
          this.emit(`book_snapshot:${assetId}`, snapshot);
        }
      } else if (channel.startsWith("trades:")) {
        const assetId = channel.replace("trades:", "");
        const res = await fetch(`/api/trades/${assetId}`);
        if (res.ok) {
          const ticks = await res.json();
          if (Array.isArray(ticks) && ticks.length > 0) {
            for (const rawTick of ticks) {
              const tickId = rawTick.trade_id || rawTick.id || String(rawTick.seq);
              if (!this.seenTradeIds.has(tickId)) {
                this.seenTradeIds.add(tickId);
                const isSim = typeof rawTick.is_sim === "boolean"
                  ? rawTick.is_sim
                  : Boolean(rawTick.buyer_is_simulated || rawTick.seller_is_simulated);

                const tick: TradeTick = {
                  seq: rawTick.seq,
                  trade_id: rawTick.trade_id || rawTick.id,
                  asset_id: assetId,
                  price: rawTick.price,
                  qty: rawTick.qty ?? rawTick.quantity,
                  aggressor_side: rawTick.aggressor_side || rawTick.taker_side || "BUY",
                  is_sim: isSim,
                  timestamp: rawTick.timestamp || rawTick.ts || Date.now(),
                };
                this.emit(`trade_tick:${assetId}`, tick);
              }
            }
            this.emit(`trades:${assetId}`, ticks);
          }
        }
      } else if (channel.startsWith("candles:")) {
        const parts = channel.replace("candles:", "").split(":");
        const assetId = parts[0];
        const interval = parts[1] || "1m";
        const res = await fetch(`/api/candles/${assetId}?interval=${interval}`);
        if (res.ok) {
          const candles = await res.json();
          const list: Candle[] = Array.isArray(candles)
            ? candles
            : (candles?.candles || candles?.items || []);
          if (list.length > 0) {
            const latest = list[list.length - 1];
            this.emit(`candle_update:${assetId}:${interval}`, latest);
            this.emit(`candles:${assetId}`, latest);
          }
        }
      } else if (channel.startsWith("auction:")) {
        const auctionId = channel.replace("auction:", "");
        const res = await fetch(`/api/auctions/${auctionId}`);
        if (res.ok) {
          const auction = await res.json();
          this.emit(`auction:${auctionId}`, auction);
          this.emit(`auction_price_update:${auctionId}`, auction);
        }
      }
    } catch (err) {
      // Backend not yet reachable or offline
    }
  }

  private startPollingFallback() {
    this.pollIntervalId = setInterval(() => {
      // 1. If WebSocket is not in LIVE state, poll all channels via REST
      if (this.state !== "LIVE") {
        this.subscribedChannels.forEach((channel) => {
          this.pollChannel(channel);
        });
      } else {
        // 2. When WebSocket is LIVE, poll auction channels since matching engine doesn't broadcast Dutch auction price decay
        this.subscribedChannels.forEach((channel) => {
          if (channel.startsWith("auction:")) {
            this.pollChannel(channel);
          }
        });
      }
    }, 2500);
  }
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const marketDataService: IMarketDataService = USE_MOCK
  ? fakeWs
  : new RealMarketDataService();
