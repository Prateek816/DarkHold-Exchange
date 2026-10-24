import { Request, Response, NextFunction } from "express";
import { v7 as uuidv7 } from "uuid";
import { prisma } from "@/config/db";
import { engineClient } from "@/engine/engineClient";
import { sseConsumer } from "@/engine/sseConsumer";
import { walletsService } from "@/modules/wallets/wallets.service";
import { serializeOrder } from "@/utils/serialization";
import { toEngineSymbol, toDbAssetIdentifier } from "@/utils/assetMapping";
import {
  UnauthenticatedError,
  AppError,
  ValidationError,
  PriceAboveCeilingError,
  AssetNotTradableError,
} from "@/utils/errors";

export class OrdersController {
  public async submitOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const idempotencyKey =
        (req.headers["idempotency-key"] as string) || req.body.idempotencyKey;

      // 1. Idempotency Check
      if (idempotencyKey) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
          include: { asset: true },
        });
        if (existing) {
          const statusCode = existing.status === "PENDING_SUBMIT" ? 202 : 200;
          return res.status(statusCode).json({
            order_id: existing.id,
            id: existing.id,
            status: existing.status,
            engine_seq: existing.engineSeq ? Number(existing.engineSeq) : null,
            data: serializeOrder(existing),
          });
        }
      }

      // 2. Resolve Asset (supports DB IDs like DARKHOLD-PASS-2026, DB symbols like DKH-FEST, and engine symbols like DFEST-WKND)
      const assetIdentifier = req.body.asset || req.body.assetId || req.body.symbol;
      if (!assetIdentifier) {
        throw new ValidationError("asset", "Asset identifier (symbol or ID) is required");
      }

      const mapped = toDbAssetIdentifier(assetIdentifier);
      const asset = await prisma.asset.findFirst({
        where: {
          OR: [
            { id: assetIdentifier },
            { symbol: assetIdentifier },
            ...(mapped ? [{ id: mapped.id }, { symbol: mapped.symbol }] : []),
          ],
        },
      });

      if (!asset) {
        throw new AppError(404, "ASSET_NOT_TRADABLE", `Asset not found: ${assetIdentifier}`);
      }

      if (asset.isHalted) {
        throw new AssetNotTradableError();
      }

      // 3. Validate Side, Type, Quantity, Price
      const side = (req.body.side || "").toUpperCase();
      if (side !== "BUY" && side !== "SELL") {
        throw new ValidationError("side", "Side must be BUY or SELL");
      }

      const rawType = (req.body.type || req.body.order_type || "LIMIT").toUpperCase();
      const type = rawType === "MARKET" ? "MARKET" : "LIMIT";

      const qty = parseInt(req.body.quantity ?? req.body.qty, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new ValidationError("quantity", "Quantity must be an integer >= 1");
      }

      const rawPrice = req.body.price ?? req.body.limit_price_minor;
      let price = rawPrice !== undefined ? BigInt(Math.round(Number(rawPrice))) : BigInt(0);

      // Price ceiling enforcement (single choke-point)
      if (type === "LIMIT") {
        if (price < BigInt(1)) {
          throw new ValidationError("price", "Price must be >= 1");
        }
        if (price % BigInt(10) !== BigInt(0)) {
          throw new ValidationError("price", "Price must be aligned to tick size (10)");
        }
        if (price > asset.ceilingPrice) {
          throw new PriceAboveCeilingError(
            Number(asset.ceilingPrice),
            asset.ceilingPct,
            Number(asset.faceValue)
          );
        }
      } else {
        // Market order: requires protection price
        if (price <= BigInt(0)) {
          price = asset.ceilingPrice; // Default to ceiling price protection
        }
        if (price > asset.ceilingPrice) {
          throw new PriceAboveCeilingError(
            Number(asset.ceilingPrice),
            asset.ceilingPct,
            Number(asset.faceValue)
          );
        }
      }

      // 4. Atomic Escrow Reservation
      const orderId = uuidv7();
      let reservedAmount = BigInt(0);
      let reservedUnits = 0;

      if (side === "BUY") {
        reservedAmount = BigInt(qty) * price;
        await walletsService.reserveOrderFunds(req.user.id, orderId, reservedAmount);
      } else {
        reservedUnits = qty;
        await walletsService.reserveHoldingUnits(req.user.id, asset.id, reservedUnits);
      }

      // 5. Persist order in DB as PENDING_SUBMIT
      const dbOrder = await prisma.order.create({
        data: {
          id: orderId,
          userId: req.user.id,
          assetId: asset.id,
          side: side as any,
          type: type as any,
          price,
          originalQuantity: qty,
          matchedQuantity: 0,
          remainingQuantity: qty,
          reservedAmount,
          reservedUnits,
          status: "PENDING_SUBMIT",
          settlementStatus: "PENDING",
          idempotencyKey,
          submitAttempts: 1,
          submittedAt: new Date(),
        },
        include: { asset: true },
      });

      // 6. Dispatch to Matching Engine
      try {
        const engineSymbol = toEngineSymbol(asset.symbol) || toEngineSymbol(asset.id) || asset.symbol;
        const reply = await engineClient.sendCommand({
          type: "SubmitOrder",
          order_id: orderId,
          asset: engineSymbol,
          user_id: req.user.id,
          side: side as any,
          order_type: type as any,
          tif: type === "MARKET" ? "IOC" : (req.body.tif || "GTC"),
          qty,
          price: Number(price),
        });

        if (reply.status === "ACCEPTED") {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              engineSeq: reply.seq ? BigInt(reply.seq) : undefined,
              engineEpoch: reply.engine_epoch,
            },
          });

          // Return HTTP 202 per contract specification
          return res.status(202).json({
            order_id: orderId,
            id: orderId,
            status: "PENDING_SUBMIT",
            engine_seq: reply.seq,
            data: serializeOrder(dbOrder),
          });
        } else if (reply.status === "REJECTED") {
          // Release reservation immediately
          if (side === "BUY") {
            await walletsService.releaseOrderFunds(req.user.id, orderId, reservedAmount);
          } else {
            await walletsService.releaseHoldingUnits(req.user.id, asset.id, reservedUnits);
          }
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: "REJECTED",
              rejectCode: reply.code,
            },
          });

          if (reply.code === "PRICE_ABOVE_COLLAR") {
            throw new PriceAboveCeilingError(
              Number(asset.ceilingPrice),
              asset.ceilingPct,
              Number(asset.faceValue)
            );
          }
          throw new AppError(422, "VALIDATION_FAILED", `Order rejected by engine: ${reply.code}`);
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (err.statusCode === 503 && err.code === "ENGINE_BUSY") {
          // Release escrow on ENGINE_BUSY per contract 4.10
          if (side === "BUY") {
            await walletsService.releaseOrderFunds(req.user.id, orderId, reservedAmount);
          } else {
            await walletsService.releaseHoldingUnits(req.user.id, asset.id, reservedUnits);
          }
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "REJECTED", rejectCode: "ENGINE_BUSY" },
          });
          res.setHeader("Retry-After", "1");
          throw new AppError(503, "ENGINE_BUSY", "Engine busy, please retry", { retry_after_seconds: 1 });
        }

        // Timeout or unavailable: keep in PENDING_SUBMIT for resolver
        res.setHeader("Retry-After", "1");
        throw new AppError(503, "ENGINE_UNAVAILABLE", "Engine unavailable, order pending submit", {
          retry_after_seconds: 1,
          order_id: orderId,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  public async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const statusParam = (req.query.status as string || "").toLowerCase();
      let statusFilter: any = undefined;

      if (statusParam === "open") {
        statusFilter = { in: ["PENDING_SUBMIT", "OPEN", "PARTIALLY_FILLED"] };
      } else if (statusParam === "closed") {
        statusFilter = { in: ["FILLED", "CANCELED", "REJECTED"] };
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const orders = await prisma.order.findMany({
        where: {
          userId: req.user.id,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: { asset: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const serialized = orders.map((o) => serializeOrder(o));

      // Dual compatibility: if requested via /me/orders or query status, wrap in items
      if (req.path.includes("/me/orders") || statusParam) {
        return res.json({
          items: serialized,
          next_cursor: null,
        });
      }

      // Legacy direct array response for existing frontend
      return res.json(serialized);
    } catch (error) {
      next(error);
    }
  }

  public async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { asset: true },
      });

      if (!order) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      }

      if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Cannot view another trader's order");
      }

      return res.json({
        data: serializeOrder(order),
        order: serializeOrder(order),
      });
    } catch (error) {
      next(error);
    }
  }

  public async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { asset: true },
      });

      if (!order) {
        throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
      }

      if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Cannot cancel another trader's order");
      }

      if (order.status === "PENDING_SUBMIT") {
        throw new AppError(409, "ORDER_NOT_CANCELABLE", "Order not yet submitted to matching engine", {
          reason: "not_yet_submitted",
          retry_after_ms: 500,
        });
      }

      if (order.status === "CANCELED") {
        return res.status(200).json({
          order_id: order.id,
          id: order.id,
          status: "CANCELED",
          remaining_qty: order.remainingQuantity,
          data: serializeOrder(order),
        });
      }

      if (order.status === "FILLED" || order.status === "REJECTED") {
        throw new AppError(409, "ORDER_NOT_CANCELABLE", "Order is already in a terminal state");
      }

      // Send CancelOrder to Matching Engine
      const reply = await engineClient.sendCommand({
        type: "CancelOrder",
        order_id: order.id,
        reason: "USER",
      });

      if (reply.status === "CANCELED" || reply.status === "ALREADY_CANCELED") {
        // Wait for SSE consumer offset to ensure released balances are visible
        if (reply.seq) {
          await sseConsumer.waitForOffset(reply.seq, 1000);
        }

        const updated = await prisma.order.findUnique({
          where: { id: order.id },
          include: { asset: true },
        });

        return res.status(200).json({
          order_id: order.id,
          id: order.id,
          status: "CANCELED",
          remaining_qty: reply.remaining_qty ?? order.remainingQuantity,
          data: serializeOrder(updated || order),
        });
      } else if (reply.status === "ALREADY_FILLED") {
        throw new AppError(409, "ORDER_NOT_CANCELABLE", "Order was already filled");
      } else {
        throw new AppError(409, "ORDER_NOT_CANCELABLE", `Cancel rejected: ${reply.status}`);
      }
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();
