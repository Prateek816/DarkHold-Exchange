import { Request, Response, NextFunction } from "express";
import { walletsService } from "./wallets.service";
import { serializeWallet } from "@/utils/serialization";
import { prisma } from "@/config/db";
import { UnauthenticatedError } from "@/utils/errors";

export class WalletsController {
  public async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const wallet = await walletsService.getOrCreateWallet(req.user.id);
      return res.json(serializeWallet(wallet, wallet.holdings));
    } catch (error) {
      next(error);
    }
  }

  public async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const wallet = await walletsService.getOrCreateWallet(req.user.id);

      // Get trades and ledger entries for user
      const userTrades = await prisma.trade.findMany({
        where: {
          OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
        },
        include: { asset: true },
        orderBy: { matchedAt: "desc" },
        take: 50,
      });

      const receipts = userTrades.map((t) => {
        const isBuyer = t.buyerId === req.user!.id;
        const total = Number(t.totalCost);
        return {
          trade_id: t.id,
          ledger_tx_id: `LTX-${t.id.replace("TRD-", "")}`,
          asset_id: t.assetId,
          asset_name: t.asset.name,
          side: isBuyer ? ("BUY" as const) : ("SELL" as const),
          qty: t.quantity,
          price: Number(t.executionPrice),
          total_cost: total,
          counterparty_id: isBuyer ? t.sellerId : t.buyerId,
          counterparty_is_sim: t.isSim,
          matched_at: t.matchedAt.getTime(),
          settled_at: t.settledAt.getTime(),
          balance_before: Number(wallet.availableBalance) + (isBuyer ? total : -total),
          balance_after: Number(wallet.availableBalance),
          settlement_status: "COMPLETED" as const,
        };
      });

      return res.json(receipts);
    } catch (error) {
      next(error);
    }
  }
}

export const walletsController = new WalletsController();
