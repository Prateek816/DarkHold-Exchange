import { Router } from "express";
import { adminController } from "./admin.controller";
import { requireAuth, requireRole } from "@/middleware/auth";
import { UserRole } from "@prisma/client";

const router = Router();

router.get(
  "/reconciliation",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  (req, res, next) => adminController.getReconciliation(req, res, next)
);

router.get(
  "/ml-scores",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  (req, res, next) => adminController.getMlScores(req, res, next)
);

export default router;
