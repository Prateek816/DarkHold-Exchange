import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { serializeOrder } from "@/utils/serialization";

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

  it("GET /api/admin/reconciliation rejects unauthenticated request with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/admin/reconciliation");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/admin/reconciliation rejects ordinary TRADER with 403 FORBIDDEN", async () => {
    const traderLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "trader@darkhold.io", password: "darkhold2026!" });
    expect(traderLogin.status).toBe(200);
    const traderCookie = traderLogin.headers["set-cookie"];

    const res = await request(app)
      .get("/api/admin/reconciliation")
      .set("Cookie", traderCookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("GET /api/admin/reconciliation returns 8 reconciliation rings when authenticated as ADMIN", async () => {
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@darkhold.io", password: "darkhold2026!" });
    expect(adminLogin.status).toBe(200);
    const adminCookie = adminLogin.headers["set-cookie"];

    const res = await request(app)
      .get("/api/admin/reconciliation")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(8);
    const codes = res.body.map((r: any) => r.code);
    expect(codes).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]);
    for (const ring of res.body) {
      expect(ring).toHaveProperty("passed");
      expect(typeof ring.passed).toBe("boolean");
      expect(ring).toHaveProperty("discrepancy_count");
      expect(typeof ring.discrepancy_count).toBe("number");
    }
  });

  describe("Order Serialization Regression Tests", () => {
    it("serializes an OPEN order with zero matched quantity as settlement: PENDING (not SETTLING)", () => {
      const mockOrder = {
        id: "order-test-1",
        userId: "user-1",
        assetId: "DARKHOLD-PASS-2026",
        side: "BUY",
        type: "LIMIT",
        price: BigInt(25000),
        originalQuantity: 1,
        matchedQuantity: 0,
        remainingQuantity: 1,
        reservedAmount: BigInt(25000),
        reservedUnits: 0,
        status: "OPEN",
        settlementStatus: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const serialized = serializeOrder(mockOrder);
      expect(serialized.status).toBe("OPEN");
      expect(serialized.matched_qty).toBe(0);
      expect(serialized.remaining_qty).toBe(1);
      expect(serialized.settlement_status).toBe("PENDING");
      expect(serialized.settlement).toBe("PENDING");
    });

    it("serializes an order with matchedQuantity > 0 and PENDING settlement as settlement: SETTLING", () => {
      const mockOrder = {
        id: "order-test-2",
        userId: "user-1",
        assetId: "DARKHOLD-PASS-2026",
        side: "BUY",
        type: "LIMIT",
        price: BigInt(25000),
        originalQuantity: 2,
        matchedQuantity: 1,
        remainingQuantity: 1,
        reservedAmount: BigInt(25000),
        reservedUnits: 0,
        status: "PARTIALLY_FILLED",
        settlementStatus: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const serialized = serializeOrder(mockOrder);
      expect(serialized.status).toBe("PARTIALLY_FILLED");
      expect(serialized.matched_qty).toBe(1);
      expect(serialized.settlement).toBe("SETTLING");
    });

    it("serializes REJECTED, CANCELED, and FILLED/COMPLETED orders correctly", () => {
      const baseOrder = {
        id: "order-test-3",
        userId: "user-1",
        assetId: "DARKHOLD-PASS-2026",
        side: "BUY",
        type: "LIMIT",
        price: BigInt(25000),
        originalQuantity: 1,
        matchedQuantity: 0,
        remainingQuantity: 1,
        reservedAmount: BigInt(0),
        reservedUnits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rejected = serializeOrder({ ...baseOrder, status: "REJECTED", settlementStatus: "PENDING" });
      expect(rejected.settlement).toBe("REJECTED");

      const canceled = serializeOrder({ ...baseOrder, status: "CANCELED", settlementStatus: "PENDING" });
      expect(canceled.settlement).toBe("CANCELED");

      const settled = serializeOrder({ ...baseOrder, status: "FILLED", matchedQuantity: 1, settlementStatus: "COMPLETED" });
      expect(settled.settlement).toBe("SETTLED");
    });
  });

  describe("Trades API Endpoints & Asset Mapping Regression", () => {
    it("GET /api/trades returns 200 with an array", async () => {
      const res = await request(app).get("/api/trades");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /trades/DARKHOLD-PASS-2026 returns 200 with asset-id lookup", async () => {
      const res = await request(app).get("/trades/DARKHOLD-PASS-2026");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const trade of res.body) {
        expect(trade.asset_id).toBe("DARKHOLD-PASS-2026");
      }
    });

    it("GET /trades/DFEST-WKND returns 200 with engine-symbol lookup", async () => {
      const res = await request(app).get("/trades/DFEST-WKND");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const trade of res.body) {
        expect(trade.asset_id).toBe("DARKHOLD-PASS-2026");
      }
    });

    it("GET /trades/DKH-FEST returns 200 with database-symbol lookup", async () => {
      const res = await request(app).get("/trades/DKH-FEST");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const trade of res.body) {
        expect(trade.asset_id).toBe("DARKHOLD-PASS-2026");
      }
    });

    it("GET /trades/NON-EXISTENT-ASSET returns 200 with an empty array", async () => {
      const res = await request(app).get("/trades/NON-EXISTENT-ASSET");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe("Candles Pipeline & Multi-Timeframe Regression", () => {
    it("GET /api/candles/DARKHOLD-PASS-2026?interval=1m returns valid OHLCV candles", async () => {
      const res = await request(app).get("/api/candles/DARKHOLD-PASS-2026?interval=1m");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const first = res.body[0];
      expect(first).toHaveProperty("openTime");
      expect(first).toHaveProperty("open");
      expect(first).toHaveProperty("high");
      expect(first).toHaveProperty("low");
      expect(first).toHaveProperty("close");
      expect(first).toHaveProperty("volume");
      expect(first.interval).toBe("1m");
      expect(first.high).toBeGreaterThanOrEqual(first.low);
    });

    it("GET /api/candles/DARKHOLD-PASS-2026?interval=5s returns valid 5s candles", async () => {
      const res = await request(app).get("/api/candles/DARKHOLD-PASS-2026?interval=5s");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].interval).toBe("5s");
    });

    it("GET /api/candles/DFEST-WKND (engine symbol) returns valid candles", async () => {
      const res = await request(app).get("/api/candles/DFEST-WKND?interval=1m");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("GET /api/candles/DKH-FEST (db symbol) returns valid candles", async () => {
      const res = await request(app).get("/api/candles/DKH-FEST?interval=1m");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("GET /candles/:assetId and /assets/:assetId/candles aliases return matching candle data", async () => {
      const res1 = await request(app).get("/candles/DARKHOLD-PASS-2026?interval=1m");
      const res2 = await request(app).get("/assets/DARKHOLD-PASS-2026/candles?interval=1m");
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.length).toBe(res2.body.length);
    });

    it("GET candles returns valid data for all registered festival assets", async () => {
      const assets = [
        "MOONRISE-GA-2026",
        "DARKHOLD-HOODIE-LTD",
        "SIGIL-COLLECTOR-PIN",
      ];
      for (const id of assets) {
        const res = await request(app).get(`/api/candles/${id}?interval=1m`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      }
    });

    it("GET /api/candles/NON-EXISTENT returns empty array without inventing trades", async () => {
      const res = await request(app).get("/api/candles/NON-EXISTENT?interval=1m");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});


