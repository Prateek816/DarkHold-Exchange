import { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/db";
import { UnauthenticatedError, ForbiddenError } from "@/utils/errors";
import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function extractUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  let token: string | undefined;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Cookie
  if (!token && req.cookies && req.cookies.dkh_auth_token) {
    token = req.cookies.dkh_auth_token;
  }

  // 3. Custom Header
  if (!token && req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"] as string;
  }

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status !== "ACTIVE"
    ) {
      return null;
    }

    req.sessionToken = token;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
  } catch (err) {
    console.error("Session lookup error:", err);
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    if (!user) {
      throw new UnauthenticatedError();
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    if (user) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthenticatedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}
