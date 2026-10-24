import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import url from "url";
import { prisma } from "@/config/db";
import { sseConsumer } from "@/engine/sseConsumer";
import { engineClient } from "@/engine/engineClient";
import { candleService } from "./candleService";
import { BookSnapshot, EngineEvent, TradeExecutedEvent } from "@/engine/types";

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId: string | null;
  subscriptions: Set<string>;
}

export class WebSocketGateway {
  private wss: WebSocketServer | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private cachedBooks: Map<string, BookSnapshot> = new Map();

  public attach(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const parsedUrl = url.parse(request.url || "", true);
      const pathname = parsedUrl.pathname;

      if (pathname === "/ws" || pathname === "/api/ws") {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit("connection", ws, request);
        });
      } else {
        // Not a WS endpoint for us
      }
    });

    this.wss.on("connection", (rawWs: WebSocket, request: http.IncomingMessage) => {
      const ws = rawWs as ExtendedWebSocket;
      ws.isAlive = true;
      ws.subscriptions = new Set();
      ws.userId = null;

      // Extract optional token from query parameter ?token=...
      const parsedUrl = url.parse(request.url || "", true);
      const token = (parsedUrl.query.token as string) || null;
      if (token) {
        this.authenticateSocket(ws, token);
      }

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());
          await this.handleClientMessage(ws, msg);
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "VALIDATION_FAILED",
              message: "Malformed JSON message",
            })
          );
        }
      });

      ws.on("close", () => {
        ws.subscriptions.clear();
      });
    });

    // Protocol ping every 20s
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;
      for (const rawWs of this.wss.clients) {
        const ws = rawWs as ExtendedWebSocket;
        if (!ws.isAlive) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 20000);

    // Wire up events from engine and candles
    this.setupEventForwarding();
  }

  private setupEventForwarding() {
    // 1. Book frames from engine
    sseConsumer.onBook((snapshot) => {
      this.cachedBooks.set(snapshot.asset, snapshot);
      this.broadcastToChannel(`book:${snapshot.asset}`, {
        type: "BookSnapshot",
        channel: `book:${snapshot.asset}`,
        data: snapshot,
        ts: Date.now(),
      });
    });

    // 2. Events from engine (TradeExecuted)
    sseConsumer.onEvent((event: EngineEvent) => {
      if (event.type === "TradeExecuted") {
        const te = event as TradeExecutedEvent;
        this.broadcastToChannel(`trades:${te.asset}`, {
          type: "TradeTick",
          channel: `trades:${te.asset}`,
          data: {
            asset: te.asset,
            trade_id: te.trade_id,
            price: te.price,
            qty: te.qty,
            ts: te.ts,
            taker_side: te.taker_side,
            seq: te.seq,
            buyer_is_simulated: te.buy_user_id.startsWith("sim_"),
            seller_is_simulated: te.sell_user_id.startsWith("sim_"),
          },
          ts: Date.now(),
        });

        // Market stats tick
        this.broadcastToChannel("market", {
          type: "MarketStats",
          channel: "market",
          data: {
            asset: te.asset,
            last_price: te.price,
            last_ts: te.ts,
            last_seq: te.seq,
          },
          ts: Date.now(),
        });

        // Private updates to buyer and seller
        this.broadcastToChannel(`user:${te.buy_user_id}`, {
          type: "OrderUpdate",
          channel: `user:${te.buy_user_id}`,
          data: {
            order_id: te.buy_order_id,
            symbol: te.asset,
            side: "BUY",
            matched_qty: te.qty,
            remaining_qty: te.buy_remaining,
            status: te.buy_remaining === 0 ? "FILLED" : "PARTIALLY_FILLED",
          },
          ts: Date.now(),
        });

        this.broadcastToChannel(`user:${te.sell_user_id}`, {
          type: "OrderUpdate",
          channel: `user:${te.sell_user_id}`,
          data: {
            order_id: te.sell_order_id,
            symbol: te.asset,
            side: "SELL",
            matched_qty: te.qty,
            remaining_qty: te.sell_remaining,
            status: te.sell_remaining === 0 ? "FILLED" : "PARTIALLY_FILLED",
          },
          ts: Date.now(),
        });
      }
    });

    // 3. Candle updates
    candleService.onCandleUpdate((asset, candle) => {
      this.broadcastToChannel(`candles:${asset}:${candle.interval}`, {
        type: "CandleUpdate",
        channel: `candles:${asset}:${candle.interval}`,
        data: {
          asset,
          candle,
        },
        ts: Date.now(),
      });
    });
  }

  private async authenticateSocket(ws: ExtendedWebSocket, token: string) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && !session.revokedAt && session.expiresAt > new Date()) {
        ws.userId = session.userId;
        ws.send(
          JSON.stringify({
            type: "authenticated",
            userId: session.userId,
          })
        );
      }
    } catch (err) {
      console.error("[WebSocketGateway] Auth error:", err);
    }
  }

  private async handleClientMessage(ws: ExtendedWebSocket, msg: any) {
    const type = msg.type;

    if (type === "ping") {
      ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      return;
    }

    if (type === "auth") {
      if (typeof msg.token === "string") {
        await this.authenticateSocket(ws, msg.token);
      }
      return;
    }

    if (type === "subscribe") {
      const channel = msg.channel;
      if (!channel || typeof channel !== "string") {
        ws.send(
          JSON.stringify({
            type: "error",
            code: "VALIDATION_FAILED",
            message: "Missing channel property in subscribe message",
          })
        );
        return;
      }

      // Check permission for private user channels
      if (channel.startsWith("user:")) {
        const targetUserId = channel.replace("user:", "");
        if (!ws.userId || ws.userId !== targetUserId) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "FORBIDDEN",
              message: "Cannot subscribe to another user's private channel",
              subscription: channel,
            })
          );
          return;
        }
      }

      ws.subscriptions.add(channel);

      // Contract rule: Acks MUST NOT carry a top-level channel field
      ws.send(
        JSON.stringify({
          type: "subscribed",
          subscription: channel,
        })
      );

      // Immediate Snapshot Delivery for book subscriptions
      if (channel.startsWith("book:")) {
        const asset = channel.replace("book:", "");
        let snapshot = this.cachedBooks.get(asset);
        if (!snapshot) {
          try {
            snapshot = await engineClient.getBook(asset, 15);
            this.cachedBooks.set(asset, snapshot);
          } catch {}
        }
        if (snapshot) {
          ws.send(
            JSON.stringify({
              type: "BookSnapshot",
              channel,
              data: snapshot,
              ts: Date.now(),
            })
          );
        }
      }

      return;
    }

    if (type === "unsubscribe") {
      const channel = msg.channel;
      if (channel && typeof channel === "string") {
        ws.subscriptions.delete(channel);
        ws.send(
          JSON.stringify({
            type: "unsubscribed",
            subscription: channel,
          })
        );
      }
      return;
    }
  }

  public broadcastToChannel(channel: string, payload: any) {
    if (!this.wss) return;
    const msg = JSON.stringify(payload);

    for (const rawWs of this.wss.clients) {
      const ws = rawWs as ExtendedWebSocket;
      if (ws.readyState === WebSocket.OPEN && ws.subscriptions.has(channel)) {
        ws.send(msg);
      }
    }
  }

  public notifyUser(userId: string, payload: any) {
    this.broadcastToChannel(`user:${userId}`, payload);
  }

  public stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const wsGateway = new WebSocketGateway();
