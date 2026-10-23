import rateLimit from "express-rate-limit";
import { env } from "@/config/env";

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
    return res.status(429).json({
      code: "RATE_LIMITED",
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      context: { retry_after_seconds: retryAfter },
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only failed auth attempts count against limit
  handler: (req, res) => {
    const retryAfter = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
    return res.status(429).json({
      code: "RATE_LIMITED",
      message: `Too many failed authentication attempts. Locked for ${retryAfter}s.`,
      context: { retry_after_seconds: retryAfter },
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
    });
  },
});
