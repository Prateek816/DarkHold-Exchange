import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import url from "url";
import { prisma } from "@/config/db";
import { sseConsumer } from "@/engine/sseConsumer";
import { engineClient } from "@/engine/engineClient";
import { candleService } from "./candleService";
import { BookSnapshot, EngineEvent, TradeExecutedEvent, OrderAcceptedEvent, OrderRejectedEvent, OrderPartiallyFilledEvent, OrderFilledEvent, OrderCanceledEvent } from "@/engine/types";
import { resolveAssetIdentifiers } from "@/utils/assetMapping";

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

      // Extract optional token from query parameter ?token=... or Cookie
      const parsedUrl = url.parse(request.url || "", true);
      let token = (parsedUrl.query.token as string) || null;
      if (!token && request.headers.cookie) {
        const cookies = request.headers.cookie.split(";").reduce((acc: Record<string, string>, c) => {
          const [k, v] = c.trim().split("=");
          if (k && v) acc[k] = decodeURIComponent(v);
          return acc;
        }, {});
        token = cookies["dkh_auth_token"] || null;
      }

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
      const { id, symbol, engineSymbol } = resolveAssetIdentifiers(snapshot.asset);
      const payloadData = {
        ...snapshot,
        asset: symbol,
        symbol,
        asset_id: id,
      };

      const payload = {
        type: "BookSnapshot",
        channel: `book:${symbol}`,
        data: payloadData,
        ts: Date.now(),
      };

      this.broadcastToChannel(`book:${engineSymbol}`, { ...payload, channel: `book:${engineSymbol}` });
      this.broadcastToChannel(`book:${symbol}`, payload);
      if (id !== symbol) {
        this.broadcastToChannel(`book:${id}`, { ...payload, channel: `book:${id}` });
      }
    });

    // 2. Events from engine (TradeExecuted, OrderAccepted, OrderRejected, etc.)
    sseConsumer.onEvent((event: EngineEvent) => {
      if (event.type === "OrderAccepted") {
        const e = event as OrderAcceptedEvent;
        this.notifyUser(e.user_id, {
          type: "OrderUpdate",
          channel: `user:${e.user_id}`,
          data: {
            order_id: e.order_id,
            status: "OPEN",
            price: e.price,
            qty: e.qty,
            side: e.side,
          },
          ts: Date.now(),
        });
      } else if (event.type === "OrderPartiallyFilled") {
        const e = event as OrderPartiallyFilledEvent;
        this.notifyUser(e.user_id, {
          type: "OrderUpdate",
          channel: `user:${e.user_id}`,
          data: {
            order_id: e.order_id,
            status: "PARTIALLY_FILLED",
            matched_qty: e.filled_qty,
            remaining_qty: e.remaining_qty,
          },
          ts: Date.now(),
        });
      } else if (event.type === "OrderFilled") {
        const e = event as OrderFilledEvent;
        this.notifyUser(e.user_id, {
          type: "OrderUpdate",
          channel: `user:${e.user_id}`,
          data: {
            order_id: e.order_id,
            status: "FILLED",
            matched_qty: e.filled_qty,
            remaining_qty: 0,
          },
          ts: Date.now(),
        });
      } else if (event.type === "OrderCanceled") {
        const e = event as OrderCanceledEvent;
        this.notifyUser(e.user_id, {
          type: "OrderUpdate",
          channel: `user:${e.user_id}`,
          data: {
            order_id: e.order_id,
            status: "CANCELED",
            cancel_reason: e.reason,
            matched_qty: e.filled_qty,
            remaining_qty: e.remaining_qty,
          },
          ts: Date.now(),
        });
      } else if (event.type === "OrderRejected") {
        const e = event as OrderRejectedEvent;
        this.notifyUser(e.user_id, {
          type: "OrderUpdate",
          channel: `user:${e.user_id}`,
          data: {
            order_id: e.order_id,
            status: "REJECTED",
            reject_code: e.code,
          },
          ts: Date.now(),
        });
      } else if (event.type === "TradeExecuted") {
        const te = event as TradeExecutedEvent;
        const { id, symbol, engineSymbol } = resolveAssetIdentifiers(te.asset);

        const tickData = {
          asset: symbol,
          symbol,
          asset_id: id,
          trade_id: te.trade_id,
          id: te.trade_id,
          price: te.price,
          qty: te.qty,
          ts: te.ts,
          timestamp: te.ts,
          taker_side: te.taker_side,
          aggressor_side: te.taker_side,
          seq: te.seq,
          is_sim: te.buy_user_id.startsWith("sim_") || te.sell_user_id.startsWith("sim_"),
          buyer_is_simulated: te.buy_user_id.startsWith("sim_"),
          seller_is_simulated: te.sell_user_id.startsWith("sim_"),
        };

        const tickPayload = {
          type: "TradeTick",
          channel: `trades:${symbol}`,
          data: tickData,
          ts: Date.now(),
        };

        this.broadcastToChannel(`trades:${engineSymbol}`, { ...tickPayload, channel: `trades:${engineSymbol}` });
        this.broadcastToChannel(`trades:${symbol}`, tickPayload);
        if (id !== symbol) {
          this.broadcastToChannel(`trades:${id}`, { ...tickPayload, channel: `trades:${id}` });
        }

        // Market stats tick
        this.broadcastToChannel("market", {
          type: "MarketStats",
          channel: "market",
          data: {
            asset: symbol,
            symbol,
            asset_id: id,
            last_price: te.price,
            last_ts: te.ts,
            last_seq: te.seq,
          },
          ts: Date.now(),
        });

        // Private updates to buyer and seller
        this.notifyUser(te.buy_user_id, {
          type: "OrderUpdate",
          channel: `user:${te.buy_user_id}`,
          data: {
            order_id: te.buy_order_id,
            symbol,
            asset_id: id,
            side: "BUY",
            matched_qty: te.qty,
            remaining_qty: te.buy_remaining,
            status: te.buy_remaining === 0 ? "FILLED" : "PARTIALLY_FILLED",
          },
          ts: Date.now(),
        });

        this.notifyUser(te.sell_user_id, {
          type: "OrderUpdate",
          channel: `user:${te.sell_user_id}`,
          data: {
            order_id: te.sell_order_id,
            symbol,
            asset_id: id,
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
      const { id, symbol, engineSymbol } = resolveAssetIdentifiers(asset);
      const candlePayload = {
        type: "CandleUpdate",
        channel: `candles:${symbol}:${candle.interval}`,
        data: {
          asset: symbol,
          symbol,
          asset_id: id,
          candle,
        },
        ts: Date.now(),
      };

      this.broadcastToChannel(`candles:${engineSymbol}:${candle.interval}`, {
        ...candlePayload,
        channel: `candles:${engineSymbol}:${candle.interval}`,
      });
      this.broadcastToChannel(`candles:${symbol}:${candle.interval}`, candlePayload);
      if (id !== symbol) {
        this.broadcastToChannel(`candles:${id}:${candle.interval}`, {
          ...candlePayload,
          channel: `candles:${id}:${candle.interval}`,
        });
      }
    });
  }

  private async authenticateSocket(ws: ExtendedWebSocket, token: string) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && !session.revokedAt && session.expiresAt > new Date() && session.user.status === "ACTIVE") {
        ws.userId = session.userId;
        ws.send(
          JSON.stringify({
            type: "authenticated",
            userId: session.userId,
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "error",
            code: "UNAUTHENTICATED",
            message: "Invalid or expired session token",
          })
        );
      }
    } catch (err) {
      console.error("[WebSocketGateway] Auth error:", err);
      ws.send(
        JSON.stringify({
          type: "error",
          code: "UNAUTHENTICATED",
          message: "Authentication failed",
        })
      );
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
        const rawTargetId = channel.replace("user:", "");
        if (rawTargetId === "current") {
          if (!ws.userId) {
            ws.send(
              JSON.stringify({
                type: "error",
                code: "FORBIDDEN",
                message: "Cannot subscribe to private channel without authentication",
                subscription: channel,
              })
            );
            return;
          }
          ws.subscriptions.add(`user:${ws.userId}`);
          ws.subscriptions.add("user:current");
        } else if (!ws.userId || ws.userId !== rawTargetId) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "FORBIDDEN",
              message: "Cannot subscribe to another user's private channel",
              subscription: channel,
            })
          );
          return;
        } else {
          ws.subscriptions.add(channel);
        }
      } else if (channel.startsWith("book:")) {
        const asset = channel.replace("book:", "");
        const { id, symbol, engineSymbol } = resolveAssetIdentifiers(asset);
        ws.subscriptions.add(`book:${id}`);
        ws.subscriptions.add(`book:${symbol}`);
        ws.subscriptions.add(`book:${engineSymbol}`);
      } else if (channel.startsWith("trades:")) {
        const asset = channel.replace("trades:", "");
        const { id, symbol, engineSymbol } = resolveAssetIdentifiers(asset);
        ws.subscriptions.add(`trades:${id}`);
        ws.subscriptions.add(`trades:${symbol}`);
        ws.subscriptions.add(`trades:${engineSymbol}`);
      } else if (channel.startsWith("candles:")) {
        const parts = channel.replace("candles:", "").split(":");
        const asset = parts[0];
        const interval = parts[1] || "1m";
        const { id, symbol, engineSymbol } = resolveAssetIdentifiers(asset);
        ws.subscriptions.add(`candles:${id}:${interval}`);
        ws.subscriptions.add(`candles:${symbol}:${interval}`);
        ws.subscriptions.add(`candles:${engineSymbol}:${interval}`);
      } else {
        ws.subscriptions.add(channel);
      }

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
        const { id, symbol, engineSymbol } = resolveAssetIdentifiers(asset);
        let snapshot = this.cachedBooks.get(engineSymbol) || this.cachedBooks.get(symbol) || this.cachedBooks.get(asset);
        if (!snapshot) {
          try {
            snapshot = await engineClient.getBook(engineSymbol, 15);
            this.cachedBooks.set(engineSymbol, snapshot);
          } catch {}
        }
        if (snapshot) {
          const payloadData = {
            ...snapshot,
            asset: symbol,
            symbol,
            asset_id: id,
          };
          ws.send(
            JSON.stringify({
              type: "BookSnapshot",
              channel,
              data: payloadData,
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
