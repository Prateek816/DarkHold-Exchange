import { Request, Response, NextFunction } from "express";
import { auctionService } from "@/services/auctionEngine";
import { UnauthenticatedError, AppError } from "@/utils/errors";
import { prisma } from "@/config/db";
import { serializeAuction } from "@/utils/serialization";

export class AuctionsController {
  public async getAuctions(req: Request, res: Response, next: NextFunction) {
    try {
      const auctions = await auctionService.getAuctions();
      return res.json(auctions);
    } catch (error) {
      next(error);
    }
  }

  public async getAuctionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const auction = await auctionService.getAuctionById(id);
      if (!auction) {
        throw new AppError(404, "VALIDATION_FAILED", "Auction not found");
      }
      return res.json(auction);
    } catch (error) {
      next(error);
    }
  }

  public async createAuction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();

      const idempotencyKey =
        (req.headers["idempotency-key"] as string) || req.body.idempotencyKey;

      if (idempotencyKey) {
        const existing = await prisma.auction.findUnique({
          where: { idempotencyKey },
          include: { asset: true },
        });
        if (existing) {
          return res.status(200).json({ data: serializeAuction(existing) });
        }
      }

      const auction = await auctionService.createAuction({
        sellerId: req.user.id,
        assetId: req.body.assetId,
        qty: req.body.qty,
        startPrice: req.body.startPrice,
        floorPrice: req.body.floorPrice,
        durationMinutes: req.body.durationMinutes,
        stepSeconds: req.body.stepSeconds,
        idempotencyKey,
      });

      return res.status(201).json({ data: auction });
    } catch (error) {
      next(error);
    }
  }

  public async buyAuction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;
      const maxPrice = req.body.maxPrice;

      const result = await auctionService.buyAuction({
        auctionId: id,
        buyerId: req.user.id,
        maxPrice,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async cancelAuction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;

      const result = await auctionService.cancelAuction(id, req.user.id);
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const auctionsController = new AuctionsController();
