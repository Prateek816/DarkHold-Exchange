import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/db";
import { walletsService } from "@/modules/wallets/wallets.service";
import { serializeWallet, serializeHolding, serializeOrder } from "@/utils/serialization";
import { UnauthenticatedError } from "@/utils/errors";

export class MeController {
  public async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      return res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        is_simulated: req.user.id.startsWith("sim_"),
        rate_tier: "STANDARD",
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const wallet = await walletsService.getOrCreateWallet(req.user.id);
      return res.json(serializeWallet(wallet, wallet.holdings));
    } catch (error) {
      next(error);
    }
  }

  public async getHoldings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const wallet = await walletsService.getOrCreateWallet(req.user.id);
      const holdings = wallet.holdings.map((h) => serializeHolding(h));
      return res.json({
        items: holdings,
        holdings,
      });
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
      return res.json({
        items: serialized,
        orders: serialized,
        next_cursor: null,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;

      const userTrades = await prisma.trade.findMany({
        where: {
          OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
        },
        include: { asset: true },
        orderBy: { matchedAt: "desc" },
        take: limit,
      });

      const items = userTrades.map((t) => {
        const isBuyer = t.buyerId === req.user!.id;
        const total = Number(t.totalCost);
        const priceNum = Number(t.executionPrice);
        const tsNum = t.ts ? Number(t.ts) : t.matchedAt.getTime();

        return {
          transaction_id: `TX-${t.id}`,
          venue: "BOOK",
          trade_id: t.id,
          auction_id: null,
          order_id: isBuyer ? t.buyOrderId : t.sellOrderId,
          asset_id: t.assetId,
          symbol: t.asset.symbol,
          asset: t.asset.symbol,
          side: isBuyer ? ("BUY" as const) : ("SELL" as const),
          price_minor: priceNum,
          price: priceNum,
          qty: t.quantity,
          quantity: t.quantity,
          total_minor: total,
          ts: tsNum,
          state: t.state || "SETTLED",
          settled_at: t.settledAt ? t.settledAt.toISOString() : null,
          matched_at: t.matchedAt.toISOString(),
        };
      });

      return res.json({
        items,
        receipts: items,
        next_cursor: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const meController = new MeController();
