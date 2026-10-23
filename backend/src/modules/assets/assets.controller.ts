import { Request, Response, NextFunction } from "express";
import { assetsService } from "./assets.service";
import { AppError } from "@/utils/errors";

export class AssetsController {
  public async getAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const assets = await assetsService.getAssets();
      return res.json(assets);
    } catch (error) {
      next(error);
    }
  }

  public async getAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const asset = await assetsService.getAsset(id);
      if (!asset) {
        throw new AppError(404, "ASSET_NOT_TRADABLE", `Asset ${id} not found`);
      }
      return res.json(asset);
    } catch (error) {
      next(error);
    }
  }

  public async getBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const snapshot = await assetsService.getBook(assetId, req.user?.id);
      return res.json(snapshot);
    } catch (error) {
      next(error);
    }
  }

  public async getCandles(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const interval = (req.query.interval as "5s" | "1m") || "1m";
      const candles = await assetsService.getCandles(assetId, interval);
      return res.json(candles);
    } catch (error) {
      next(error);
    }
  }
}

export const assetsController = new AssetsController();
