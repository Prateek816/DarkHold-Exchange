import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { env } from "@/config/env";
import { UnauthenticatedError } from "@/utils/errors";

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await authService.register(req.body);
      res.cookie("dkh_auth_token", session.token, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        maxAge: env.SESSION_EXPIRY_HOURS * 3600 * 1000,
      });
      return res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await authService.login(req.body);
      res.cookie("dkh_auth_token", session.token, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        maxAge: env.SESSION_EXPIRY_HOURS * 3600 * 1000,
      });
      return res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthenticatedError();
      }
      return res.status(200).json({ user: req.user });
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.sessionToken) {
        await authService.logout(req.sessionToken);
      }
      res.clearCookie("dkh_auth_token");
      return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
