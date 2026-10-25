import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/db";
import { serializeTrade } from "@/utils/serialization";
import { ENGINE_TO_DB_MAP } from "@/utils/assetMapping";

export class TradesController {
  public async getTradesByAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const rawAsset = req.params.assetId || req.params.symbol;
      const mapped = ENGINE_TO_DB_MAP[rawAsset];
      const targetId = mapped ? mapped.id : rawAsset;
      const targetSymbol = mapped ? mapped.symbol : rawAsset;
      const trades = await prisma.trade.findMany({
        where: {
          OR: [
            { assetId: targetId },
            { asset: { symbol: targetSymbol } },
            { assetId: rawAsset },
            { asset: { symbol: rawAsset } },
          ],
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
