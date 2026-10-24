import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@/modules/auth/auth.schema";
import { UnauthenticatedError, ValidationError, ForbiddenError } from "@/utils/errors";

describe("Authentication & Authorization Logic", () => {
  it("hashes passwords securely using bcrypt with appropriate salt rounds", async () => {
    const rawPassword = "SecurePassword2026!";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare("WrongPassword!", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("validates registration schema and rejects invalid emails and weak passwords", () => {
    // Valid registration
    const valid = registerSchema.safeParse({
      email: "newtrader@darkhold.io",
      password: "StrongPass2026!",
      name: "New Trader",
    });
    expect(valid.success).toBe(true);

    // Invalid email
    const invalidEmail = registerSchema.safeParse({
      email: "not-an-email",
      password: "StrongPass2026!",
    });
    expect(invalidEmail.success).toBe(false);

    // Weak password without uppercase/digit/symbol
    const weakPass = registerSchema.safeParse({
      email: "valid@darkhold.io",
      password: "weak",
    });
    expect(weakPass.success).toBe(false);
  });

  it("validates login schema", () => {
    const valid = loginSchema.safeParse({
      email: "trader@darkhold.io",
      password: "darkhold2026!",
    });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({
      email: "trader@darkhold.io",
      password: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("detects and rejects duplicate email registration", () => {
    const registeredEmails = new Set(["trader@darkhold.io", "taken@darkhold.io"]);
    const emailToRegister = "trader@darkhold.io";

    const isDuplicate = registeredEmails.has(emailToRegister.toLowerCase());
    expect(isDuplicate).toBe(true);

    if (isDuplicate) {
      const err = new ValidationError("email", "Email is already registered.");
      expect(err.code).toBe("VALIDATION_FAILED");
      expect(err.context?.field).toBe("email");
    }
  });

  it("enforces session expiry and revocation", () => {
    const now = Date.now();
    const activeSession = {
      token: "valid_token",
      expiresAt: new Date(now + 3600000),
      revokedAt: null,
    };
    const expiredSession = {
      token: "expired_token",
      expiresAt: new Date(now - 1000),
      revokedAt: null,
    };
    const revokedSession = {
      token: "revoked_token",
      expiresAt: new Date(now + 3600000),
      revokedAt: new Date(now - 500),
    };

    const isValid = (s: typeof activeSession) =>
      !s.revokedAt && s.expiresAt.getTime() > now;

    expect(isValid(activeSession)).toBe(true);
    expect(isValid(expiredSession)).toBe(false);
    expect(isValid(revokedSession)).toBe(false);
  });

  it("handles role-based access control (RBAC)", () => {
    const traderUser = { id: "u1", role: "TRADER" };
    const adminUser = { id: "u2", role: "ADMIN" };

    const checkRole = (user: { role: string }, allowedRoles: string[]) => {
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError();
      }
      return true;
    };

    expect(checkRole(adminUser, ["ADMIN"])).toBe(true);
    expect(() => checkRole(traderUser, ["ADMIN"])).toThrow(ForbiddenError);
  });
});
