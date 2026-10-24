import { Router } from "express";
import { walletsController } from "./wallets.controller";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req, res, next) =>
  walletsController.getWallet(req, res, next)
);

router.get("/transactions", requireAuth, (req, res, next) =>
  walletsController.getTransactions(req, res, next)
);

export default router;
