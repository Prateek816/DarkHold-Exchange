import { Router } from "express";
import { assetsController } from "./assets.controller";
import { optionalAuth } from "@/middleware/auth";

const router = Router();

router.get("/", (req, res, next) => assetsController.getAssets(req, res, next));
router.get("/:id", (req, res, next) => assetsController.getAsset(req, res, next));
router.get("/:assetId/book", optionalAuth, (req, res, next) =>
  assetsController.getBook(req, res, next)
);
router.get("/:assetId/candles", (req, res, next) =>
  assetsController.getCandles(req, res, next)
);

export default router;
