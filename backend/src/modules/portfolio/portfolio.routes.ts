import { Router } from "express";
import { portfolioController } from "./portfolio.controller";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req, res, next) =>
  portfolioController.getPortfolio(req, res, next)
);

export default router;
