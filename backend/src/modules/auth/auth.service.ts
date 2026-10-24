import bcrypt from "bcryptjs";
import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { UnauthenticatedError, ValidationError, AppError } from "@/utils/errors";
import { walletsService } from "@/modules/wallets/wallets.service";

export interface SessionInfo {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
  expires_at: number;
}

export class AuthService {
  public async register(params: {
    email: string;
    password: string;
    name?: string;
  }): Promise<SessionInfo> {
    const existing = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (existing) {
      throw new ValidationError("email", "Email is already registered.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);
    const name = params.name || params.email.split("@")[0];

    const user = await prisma.user.create({
      data: {
        email: params.email.toLowerCase(),
        name,
        passwordHash,
        role: "TRADER",
        status: "ACTIVE",
      },
    });

    // Create wallet with demo starting balance
    await walletsService.getOrCreateWallet(user.id);

    return this.createSession(user);
  }

  public async login(params: {
    email: string;
    password: string;
  }): Promise<SessionInfo> {
    const user = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthenticatedError("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new AppError(403, "FORBIDDEN", "Account has been suspended.");
    }

    const isMatch = await bcrypt.compare(params.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthenticatedError("Invalid email or password.");
    }

    return this.createSession(user);
  }

  public async createSession(user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }): Promise<SessionInfo> {
    const token = `dkh_sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}`;
    const expiresAt = new Date(Date.now() + env.SESSION_EXPIRY_HOURS * 3600 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      expires_at: expiresAt.getTime(),
    };
  }

  public async getSession(token: string): Promise<SessionInfo["user"] | null> {
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

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
  }

  public async logout(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
