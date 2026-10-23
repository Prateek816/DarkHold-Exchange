import { Router } from "express";
import { adminController } from "./admin.controller";

const router = Router();

router.get("/reconciliation", (req, res, next) =>
  adminController.getReconciliation(req, res, next)
);

router.get("/ml-scores", (req, res, next) =>
  adminController.getMlScores(req, res, next)
);

export default router;
