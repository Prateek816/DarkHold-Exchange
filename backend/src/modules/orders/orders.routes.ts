import { Router } from "express";
import { ordersController } from "./orders.controller";
import { requireAuth } from "@/middleware/auth";
import { validateBody } from "@/middleware/validate";
import { submitOrderSchema } from "./orders.schema";

const router = Router();

router.post("/", requireAuth, validateBody(submitOrderSchema), (req, res, next) =>
  ordersController.submitOrder(req, res, next)
);

router.get("/", requireAuth, (req, res, next) =>
  ordersController.getOrders(req, res, next)
);

router.get("/:id", requireAuth, (req, res, next) =>
  ordersController.getOrderById(req, res, next)
);

router.post("/:id/cancel", requireAuth, (req, res, next) =>
  ordersController.cancelOrder(req, res, next)
);

export default router;
