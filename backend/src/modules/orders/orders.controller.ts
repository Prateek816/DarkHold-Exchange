import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/db";
import { matchingEngine } from "@/services/matchingEngine";
import { serializeOrder } from "@/utils/serialization";
import { UnauthenticatedError, AppError } from "@/utils/errors";

export class OrdersController {
  public async submitOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const idempotencyKey =
        (req.headers["idempotency-key"] as string) || req.body.idempotencyKey;

      // Idempotency check
      if (idempotencyKey) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          return res.status(200).json({ data: serializeOrder(existing) });
        }
      }

      const order = await matchingEngine.submitOrder({
        userId: req.user.id,
        assetId: req.body.assetId,
        side: req.body.side,
        type: req.body.type,
        price: BigInt(req.body.price),
        qty: req.body.qty,
        idempotencyKey,
      });

      return res.status(201).json({ data: serializeOrder(order) });
    } catch (error) {
      next(error);
    }
  }

  public async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const orders = await prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });

      return res.json(orders.map(serializeOrder));
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
      });

      if (!order) {
        throw new AppError(404, "VALIDATION_FAILED", "Order not found");
      }

      if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Cannot view another trader's order");
      }

      return res.json({ data: serializeOrder(order) });
    } catch (error) {
      next(error);
    }
  }

  public async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;

      const canceled = await matchingEngine.cancelOrder(id, req.user.id);
      return res.json({ data: serializeOrder(canceled) });
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();
