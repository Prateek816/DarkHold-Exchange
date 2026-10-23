import { Router } from "express";
import { tradesController } from "./trades.controller";

const router = Router();

router.get("/", (req, res, next) => tradesController.getAllTrades(req, res, next));
router.get("/:assetId", (req, res, next) =>
  tradesController.getTradesByAsset(req, res, next)
);

export default router;
