import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/db";
import { serializeTrade } from "@/utils/serialization";

export class TradesController {
  public async getTradesByAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const assetId = req.params.assetId || req.params.symbol;
      const trades = await prisma.trade.findMany({
        where: {
          OR: [{ assetId }, { asset: { symbol: assetId } }],
        },
        include: { asset: true },
        orderBy: { matchedAt: "desc" },
        take: 50,
      });

      return res.json(trades.map(serializeTrade));
    } catch (error) {
      next(error);
    }
  }

  public async getAllTrades(req: Request, res: Response, next: NextFunction) {
    try {
      const trades = await prisma.trade.findMany({
        include: { asset: true },
        orderBy: { matchedAt: "desc" },
        take: 50,
      });

      return res.json(trades.map(serializeTrade));
    } catch (error) {
      next(error);
    }
  }
}

export const tradesController = new TradesController();
