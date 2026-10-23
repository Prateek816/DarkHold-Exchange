import { Router } from "express";
import { auctionsController } from "./auctions.controller";
import { requireAuth } from "@/middleware/auth";
import { validateBody } from "@/middleware/validate";
import { createAuctionSchema, buyAuctionSchema } from "./auctions.schema";

const router = Router();

router.get("/", (req, res, next) => auctionsController.getAuctions(req, res, next));

router.get("/:id", (req, res, next) =>
  auctionsController.getAuctionById(req, res, next)
);

router.post("/", requireAuth, validateBody(createAuctionSchema), (req, res, next) =>
  auctionsController.createAuction(req, res, next)
);

router.post("/:id/buy", requireAuth, validateBody(buyAuctionSchema), (req, res, next) =>
  auctionsController.buyAuction(req, res, next)
);

router.post("/:id/accept", requireAuth, validateBody(buyAuctionSchema), (req, res, next) =>
  auctionsController.buyAuction(req, res, next)
);

router.post("/:id/cancel", requireAuth, (req, res, next) =>
  auctionsController.cancelAuction(req, res, next)
);

router.delete("/:id", requireAuth, (req, res, next) =>
  auctionsController.cancelAuction(req, res, next)
);

export default router;
