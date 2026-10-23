import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/config/db";
import bcrypt from "bcryptjs";

describe("Complete Landing Page & Authentication Flow Test Suite", () => {
  const testEmail = `test_trader_${Date.now()}@darkhold.io`;
  const testPassword = "SecurePass2026!";
  const testName = "Test Trader";

  // 1. Opening the landing page without authentication
  it("1. GET /health and public API endpoints allow access without authentication", async () => {
    const healthRes = await request(app).get("/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe("ok");

    // Public book endpoint
    const bookRes = await request(app).get("/api/book/DARKHOLD-PASS-2026");
    expect(bookRes.status).toBe(200);
  });

  // 2. Navigating to auth endpoints (verifying registration and login schema validation)
  it("2. Auth endpoints reject malformed payloads without crashing", async () => {
    const malformedRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid-email" });

    expect(malformedRes.status).toBe(400);
    expect(malformedRes.body.code).toBe("VALIDATION_FAILED");
  });

  // 3. Successful registration
  it("3. POST /api/auth/register creates user, hashes password, creates initial wallet, and sets session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.role).toBe("TRADER");

    // Check cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes("dkh_auth_token"))).toBe(true);

    // Verify user exists in database with hashed password
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() },
      include: { wallet: true },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash).not.toBe(testPassword);
    const passMatches = await bcrypt.compare(testPassword, dbUser!.passwordHash);
    expect(passMatches).toBe(true);

    // Verify wallet with 500,000 cents ($5,000.00) starting balance
    expect(dbUser?.wallet).not.toBeNull();
    expect(Number(dbUser?.wallet?.availableBalance)).toBe(500000);
    expect(Number(dbUser?.wallet?.totalBalance)).toBe(500000);
  });

  // 4. Duplicate registration rejection
  it("4. POST /api/auth/register rejects duplicate email with VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        name: "Duplicate Attempt",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.context?.field).toBe("email");
  });

  // 5. Successful login
  it("5. POST /api/auth/login authenticates registered user and sets HttpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testEmail.toLowerCase());

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes("dkh_auth_token"))).toBe(true);
    expect(cookies.some((c: string) => c.toLowerCase().includes("httponly"))).toBe(true);
  });

  // 6. Invalid login credentials
  it("6. POST /api/auth/login rejects incorrect password with UNAUTHENTICATED error", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  // 7. Accessing a protected route without a session
  it("7. GET /api/wallet, /api/orders, /api/portfolio reject unauthenticated requests with 401", async () => {
    const walletRes = await request(app).get("/api/wallet");
    expect(walletRes.status).toBe(401);
    expect(walletRes.body.code).toBe("UNAUTHENTICATED");

    const ordersRes = await request(app).get("/api/orders");
    expect(ordersRes.status).toBe(401);
    expect(ordersRes.body.code).toBe("UNAUTHENTICATED");

    const portfolioRes = await request(app).get("/api/portfolio");
    expect(portfolioRes.status).toBe(401);
    expect(portfolioRes.body.code).toBe("UNAUTHENTICATED");
  });

  // 8. Accessing a protected route with a valid session
  it("8. Protected routes succeed when providing valid session cookie or Authorization header", async () => {
    // Login to get token and cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    const cookie = loginRes.headers["set-cookie"];
    const token = loginRes.body.token;

    // Via Cookie
    const walletCookieRes = await request(app)
      .get("/api/wallet")
      .set("Cookie", cookie);
    expect(walletCookieRes.status).toBe(200);
    expect(walletCookieRes.body.available_credits).toBe(500000);

    // Via Bearer Header
    const walletBearerRes = await request(app)
      .get("/api/wallet")
      .set("Authorization", `Bearer ${token}`);
    expect(walletBearerRes.status).toBe(200);
    expect(walletBearerRes.body.available_credits).toBe(500000);
  });

  // 9. Restoring the session on refresh (/api/auth/me)
  it("9. GET /api/auth/me restores authenticated user profile from active session", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    const cookie = loginRes.headers["set-cookie"];

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty("user");
    expect(meRes.body.user.email).toBe(testEmail.toLowerCase());
    expect(meRes.body.user.name).toBe(testName);
    expect(meRes.body.user.role).toBe("TRADER");
  });

  // 10. Logging out and invalidating the session
  it("10. POST /api/auth/logout invalidates session in DB and clears cookie", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    const cookie = loginRes.headers["set-cookie"];
    const token = loginRes.body.token;

    // Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Cookie is cleared
    const clearCookies = logoutRes.headers["set-cookie"];
    expect(clearCookies).toBeDefined();

    // Verify session revoked in database
    const dbSession = await prisma.session.findUnique({
      where: { token },
    });
    expect(dbSession?.revokedAt).not.toBeNull();

    // Subsequent call to /api/auth/me must now return 401
    const verifyMeRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(verifyMeRes.status).toBe(401);
  });

  // 11. Role authorization: Preventing ordinary users from accessing admin endpoints
  it("11. Ordinary TRADER cannot access admin endpoints (403 FORBIDDEN), while ADMIN can", async () => {
    // 1. TRADER session
    const traderLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    const traderCookie = traderLogin.headers["set-cookie"];

    const traderAdminRes = await request(app)
      .get("/api/admin/reconciliation")
      .set("Cookie", traderCookie);
    expect(traderAdminRes.status).toBe(403);
    expect(traderAdminRes.body.code).toBe("FORBIDDEN");

    const traderMlRes = await request(app)
      .get("/api/admin/ml-scores")
      .set("Cookie", traderCookie);
    expect(traderMlRes.status).toBe(403);
    expect(traderMlRes.body.code).toBe("FORBIDDEN");

    // 2. ADMIN session (seeded admin@darkhold.io)
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@darkhold.io", password: "darkhold2026!" });
    expect(adminLogin.status).toBe(200);

    const adminCookie = adminLogin.headers["set-cookie"];

    const adminRes = await request(app)
      .get("/api/admin/reconciliation")
      .set("Cookie", adminCookie);
    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body)).toBe(true);
    expect(adminRes.body.length).toBe(8);
  });

  // 12. Preventing users from self-assigning ADMIN privileges
  it("12. Registration payload ignores requested role and strictly creates TRADER role", async () => {
    const hackerEmail = `hacker_${Date.now()}@darkhold.io`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: hackerEmail,
        password: "HackerPassword2026!",
        role: "ADMIN", // Malicious self-grant attempt
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("TRADER");

    const dbHacker = await prisma.user.findUnique({
      where: { email: hackerEmail },
    });
    expect(dbHacker?.role).toBe("TRADER");
  });

  // 13. Suspended user session invalidation
  it("13. Suspended user cannot log in or use existing sessions", async () => {
    const suspendedEmail = `suspended_${Date.now()}@darkhold.io`;
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        email: suspendedEmail,
        password: "SuspendedPass2026!",
      });
    const sessionToken = regRes.body.token;

    // Suspend user in DB
    await prisma.user.update({
      where: { email: suspendedEmail },
      data: { status: "SUSPENDED" },
    });

    // Login attempt rejected
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: suspendedEmail,
        password: "SuspendedPass2026!",
      });
    expect(loginRes.status).toBe(403);

    // Existing session rejected
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${sessionToken}`);
    expect(meRes.status).toBe(401);
  });
});
