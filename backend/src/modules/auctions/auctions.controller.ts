import { Request, Response, NextFunction } from "express";
import { auctionService } from "@/services/auctionEngine";
import { UnauthenticatedError, AppError } from "@/utils/errors";
import { prisma } from "@/config/db";
import { serializeAuction } from "@/utils/serialization";

export class AuctionsController {
  public async getAuctions(req: Request, res: Response, next: NextFunction) {
    try {
      const auctions = await auctionService.getAuctions();
      if (req.path === "/" || req.path === "" || req.query.status) {
        return res.json({
          items: auctions,
          auctions,
        });
      }
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
        throw new AppError(404, "AUCTION_NOT_FOUND", "Auction not found");
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
          const serialized = serializeAuction(existing);
          return res.status(200).json({
            ...serialized,
            id: serialized.id || serialized.auction_id,
            auction: serialized,
            data: serialized,
          });
        }
      }

      const assetId = req.body.asset || req.body.assetId || req.body.symbol;
      const qty = parseInt(req.body.quantity ?? req.body.qty, 10);
      const startPrice = Number(req.body.start_price ?? req.body.startPrice);
      const floorPrice = Number(req.body.floor_price ?? req.body.floorPrice);
      const stepSeconds = req.body.step_seconds ?? req.body.stepSeconds ?? 15;
      const durationSeconds = req.body.duration_seconds;
      const durationMinutes = req.body.durationMinutes;

      const auction = await auctionService.createAuction({
        sellerId: req.user.id,
        assetId,
        qty,
        startPrice,
        floorPrice,
        durationMinutes,
        durationSeconds,
        stepSeconds,
        idempotencyKey,
      });

      return res.status(201).json({
        ...auction,
        id: auction.id || auction.auction_id,
        auction,
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }

  public async buyAuction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;
      const maxPrice = req.body.max_price ?? req.body.maxPrice;

      const result = await auctionService.buyAuction({
        auctionId: id,
        buyerId: req.user.id,
        maxPrice,
      });

      return res.status(200).json({
        ...result,
        ...result.receipt,
        accepted_price_minor: result.receipt?.price,
      });
    } catch (error) {
      next(error);
    }
  }

  public async cancelAuction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthenticatedError();
      const { id } = req.params;

      const result = await auctionService.cancelAuction(id, req.user.id);
      return res.status(200).json({
        id,
        status: "CANCELED",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const auctionsController = new AuctionsController();
