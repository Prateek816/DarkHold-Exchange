import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "@/app";

describe("REST API Endpoints", () => {
  it("GET /health returns 200 with status ok and uptime", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptimeSeconds");
  });

  it("POST /api/auth/register rejects weak password with VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid_trader@darkhold.io", password: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.context).toHaveProperty("field_message");
  });

  it("POST /api/auth/login rejects missing fields with VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "notanemail" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("GET /api/wallet rejects unauthenticated request with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/wallet");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/orders rejects unauthenticated request with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/book/:assetId returns book snapshot with bids and asks", async () => {
    const res = await request(app).get("/api/book/DARKHOLD-PASS-2026");
    expect(res.status).toBe(200);
    expect(res.body.asset_id).toBe("DARKHOLD-PASS-2026");
    expect(Array.isArray(res.body.bids)).toBe(true);
    expect(Array.isArray(res.body.asks)).toBe(true);
  });

  it("GET /api/admin/reconciliation returns 8 reconciliation rings", async () => {
    const res = await request(app).get("/api/admin/reconciliation");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(8);
    expect(res.body[0]).toHaveProperty("code", "R1");
  });
});
