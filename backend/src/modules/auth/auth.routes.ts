import { Router } from "express";
import { authController } from "./auth.controller";
import { validateBody } from "@/middleware/validate";
import { loginSchema, registerSchema } from "./auth.schema";
import { authRateLimiter } from "@/middleware/rateLimiter";
import { requireAuth, optionalAuth } from "@/middleware/auth";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post("/login", authRateLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.get("/me", requireAuth, (req, res, next) =>
  authController.getMe(req, res, next)
);

// Also alias /session for frontend compatibility
router.get("/session", requireAuth, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.post("/logout", optionalAuth, (req, res, next) =>
  authController.logout(req, res, next)
);

export default router;
