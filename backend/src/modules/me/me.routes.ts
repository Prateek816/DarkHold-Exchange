import { Router } from "express";
import { meController } from "./me.controller";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req, res, next) => meController.getProfile(req, res, next));
router.get("/wallet", requireAuth, (req, res, next) => meController.getWallet(req, res, next));
router.get("/holdings", requireAuth, (req, res, next) => meController.getHoldings(req, res, next));
router.get("/orders", requireAuth, (req, res, next) => meController.getOrders(req, res, next));
router.get("/transactions", requireAuth, (req, res, next) => meController.getTransactions(req, res, next));

export default router;
