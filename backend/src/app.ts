import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "@/config/env";
import { apiRateLimiter } from "@/middleware/rateLimiter";
import { errorHandler } from "@/middleware/errorHandler";
import { optionalAuth, requireAuth } from "@/middleware/auth";

// Routes
import authRoutes from "@/modules/auth/auth.routes";
import usersRoutes from "@/modules/users/users.routes";
import assetsRoutes from "@/modules/assets/assets.routes";
import walletsRoutes from "@/modules/wallets/wallets.routes";
import ordersRoutes from "@/modules/orders/orders.routes";
import auctionsRoutes from "@/modules/auctions/auctions.routes";
import tradesRoutes from "@/modules/trades/trades.routes";
import portfolioRoutes from "@/modules/portfolio/portfolio.routes";
import adminRoutes from "@/modules/admin/admin.routes";
import meRoutes from "@/modules/me/me.routes";
import { sseConsumer } from "@/engine/sseConsumer";

// Controllers for root-level endpoint aliases
import { assetsController } from "@/modules/assets/assets.controller";
import { walletsController } from "@/modules/wallets/wallets.controller";

export function createApp(): Express {
  const app = express();

  // Security & parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Auth-Token", "X-Request-ID"],
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  // General rate limiter
  app.use(apiRateLimiter);

  // Health check endpoints
  const healthHandler = (req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      uptime_s: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      consumer_seq: sseConsumer.getLastSeq(),
      consumer_epoch: sseConsumer.getEpoch(),
    });
  };
  app.get("/health", healthHandler);
  app.get("/healthz", healthHandler);

  // Metrics endpoint
  app.get("/metrics", (req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime_seconds: Math.floor(process.uptime()),
      consumer_seq: sseConsumer.getLastSeq(),
      consumer_epoch: sseConsumer.getEpoch(),
    });
  });

  // API modules - dual mounted for both /api/* (frontend) and /* (simulator / contract)
  app.use("/api/me", meRoutes);
  app.use("/me", meRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/auth", authRoutes);

  app.use("/api/users", usersRoutes);
  app.use("/users", usersRoutes);

  app.use("/api/assets", assetsRoutes);
  app.use("/assets", assetsRoutes);

  app.use("/api/wallet", walletsRoutes);
  app.use("/wallet", walletsRoutes);

  app.use("/api/orders", ordersRoutes);
  app.use("/orders", ordersRoutes);

  app.use("/api/auctions", auctionsRoutes);
  app.use("/auctions", auctionsRoutes);

  app.use("/api/trades", tradesRoutes);
  app.use("/trades", tradesRoutes);

  app.use("/api/portfolio", portfolioRoutes);
  app.use("/portfolio", portfolioRoutes);

  app.use("/api/admin", adminRoutes);
  app.use("/admin", adminRoutes);

  // Root-level aliases for direct frontend client compatibility
  app.get("/api/book/:assetId", optionalAuth, (req, res, next) =>
    assetsController.getBook(req, res, next)
  );
  app.get("/api/candles/:assetId", (req, res, next) =>
    assetsController.getCandles(req, res, next)
  );
  app.get("/candles/:assetId", (req, res, next) =>
    assetsController.getCandles(req, res, next)
  );
  app.get("/api/receipts", requireAuth, (req, res, next) =>
    walletsController.getTransactions(req, res, next)
  );

  // 404 Catch-all
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      code: "VALIDATION_FAILED",
      message: `Endpoint ${req.method} ${req.path} not found`,
      requestId: `REQ-404-${Date.now().toString(36)}`,
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
