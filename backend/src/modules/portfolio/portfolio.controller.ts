import { Request, Response, NextFunction } from "express";
import { walletsService } from "@/modules/wallets/wallets.service";
import { prisma } from "@/config/db";
import { serializeWallet, serializeOrder, serializeTrade, toNumber } from "@/utils/serialization";
import { UnauthenticatedError } from "@/utils/errors";

export class PortfolioController {
  public async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const wallet = await walletsService.getOrCreateWallet(req.user.id);
      const serializedWallet = serializeWallet(wallet, wallet.holdings);

      const openOrders = await prisma.order.findMany({
        where: {
          userId: req.user.id,
          status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const recentTrades = await prisma.trade.findMany({
        where: {
          OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
        },
        include: { asset: true },
        orderBy: { matchedAt: "desc" },
        take: 20,
      });

      // Calculate portfolio net valuation
      let totalHoldingsValue = 0;
      for (const h of serializedWallet.holdings) {
        totalHoldingsValue += h.total_units * h.current_price;
      }
      const netPortfolioValue = serializedWallet.total_credits + totalHoldingsValue;

      return res.json({
        wallet: serializedWallet,
        open_orders: openOrders.map(serializeOrder),
        recent_trades: recentTrades.map(serializeTrade),
        valuation: {
          cash_balance: serializedWallet.total_credits,
          holdings_value: totalHoldingsValue,
          net_portfolio_value: netPortfolioValue,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
