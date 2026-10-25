"use client";

import type { ConnectionState } from "@/lib/types";
import { fakeServer } from "./fake-server";
import { USE_MOCK } from "@/lib/config";
import type { MockScenarioType } from "./scenarios";

type WebSocketListener = (event: string, data: any) => void;

/**
 * A deliberately small fake feed. It only publishes data that the mock server
 * can produce: book snapshots with monotonically increasing sequence numbers,
 * simulated trade prints, candles derived from those prints, and auction
 * countdowns calculated by the server.
 *
 * The interval is created lazily, and only in a browser with the mock adapter
 * enabled, so importing this module never starts timers during SSR.
 */
class FakeWebSocketService {
  private listeners: Set<WebSocketListener> = new Set();
  private subscribedChannels: Set<string> = new Set();
  private state: ConnectionState = "LIVE";
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private paused = false;

  public getState(): ConnectionState {
    return this.state;
  }

  public getIsPaused(): boolean {
    return this.paused;
  }

  public getIsHalted(): boolean {
    return fakeServer.isHalted("DARKHOLD-PASS-2026");
  }

  public addListener(listener: WebSocketListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribe(channel: string) {
    this.subscribedChannels.add(channel);
    this.ensureStarted();

    if (channel.startsWith("book:")) {
      const assetId = channel.replace("book:", "");
      this.emit(`book_snapshot:${assetId}`, fakeServer.getBook(assetId));
    }
  }

  public unsubscribe(channel: string) {
    this.subscribedChannels.delete(channel);
  }

  public setConnectionState(newState: ConnectionState) {
    this.state = newState;
    this.emit("connection_change", { state: newState });
  }

  public setSimulationPaused(paused: boolean) {
    this.paused = paused;
    this.emit("simulation_pause_change", { paused });
  }

  public toggleAssetHalt(halted: boolean, assetId = "DARKHOLD-PASS-2026") {
    fakeServer.setHalted(assetId, halted);
    this.emit("asset_halt_change", { assetId, isHalted: halted });
  }

  /** Explicit operator action used by the mock control room. */
  public injectTrade(assetId = "DARKHOLD-PASS-2026"): boolean {
    const result = fakeServer.simulateTrade(assetId);
    if (!result) return false;
    this.emit(`trade_tick:${assetId}`, result.tick);
    result.candles.forEach(({ interval, candle }) => {
      this.emit(`candle_update:${assetId}:${interval}`, candle);
    });
    return true;
  }

  public triggerScenario(scenario: MockScenarioType) {
    switch (scenario) {
      case "DISCONNECT_RECONNECT":
        this.setConnectionState("DISCONNECTED");
        setTimeout(() => this.setConnectionState("RECONNECTING"), 2000);
        setTimeout(() => this.setConnectionState("SYNCING"), 4000);
        setTimeout(() => this.setConnectionState("LIVE"), 5500);
        break;

      case "ASSET_HALTED":
        this.toggleAssetHalt(!this.getIsHalted());
        break;

      case "PARTIAL_FILL": {
        const events = fakeServer.triggerPartialFill();
        events.forEach(({ event, data }) => this.emit(event, data));
        break;
      }

      case "SETTLEMENT_PENDING_TO_COMPLETED": {
        const events = fakeServer.forceSettlement();
        events.forEach(({ event, data }) => this.emit(event, data));
        break;
      }

      case "NORMAL_FLOW":
        this.injectTrade();
        break;

      default:
        break;
    }
  }

  private ensureStarted() {
    if (this.started || typeof window === "undefined" || !USE_MOCK) return;
    this.started = true;
    this.intervalId = setInterval(() => this.tick(), 1500);
    this.emit("connection_change", { state: this.state });
  }

  private tick() {
    if (this.state !== "LIVE" || this.paused) return;

    // Settle any mock fills whose (simulated) settlement delay has elapsed.
    fakeServer.settleDue().forEach(({ event, data }) => this.emit(event, data));

    this.subscribedChannels.forEach((channel) => {
      if (channel.startsWith("book:")) {
        const assetId = channel.replace("book:", "");
        this.emit(`book_snapshot:${assetId}`, fakeServer.getBook(assetId));
        return;
      }

      if (channel.startsWith("trades:")) {
        const assetId = channel.replace("trades:", "");
        if (Math.random() < 0.55) {
          const result = fakeServer.simulateTrade(assetId);
          if (!result) return;
          this.emit(`trade_tick:${assetId}`, result.tick);
          result.candles.forEach(({ interval, candle }) => {
            this.emit(`candle_update:${assetId}:${interval}`, candle);
          });
        }
        return;
      }

      if (channel.startsWith("auction:")) {
        const auctionId = channel.replace("auction:", "");
        const auction = fakeServer.getAuction(auctionId);
        if (!auction) return;
        this.emit(`auction_price_update:${auctionId}`, {
          auction_id: auction.auction_id,
          current_price: auction.current_price,
          next_step_in_seconds: auction.next_step_in_seconds,
          status: auction.status,
          timestamp: Date.now(),
        });
      }
    });
  }

  private emit(event: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("Mock feed listener failed:", error);
      }
    });
  }
}

export const fakeWs = new FakeWebSocketService();
