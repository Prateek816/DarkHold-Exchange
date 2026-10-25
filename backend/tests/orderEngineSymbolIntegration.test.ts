import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/config/db";
import { engineClient } from "@/engine/engineClient";
import { sseConsumer } from "@/engine/sseConsumer";
import { MatchingEngineService } from "@/engine/service";
import { syncEngineAssets } from "@/engine/assetSync";
import {
  resolveEngineSymbol,
  toDbAssetIdentifier,
  isConfiguredEngineSymbol,
  toEngineSymbol,
} from "@/utils/assetMapping";

describe("Order Engine Symbol Resolution & Registration Integration Suite", () => {
  let engineService: MatchingEngineService;
  const enginePort = 7098;
  const testToken = "test-token-symbol-resolution";

  let buyerToken: string;
  let buyerUserId: string;
  let sellerToken: string;
  let sellerUserId: string;

  const dbAssetId = "DARKHOLD-PASS-2026";
  const verifiedEngineSymbol = "DFEST-WKND";

  beforeAll(async () => {
    // 1. Launch internal matching engine on custom port
    engineService = new MatchingEngineService({
      epoch: "e-test-sym-01",
      token: testToken,
      ringCapacity: 10000,
    });
    await engineService.start(enginePort);

    // 2. Configure engine client and sse consumer to point to test engine
    engineClient.setBaseUrl(`http://localhost:${enginePort}`);
    engineClient.setToken(testToken);
    sseConsumer.setUrl(`http://localhost:${enginePort}`);
    sseConsumer.setToken(testToken);

    // 3. Register test users
    const buyerEmail = `buyer-sym-${Date.now()}@darkhold.io`;
    const buyerReg = await request(app)
      .post("/api/auth/register")
      .send({ email: buyerEmail, password: "SecurePassword2026!" });
    buyerToken = buyerReg.body.token;
    buyerUserId = buyerReg.body.user.id;

    const sellerEmail = `seller-sym-${Date.now()}@darkhold.io`;
    const sellerReg = await request(app)
      .post("/api/auth/register")
      .send({ email: sellerEmail, password: "SecurePassword2026!" });
    sellerToken = sellerReg.body.token;
    sellerUserId = sellerReg.body.user.id;

    // 4. Ensure DB asset exists
    await prisma.asset.upsert({
      where: { id: dbAssetId },
      create: {
        id: dbAssetId,
        symbol: "DKH-FEST",
        name: "Darkhold Fest Weekend Pass",
        category: "FESTIVAL_PASS",
        faceValue: BigInt(25000),
        ceilingPct: 110,
        ceilingPrice: BigInt(27500),
        isHalted: false,
      },
      update: {
        faceValue: BigInt(25000),
        ceilingPct: 110,
        ceilingPrice: BigInt(27500),
        isHalted: false,
      },
    });

    // 5. Credit seller with holding units for SELL orders
    const sellerWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: sellerUserId },
    });
    await prisma.walletHolding.upsert({
      where: {
        walletId_assetId: {
          walletId: sellerWallet.id,
          assetId: dbAssetId,
        },
      },
      create: {
        walletId: sellerWallet.id,
        assetId: dbAssetId,
        availableUnits: 50,
        totalUnits: 50,
      },
      update: {
        availableUnits: { increment: 50 },
        totalUnits: { increment: 50 },
      },
    });

    // 6. Sync assets to ensure engine has DFEST-WKND configured and ACTIVE
    await syncEngineAssets();
  }, 30000);

  afterAll(async () => {
    await engineService.stop();
  });

  // =========================================================================
  // Task 8.1: Resolving DARKHOLD-PASS-2026 to the verified engine symbol
  // =========================================================================
  describe("1. Resolving DARKHOLD-PASS-2026 to the verified engine symbol", () => {
    it("Resolves DB asset ID DARKHOLD-PASS-2026 to verified engine symbol DFEST-WKND", () => {
      expect(resolveEngineSymbol(dbAssetId)).toBe(verifiedEngineSymbol);
      expect(toEngineSymbol(dbAssetId)).toBe(verifiedEngineSymbol);
    });

    it("Resolves DB symbol DKH-FEST to verified engine symbol DFEST-WKND", () => {
      expect(resolveEngineSymbol("DKH-FEST")).toBe(verifiedEngineSymbol);
      expect(toEngineSymbol("DKH-FEST")).toBe(verifiedEngineSymbol);
    });

    it("Resolves engine symbol DFEST-WKND identity mapping", () => {
      expect(resolveEngineSymbol(verifiedEngineSymbol)).toBe(verifiedEngineSymbol);
      expect(isConfiguredEngineSymbol(verifiedEngineSymbol)).toBe(true);
    });

    it("Maps verified engine symbol DFEST-WKND back to database representation", () => {
      const dbMapping = toDbAssetIdentifier(verifiedEngineSymbol);
      expect(dbMapping).not.toBeNull();
      expect(dbMapping?.id).toBe(dbAssetId);
      expect(dbMapping?.symbol).toBe("DKH-FEST");
    });
  });

  // =========================================================================
  // Task 8.6: Regression test proving engine receives configured symbol
  // =========================================================================
  describe("2. Regression: Engine receives verified configured symbol rather than DARKHOLD-PASS-2026", () => {
    it("Proves that SubmitOrder dispatches with asset DFEST-WKND and not DARKHOLD-PASS-2026", async () => {
      const sendCommandSpy = vi.spyOn(engineClient, "sendCommand");

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-reg-symbol-${Date.now()}`)
        .send({
          assetId: dbAssetId,
          asset: dbAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 25000,
        });

      expect(res.status).toBe(202);

      // Verify that engineClient received DFEST-WKND, never DARKHOLD-PASS-2026
      const submitOrderCalls = sendCommandSpy.mock.calls.filter(
        (call) => call[0]?.type === "SubmitOrder"
      );
      expect(submitOrderCalls.length).toBeGreaterThanOrEqual(1);
      const lastSubmit = submitOrderCalls[submitOrderCalls.length - 1][0] as any;
      expect(lastSubmit.asset).toBe(verifiedEngineSymbol);
      expect(lastSubmit.asset).not.toBe(dbAssetId);
      expect(lastSubmit.asset).not.toBe("DKH-FEST");

      sendCommandSpy.mockRestore();
    });
  });

  // =========================================================================
  // Task 8.2: Successful BUY and SELL submission with correct symbol
  // =========================================================================
  describe("3. Successful BUY and SELL submission with correct symbol", () => {
    it("Successfully submits BUY order with assetId DARKHOLD-PASS-2026", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-buy-success-${Date.now()}`)
        .send({
          assetId: dbAssetId,
          asset: dbAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 2,
          price: 26000,
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe("PENDING_SUBMIT");
      expect(res.body.data.asset_id).toBe(dbAssetId);
      expect(res.body.data.symbol).toBe("DKH-FEST");
    });

    it("Successfully submits SELL order with assetId DARKHOLD-PASS-2026", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${sellerToken}`)
        .set("Idempotency-Key", `idem-sell-success-${Date.now()}`)
        .send({
          assetId: dbAssetId,
          asset: dbAssetId,
          side: "SELL",
          type: "LIMIT",
          quantity: 2,
          price: 26500,
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe("PENDING_SUBMIT");
      expect(res.body.data.asset_id).toBe(dbAssetId);
      expect(res.body.data.symbol).toBe("DKH-FEST");
    });
  });

  // =========================================================================
  // Task 8.3: Unknown or unconfigured assets rejected before reservation
  // =========================================================================
  describe("4. Unknown or unconfigured assets rejected before funds/units are reserved", () => {
    it("Rejects unknown asset before funds are touched", async () => {
      const initialWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-unknown-asset-${Date.now()}`)
        .send({
          assetId: "TOTALLY-UNKNOWN-ASSET",
          asset: "TOTALLY-UNKNOWN-ASSET",
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 10000,
        });

      expect([404, 422]).toContain(res.status);

      // Verify wallet balance was NOT reserved
      const postWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });
      expect(postWallet.availableBalance).toBe(initialWallet.availableBalance);
      expect(postWallet.reservedBalance).toBe(initialWallet.reservedBalance);
    });

    it("Rejects unconfigured asset in DB before funds are touched", async () => {
      const unconfiguredAssetId = `UNCONFIGURED-PASS-${Date.now()}`;
      await prisma.asset.create({
        data: {
          id: unconfiguredAssetId,
          symbol: `UNC-${Date.now().toString().slice(-4)}`,
          name: "Unconfigured Pass",
          faceValue: BigInt(10000),
          ceilingPct: 110,
          ceilingPrice: BigInt(11000),
        },
      });

      const initialWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-unconf-asset-${Date.now()}`)
        .send({
          assetId: unconfiguredAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 10000,
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");

      // Verify wallet balance was NOT reserved
      const postWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });
      expect(postWallet.availableBalance).toBe(initialWallet.availableBalance);
      expect(postWallet.reservedBalance).toBe(initialWallet.reservedBalance);
    });

    it("Rejects exact observed terminal payload for unconfigured pass UNC-2327 with clear field message and requestId", async () => {
      const exactAssetId = "UNCONFIGURED-PASS-1792904352327";
      await prisma.asset.upsert({
        where: { id: exactAssetId },
        update: {},
        create: {
          id: exactAssetId,
          symbol: "UNC-2327",
          name: "Unconfigured Pass",
          faceValue: BigInt(10000),
          ceilingPct: 110,
          ceilingPrice: BigInt(11000),
        },
      });

      const initialWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-unc-2327-${Date.now()}`)
        .send({
          assetId: exactAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 10000,
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.message).toContain("Asset is not configured for trading");
      expect(res.body.context?.field_message).toContain("Asset is not configured for trading");
      expect(res.body.requestId || res.body.context?.request_id).toBeDefined();

      // Verify NO wallet reservation and NO ledger records created
      const postWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });
      expect(postWallet.availableBalance).toBe(initialWallet.availableBalance);
      expect(postWallet.reservedBalance).toBe(initialWallet.reservedBalance);

      const orderCount = await prisma.order.count({
        where: { assetId: exactAssetId },
      });
      expect(orderCount).toBe(0);
    });

    it("Rejects BUY order when price exceeds statutory Ward ceiling cap", async () => {
      const initialWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-above-ceiling-${Date.now()}`)
        .send({
          assetId: "DARKHOLD-PASS-2026",
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 999990,
        });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("PRICE_ABOVE_CEILING");

      // Verify wallet balance was NOT reserved
      const postWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });
      expect(postWallet.availableBalance).toBe(initialWallet.availableBalance);
      expect(postWallet.reservedBalance).toBe(initialWallet.reservedBalance);
    });
  });

  // =========================================================================
  // Task 8.4: Engine UNKNOWN_ASSET rejection leaves no orphaned reservation
  // =========================================================================
  describe("5. Engine UNKNOWN_ASSET rejection leaves no orphaned active reservation", () => {
    it("Releases reserved funds exactly once and marks order REJECTED when engine returns UNKNOWN_ASSET", async () => {
      const initialWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });

      // Temporarily mock engineClient.sendCommand to simulate engine UNKNOWN_ASSET rejection
      const origSendCommand = engineClient.sendCommand.bind(engineClient);
      vi.spyOn(engineClient, "sendCommand").mockImplementation(async (cmd) => {
        if (cmd.type === "SubmitOrder") {
          return {
            status: "REJECTED",
            order_id: cmd.order_id,
            asset: cmd.asset,
            code: "UNKNOWN_ASSET",
            seq: 9999,
            last_seq: 9999,
            engine_epoch: "e-test-sym-01",
            duplicate: false,
          };
        }
        return origSendCommand(cmd);
      });

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-engine-reject-release-${Date.now()}`)
        .send({
          assetId: dbAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 20000,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain("UNKNOWN_ASSET");

      // Verify wallet funds are fully restored with no orphaned reservation
      const postWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: buyerUserId },
      });
      expect(postWallet.availableBalance).toBe(initialWallet.availableBalance);
      expect(postWallet.reservedBalance).toBe(initialWallet.reservedBalance);

      // Verify order record in DB is REJECTED with rejectCode UNKNOWN_ASSET
      const order = await prisma.order.findFirst({
        where: { userId: buyerUserId, price: BigInt(20000) },
        orderBy: { createdAt: "desc" },
      });
      expect(order).not.toBeNull();
      expect(order?.status).toBe("REJECTED");
      expect(order?.rejectCode).toBe("UNKNOWN_ASSET");

      vi.restoreAllMocks();
    });
  });

  // =========================================================================
  // Task 8.5: Order IDs and database asset IDs remain consistent
  // =========================================================================
  describe("6. Existing order IDs and database asset IDs remain consistent", () => {
    it("Preserves database UUID order IDs and DB asset IDs in all responses", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", `idem-consistency-${Date.now()}`)
        .send({
          assetId: dbAssetId,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 26000,
        });

      expect(res.status).toBe(202);
      const orderId = res.body.order_id;
      expect(orderId).toBeDefined();

      const dbOrder = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { asset: true },
      });

      expect(dbOrder.id).toBe(orderId);
      expect(dbOrder.assetId).toBe(dbAssetId);
      expect(dbOrder.asset.symbol).toBe("DKH-FEST");

      // Fetch order by GET /api/orders
      const ordersRes = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(ordersRes.status).toBe(200);
      const items = ordersRes.body.items || ordersRes.body;
      const found = items.find((o: any) => o.id === orderId || o.order_id === orderId);
      expect(found).toBeDefined();
      expect(found.asset_id).toBe(dbAssetId);
      expect(found.symbol).toBe("DKH-FEST");
    });

    it("Serializes REJECTED order with settlement: REJECTED, never SETTLING", async () => {
      // Fetch REJECTED orders
      const ordersRes = await request(app)
        .get("/api/orders?status=closed")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(ordersRes.status).toBe(200);
      const items = Array.isArray(ordersRes.body) ? ordersRes.body : ordersRes.body.items || [];
      const rejectedOrder = items.find((o: any) => o.status === "REJECTED");
      if (rejectedOrder) {
        expect(rejectedOrder.status).toBe("REJECTED");
        expect(rejectedOrder.settlement).toBe("REJECTED");
        expect(rejectedOrder.settlement).not.toBe("SETTLING");
      }
    });

    it("syncEngineAssets verifies ConfigureAsset acknowledgement and registers engine symbol", async () => {
      const configured = new Set<string>();
      await syncEngineAssets(configured);
      expect(configured.has("DFEST-WKND")).toBe(true);
      expect(configured.has("MOONRISE-GA")).toBe(true);
      expect(configured.has("DFEST-HOODIE")).toBe(true);
      expect(configured.has("SIGIL-PIN")).toBe(true);
    });

    afterAll(async () => {
      await prisma.asset.updateMany({
        where: { id: dbAssetId },
        data: {
          faceValue: BigInt(10000),
          ceilingPct: 120,
          ceilingPrice: BigInt(12000),
        },
      });
    });
  });
});
