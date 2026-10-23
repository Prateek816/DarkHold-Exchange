"use client";

import { ConnectionState } from "./types";
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

  constructor() {
    if (typeof window !== "undefined") {
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

  public subscribe(channel: string) {
    this.subscribedChannels.add(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", channel }));
    }
    // Perform initial fetch for instant load
    this.pollChannel(channel);
  }

  public unsubscribe(channel: string) {
    this.subscribedChannels.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", channel }));
    }
  }

  private connectWebSocket() {
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        `${wsProtocol}//${host.includes("3000") ? host.replace("3000", "4000") : host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state = "LIVE";
        this.emit("state_change", "LIVE");
        // Resubscribe all channels on connect/reconnect
        this.subscribedChannels.forEach((ch) => {
          this.ws?.send(JSON.stringify({ type: "subscribe", channel: ch }));
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;
          const data = msg.data;

          if (type === "BookSnapshot" && data) {
            const sym = data.asset;
            const id = data.asset_id || sym;
            this.emit(`book_snapshot:${sym}`, data);
            if (id !== sym) this.emit(`book_snapshot:${id}`, data);
          } else if (type === "TradeTick" && data) {
            this.emit(`trades:${data.asset}`, [data]);
          } else if (type === "CandleUpdate" && data) {
            this.emit(`candles:${data.asset}`, data.candle);
          } else if (type === "AuctionPriceUpdate" && data) {
            this.emit(`auction:${data.auction_id}`, data);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.state = "RECONNECTING";
        this.emit("state_change", "RECONNECTING");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.state = "DISCONNECTED";
        this.emit("state_change", "DISCONNECTED");
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
            this.emit(`trades:${assetId}`, ticks);
          }
        }
      } else if (channel.startsWith("auction:")) {
        const auctionId = channel.replace("auction:", "");
        const res = await fetch(`/api/auctions/${auctionId}`);
        if (res.ok) {
          const auction = await res.json();
          this.emit(`auction:${auctionId}`, auction);
        }
      }
    } catch (err) {
      // Backend not yet reachable or offline
    }
  }

  private startPollingFallback() {
    this.pollIntervalId = setInterval(() => {
      // If WebSocket is not in LIVE state, use REST polling fallback
      if (this.state !== "LIVE") {
        this.subscribedChannels.forEach((channel) => {
          this.pollChannel(channel);
        });
      }
    }, 2500);
  }
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const marketDataService: IMarketDataService = USE_MOCK
  ? fakeWs
  : new RealMarketDataService();
