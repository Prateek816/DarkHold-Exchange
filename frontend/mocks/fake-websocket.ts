"use client";

import {
  BookSnapshot,
  TradeTick,
  Candle,
  Order,
  ConnectionState,
  DutchAuction,
  SettlementStatus,
} from "@/lib/types";
import { generateMockBookSnapshot } from "./fixtures/orderBook";
import { generateMockTrades } from "./fixtures/trades";
import { MOCK_ORDERS } from "./fixtures/orders";
import { MOCK_AUCTIONS } from "./fixtures/auctions";
import { MockScenarioType } from "./scenarios";

type WebSocketListener = (event: string, data: any) => void;

class FakeWebSocketService {
  private listeners: Set<WebSocketListener> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private state: ConnectionState = "LIVE";
  private intervalId: NodeJS.Timeout | null = null;
  private seq = 10000;
  private isHalted = false;

  constructor() {
    this.startHeartbeatAndEmits();
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public addListener(listener: WebSocketListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error("WS Listener error:", err);
      }
    });
  }

  public subscribe(channel: string) {
    this.subscribedChannels.add(channel);
    // Immediately emit snapshot for the subscribed channel
    if (channel.startsWith("book:")) {
      const assetId = channel.replace("book:", "");
      this.seq += 1;
      const snapshot = generateMockBookSnapshot(assetId, this.seq);
      this.emit(`book_snapshot:${assetId}`, snapshot);
    }
  }

  public unsubscribe(channel: string) {
    this.subscribedChannels.delete(channel);
  }

  public setConnectionState(newState: ConnectionState) {
    this.state = newState;
    this.emit("connection_change", { state: newState });
  }

  public toggleAssetHalt(halted: boolean) {
    this.isHalted = halted;
    this.emit("asset_halt_change", { isHalted: halted });
  }

  public getIsHalted(): boolean {
    return this.isHalted;
  }

  private startHeartbeatAndEmits() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      if (this.state !== "LIVE" || this.isHalted) return;

      this.seq += 1;

      // 1. Emit Book Snapshots for active subscribed assets
      this.subscribedChannels.forEach((channel) => {
        if (channel.startsWith("book:")) {
          const assetId = channel.replace("book:", "");
          const snapshot = generateMockBookSnapshot(assetId, this.seq);
          this.emit(`book_snapshot:${assetId}`, snapshot);
        }

        // 2. Emit Trade ticks
        if (channel.startsWith("trades:")) {
          const assetId = channel.replace("trades:", "");
          if (Math.random() > 0.35) {
            let basePrice = 26850;
            if (assetId === "MOONRISE-GA-2026") basePrice = 19400;
            if (assetId === "DARKHOLD-HOODIE-LTD") basePrice = 14200;
            if (assetId === "SIGIL-COLLECTOR-PIN") basePrice = 4800;

            const offset = (Math.floor(Math.random() * 5) - 2) * 50;
            const price = basePrice + offset;
            const qty = Math.floor(Math.random() * 4) + 1;
            const isBuy = Math.random() > 0.5;

            const tick: TradeTick = {
              seq: this.seq,
              trade_id: `TRD-${this.seq}`,
              asset_id: assetId,
              price,
              qty,
              aggressor_side: isBuy ? "BUY" : "SELL",
              is_sim: Math.random() > 0.2, // bot labeled
              timestamp: Date.now(),
            };
            this.emit(`trade_tick:${assetId}`, tick);

            // Also emit candle tick for live chart
            const nowSec = Math.floor(Date.now() / 1000);
            const candleUpdate: Candle = {
              open_time: Math.floor(nowSec / 60) * 60,
              close_time: Math.floor(nowSec / 60) * 60 + 60,
              open: price,
              high: price + 100,
              low: price - 100,
              close: price,
              volume: qty,
              interval: "1m",
              origin: "ENGINE",
            };
            this.emit(`candle_update:${assetId}:1m`, candleUpdate);
          }
        }

        // 3. Emit Auction price decay updates
        if (channel.startsWith("auction:")) {
          const auctionId = channel.replace("auction:", "");
          this.emit(`auction_price_update:${auctionId}`, {
            auction_id: auctionId,
            current_price: 25800 - (Math.floor((Date.now() / 5000) % 20) * 50),
            timestamp: Date.now(),
          });
        }
      });
    }, 1500); // Throttled updates
  }

  // Scripted Scenario Runner
  public triggerScenario(scenario: MockScenarioType) {
    switch (scenario) {
      case "DISCONNECT_RECONNECT":
        this.setConnectionState("DISCONNECTED");
        setTimeout(() => this.setConnectionState("RECONNECTING"), 2000);
        setTimeout(() => this.setConnectionState("SYNCING"), 4000);
        setTimeout(() => this.setConnectionState("LIVE"), 5500);
        break;

      case "ASSET_HALTED":
        this.toggleAssetHalt(!this.isHalted);
        break;

      case "PARTIAL_FILL":
        // Emit private event: order partially filled
        this.emit("order_update", {
          order_id: "ORD-001",
          status: "PARTIALLY_FILLED",
          matched_qty: 1,
          remaining_qty: 1,
          settlement_status: "PENDING",
        });
        break;

      case "SETTLEMENT_PENDING_TO_COMPLETED":
        // Flip half-filled seal to fully settled
        this.emit("settlement_completed", {
          order_id: "ORD-002",
          settlement_status: "COMPLETED",
          ledger_tx_id: `LTX-${Date.now()}`,
        });
        break;

      case "CANCEL_RACE":
        // Order filled right as user attempted cancel
        this.emit("order_error", {
          code: "ORDER_NOT_CANCELABLE",
          message: "Already filled or completed.",
        });
        break;

      case "SELL_WALL":
        // Inject a massive sell wall at ceiling
        this.emit("system_notification", {
          type: "warning",
          message: "Whale sell wall detected near The Ward ceiling.",
        });
        break;

      case "PUMP_TO_CEILING":
        this.emit("system_notification", {
          type: "info",
          message: "Aggressive market buy flurry. Prices approaching The Ward limit.",
        });
        break;

      default:
        break;
    }
  }
}

// Singleton instance
export const fakeWs = new FakeWebSocketService();
