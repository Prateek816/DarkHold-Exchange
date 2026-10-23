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
 * Polls backend endpoints or handles live WebSocket streams when available.
 */
class RealMarketDataService implements IMarketDataService {
  private listeners: Set<MarketDataListener> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private state: ConnectionState = "LIVE";
  private pollIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.startPolling();
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
    this.pollChannel(channel);
  }

  public unsubscribe(channel: string) {
    this.subscribedChannels.delete(channel);
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

  private startPolling() {
    this.pollIntervalId = setInterval(() => {
      this.subscribedChannels.forEach((channel) => {
        this.pollChannel(channel);
      });
    }, 2000);
  }
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const marketDataService: IMarketDataService = USE_MOCK
  ? fakeWs
  : new RealMarketDataService();
