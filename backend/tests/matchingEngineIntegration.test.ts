import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/config/db";
import { MatchingEngineService } from "@/engine/service";
import { EngineClient, EngineHttpError } from "@/engine/engineClient";
import { walletsService } from "@/modules/wallets/wallets.service";
import { settlementWorker } from "@/engine/settlementWorker";
import { sseConsumer } from "@/engine/sseConsumer";
import { v7 as uuidv7 } from "uuid";
import bcrypt from "bcryptjs";

describe("DarkHold Matching Engine Integration Suite", () => {
  let engineService: MatchingEngineService;
  let testClient: EngineClient;
  const enginePort = 7099;
  const testToken = "test-engine-token-2026";
  const testEpoch = `e-test${Date.now().toString(36)}`;

  beforeAll(async () => {
    // 1. Launch test instance of matching engine
    engineService = new MatchingEngineService({
      epoch: testEpoch,
      token: testToken,
      ringCapacity: 10000,
    });
    await engineService.start(enginePort);

    testClient = new EngineClient({
      baseUrl: `http://localhost:${enginePort}`,
      token: testToken,
      timeoutMs: 3000,
    });

    // Configure the backend's singleton client and consumer to point to the test engine
    const { engineClient } = await import("@/engine/engineClient");
    engineClient.setBaseUrl(`http://localhost:${enginePort}`);
    engineClient.setToken(testToken);

    const { sseConsumer } = await import("@/engine/sseConsumer");
    sseConsumer.setUrl(`http://localhost:${enginePort}`);
    sseConsumer.setToken(testToken);
    await sseConsumer.start();
  }, 30000);

  afterAll(async () => {
    sseConsumer.stop();
    settlementWorker.stop();
    await engineService.stop();
  });

  // =========================================================================
  // 1. Engine Health & Authentication
  // =========================================================================
  describe("1. Engine Health and Authentication", () => {
    it("GET /healthz returns 200 without authentication", async () => {
      const health = await testClient.getHealth();
      expect(health.status).toBe("ok");
      expect(health.engine_epoch).toBe(testEpoch);
      expect(typeof health.seq).toBe("number");
      expect(health.uptime_s).toBeGreaterThanOrEqual(0);
    });

    it("Protected endpoints reject missing or invalid X-Engine-Token with 401 UNAUTHENTICATED", async () => {
      const unauthClient = new EngineClient({
        baseUrl: `http://localhost:${enginePort}`,
        token: "invalid-token",
      });

      await expect(unauthClient.getBook("DFEST-WKND")).rejects.toThrowError(EngineHttpError);
      try {
        await unauthClient.getBook("DFEST-WKND");
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.code).toBe("UNAUTHENTICATED");
      }
    });

    it("Protected endpoints succeed with valid X-Engine-Token", async () => {
      const book = await testClient.getBook("DFEST-WKND", 15);
      expect(book.asset).toBe("DFEST-WKND");
      expect(Array.isArray(book.bids)).toBe(true);
      expect(Array.isArray(book.asks)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Asset Configuration & Status Updates (Halt & Resume)
  // =========================================================================
  describe("2. Asset Configuration and Status Updates", () => {
    it("ConfigureAsset configures asset parameters and emits AssetConfigured", async () => {
      const reply = await testClient.sendCommand({
        type: "ConfigureAsset",
        asset: "TEST-CFG",
        tick_size: 10,
        min_qty: 1,
        max_qty: 50,
        collar_max_price: 25000,
        status: "ACTIVE",
      });

      expect(reply.status).toBe("OK");
      expect(reply.asset).toBe("TEST-CFG");
    });

    it("HaltAsset prevents new order submissions with ASSET_HALTED", async () => {
      const haltReply = await testClient.sendCommand({
        type: "HaltAsset",
        asset: "TEST-CFG",
      });
      expect(haltReply.status).toBe("OK");

      // Submitting an order should be rejected
      const submitReply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: uuidv7(),
        asset: "TEST-CFG",
        user_id: "user-1",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 10000,
      });

      expect(submitReply.status).toBe("REJECTED");
      expect(submitReply.code).toBe("ASSET_HALTED");
    });

    it("ResumeAsset restores order acceptance", async () => {
      const resumeReply = await testClient.sendCommand({
        type: "ResumeAsset",
        asset: "TEST-CFG",
      });
      expect(resumeReply.status).toBe("OK");

      const orderId = uuidv7();
      const submitReply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderId,
        asset: "TEST-CFG",
        user_id: "user-1",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 10000,
      });

      expect(submitReply.status).toBe("ACCEPTED");
      expect(submitReply.order_id).toBe(orderId);
    });
  });

  // =========================================================================
  // 3. Validation Rules (Quantity, Price, Tick, Collar)
  // =========================================================================
  describe("3. Order Validation Rules", () => {
    it("Rejects off-tick price with PRICE_NOT_ON_TICK", async () => {
      const reply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: uuidv7(),
        asset: "DFEST-WKND", // tick size 10
        user_id: "u-val",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 1,
        price: 10005, // not multiple of 10
      });

      expect(reply.status).toBe("REJECTED");
      expect(reply.code).toBe("PRICE_NOT_ON_TICK");
    });

    it("Rejects invalid quantity (< min_qty or > max_qty) with INVALID_QTY", async () => {
      const reply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: uuidv7(),
        asset: "DFEST-WKND", // max_qty 10
        user_id: "u-val",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 15,
        price: 10000,
      });

      expect(reply.status).toBe("REJECTED");
      expect(reply.code).toBe("INVALID_QTY");
    });

    it("Rejects price above collar with PRICE_ABOVE_COLLAR", async () => {
      const reply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: uuidv7(),
        asset: "DFEST-WKND", // collar 27500
        user_id: "u-val",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 1,
        price: 30000,
      });

      expect(reply.status).toBe("REJECTED");
      expect(reply.code).toBe("PRICE_ABOVE_COLLAR");
    });
  });

  // =========================================================================
  // 4. Price-Time Priority & Resting Maker Price Execution
  // =========================================================================
  describe("4. Matching Priority and Maker Price Execution", () => {
    it("Matches taker at maker's resting price providing buyer price improvement", async () => {
      const asset = "TEST-PRIORITY";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 10,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: 50000,
        status: "ACTIVE",
      });

      // Seller rests 5 units @ 10000
      const sellerOrderId = uuidv7();
      const sellReply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: sellerOrderId,
        asset,
        user_id: "seller-1",
        side: "SELL",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 10000,
      });
      expect(sellReply.status).toBe("ACCEPTED");

      // Buyer submits BUY 5 @ 10500 (willing to pay up to 10500)
      const buyerOrderId = uuidv7();
      const buyReply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: buyerOrderId,
        asset,
        user_id: "buyer-1",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 10500,
      });
      expect(buyReply.status).toBe("ACCEPTED");

      // Check order outcomes
      const sellerOutcome = await testClient.getOrder(sellerOrderId);
      expect(sellerOutcome.status).toBe("FILLED");
      expect(sellerOutcome.filled_qty).toBe(5);
      expect(sellerOutcome.remaining_qty).toBe(0);

      const buyerOutcome = await testClient.getOrder(buyerOrderId);
      expect(buyerOutcome.status).toBe("FILLED");
      expect(buyerOutcome.filled_qty).toBe(5);
      expect(buyerOutcome.remaining_qty).toBe(0);
    });

    it("Enforces FIFO time priority among makers at identical price", async () => {
      const asset = "TEST-FIFO";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      // Seller A rests 3 units @ 100
      const orderA = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderA,
        asset,
        user_id: "seller-A",
        side: "SELL",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 3,
        price: 100,
      });

      // Seller B rests 3 units @ 100 (same price, later time)
      const orderB = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderB,
        asset,
        user_id: "seller-B",
        side: "SELL",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 3,
        price: 100,
      });

      // Buyer arrives with BUY 4 @ 100
      const buyerOrder = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: buyerOrder,
        asset,
        user_id: "buyer-taker",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 4,
        price: 100,
      });

      // Order A must be completely filled (3 units)
      const outcomeA = await testClient.getOrder(orderA);
      expect(outcomeA.status).toBe("FILLED");
      expect(outcomeA.filled_qty).toBe(3);

      // Order B must be partially filled (1 unit, 2 remaining)
      const outcomeB = await testClient.getOrder(orderB);
      expect(outcomeB.status).toBe("PARTIALLY_FILLED");
      expect(outcomeB.filled_qty).toBe(1);
      expect(outcomeB.remaining_qty).toBe(2);
    });
  });

  // =========================================================================
  // 5. Order Cancellation & Fills Race
  // =========================================================================
  describe("5. Order Cancellation", () => {
    it("Cancels resting order and reports CANCELED with remaining quantity", async () => {
      const asset = "TEST-CANCEL";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      const orderId = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderId,
        asset,
        user_id: "u-cancel",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 10,
        price: 50,
      });

      const cancelReply = await testClient.sendCommand({
        type: "CancelOrder",
        order_id: orderId,
        reason: "USER",
      });

      expect(cancelReply.status).toBe("CANCELED");
      expect(cancelReply.remaining_qty).toBe(10);

      // Duplicate cancel returns ALREADY_CANCELED
      const dupCancel = await testClient.sendCommand({
        type: "CancelOrder",
        order_id: orderId,
        reason: "USER",
      });
      expect(dupCancel.status).toBe("ALREADY_CANCELED");
      expect(dupCancel.duplicate).toBe(true);
    });

    it("Returns ALREADY_FILLED when attempting to cancel fully filled order", async () => {
      const asset = "TEST-CANCEL-FILL";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      const makerId = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: makerId,
        asset,
        user_id: "u-m",
        side: "SELL",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 2,
        price: 100,
      });

      const takerId = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: takerId,
        asset,
        user_id: "u-t",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 2,
        price: 100,
      });

      const cancelReply = await testClient.sendCommand({
        type: "CancelOrder",
        order_id: makerId,
        reason: "USER",
      });

      expect(cancelReply.status).toBe("ALREADY_FILLED");
    });
  });

  // =========================================================================
  // 6. Market Orders & No-Liquidity IOC
  // =========================================================================
  describe("6. Market Orders and IOC No-Liquidity", () => {
    it("Market order with no opposite liquidity cancels immediately with NO_LIQUIDITY", async () => {
      const asset = "TEST-MKT-NOLIQ";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      const orderId = uuidv7();
      const reply = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderId,
        asset,
        user_id: "u-mkt",
        side: "BUY",
        order_type: "MARKET",
        tif: "IOC",
        qty: 5,
        price: 1000, // protection price
      });

      expect(reply.status).toBe("ACCEPTED");

      const outcome = await testClient.getOrder(orderId);
      expect(outcome.status).toBe("CANCELED");
      expect(outcome.cancel_reason).toBe("NO_LIQUIDITY");
      expect(outcome.filled_qty).toBe(0);
      expect(outcome.remaining_qty).toBe(5);
    });
  });

  // =========================================================================
  // 7. Self-Trade Prevention
  // =========================================================================
  describe("7. Self-Trade Prevention", () => {
    it("Cancels incoming taker order with SELF_TRADE_PREVENTED when crossing own resting order", async () => {
      const asset = "TEST-STP";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      const makerId = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: makerId,
        asset,
        user_id: "same-user-id",
        side: "SELL",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 100,
      });

      const takerId = uuidv7();
      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: takerId,
        asset,
        user_id: "same-user-id", // Same user
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 5,
        price: 100,
      });

      // Taker cancelled with SELF_TRADE_PREVENTED
      const takerOutcome = await testClient.getOrder(takerId);
      expect(takerOutcome.status).toBe("CANCELED");
      expect(takerOutcome.cancel_reason).toBe("SELF_TRADE_PREVENTED");

      // Maker still resting
      const makerOutcome = await testClient.getOrder(makerId);
      expect(makerOutcome.status).toBe("OPEN");
      expect(makerOutcome.remaining_qty).toBe(5);
    });
  });

  // =========================================================================
  // 8. Idempotency & Replay Protection
  // =========================================================================
  describe("8. Idempotency and Deduplication", () => {
    it("Resubmitting exact identical command returns cached reply with duplicate: true", async () => {
      const asset = "TEST-IDEM";
      await testClient.sendCommand({
        type: "ConfigureAsset",
        asset,
        tick_size: 1,
        min_qty: 1,
        max_qty: 100,
        collar_max_price: null,
        status: "ACTIVE",
      });

      const orderId = uuidv7();
      const payload = {
        type: "SubmitOrder" as const,
        order_id: orderId,
        asset,
        user_id: "u-idem",
        side: "BUY" as const,
        order_type: "LIMIT" as const,
        tif: "GTC" as const,
        qty: 3,
        price: 50,
      };

      const first = await testClient.sendCommand(payload);
      expect(first.status).toBe("ACCEPTED");
      expect(first.duplicate).toBe(false);

      const second = await testClient.sendCommand(payload);
      expect(second.status).toBe("ACCEPTED");
      expect(second.duplicate).toBe(true);
      expect(second.order_id).toBe(orderId);
    });

    it("Reusing order_id with different fields rejects with ORDER_ID_REUSED and seq: null", async () => {
      const asset = "TEST-IDEM";
      const orderId = uuidv7();

      await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderId,
        asset,
        user_id: "u-idem",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 3,
        price: 50,
      });

      // Send same order_id with different price
      const second = await testClient.sendCommand({
        type: "SubmitOrder",
        order_id: orderId,
        asset,
        user_id: "u-idem",
        side: "BUY",
        order_type: "LIMIT",
        tif: "GTC",
        qty: 3,
        price: 60, // different!
      });

      expect(second.status).toBe("REJECTED");
      expect(second.code).toBe("ORDER_ID_REUSED");
      expect(second.seq).toBeNull();
    });
  });

  // =========================================================================
  // 9. Golden Scenario Fixture Verification
  // =========================================================================
  describe("9. Contract Golden Scenario Fixtures", () => {
    it("Replays S02-exact-cross fixture successfully", async () => {
      const fixture = engineService.loadScenarioFixture("S02-exact-cross.json");
      expect(fixture.name).toBe("S02-exact-cross");

      for (const step of fixture.steps) {
        const reply = await testClient.sendCommand(step.command);
        expect(reply.status).toBe(step.expect_reply.status);
        if (step.expect_reply.code) {
          expect(reply.code).toBe(step.expect_reply.code);
        }
      }
    });

    it("Replays S14-cancel-after-fill fixture successfully", async () => {
      const fixture = engineService.loadScenarioFixture("S14-cancel-after-fill.json");
      expect(fixture.name).toBe("S14-cancel-after-fill");

      for (const step of fixture.steps) {
        const reply = await testClient.sendCommand(step.command);
        expect(reply.status).toBe(step.expect_reply.status);
      }
    });
  });

  // =========================================================================
  // 10. End-to-End REST Flow with Balances, Escrow & Settlement
  // =========================================================================
  describe("10. Full Stack REST API & Settlement Lifecycle", () => {
    let testBuyerEmail = `buyer_${Date.now()}@darkhold.io`;
    let testSellerEmail = `seller_${Date.now()}@darkhold.io`;
    let testBuyerToken: string;
    let testSellerToken: string;
    let testAssetId: string;
    const testSymbol = "DFEST-WKND";

    beforeAll(async () => {
      // 0. Reset engine state with isolated epoch for REST flow
      engineService.resetState(`e-e2e-${Date.now().toString(36)}`);

      // 1. Register test buyer and test seller
      const buyerReg = await request(app)
        .post("/api/auth/register")
        .send({ email: testBuyerEmail, password: "SecurePassword2026!" });
      testBuyerToken = buyerReg.body.token;

      const sellerReg = await request(app)
        .post("/api/auth/register")
        .send({ email: testSellerEmail, password: "SecurePassword2026!" });
      testSellerToken = sellerReg.body.token;

      // 2. Fetch asset info
      const assetRes = await request(app).get("/assets");
      const items = Array.isArray(assetRes.body) ? assetRes.body : assetRes.body.items;
      const asset = items.find((a: any) => a.symbol === testSymbol) || items[0];
      testAssetId = asset.id;

      // 3. Credit seller with holding units in DB
      const sellerWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: sellerReg.body.user.id },
      });
      await prisma.walletHolding.upsert({
        where: {
          walletId_assetId: {
            walletId: sellerWallet.id,
            assetId: testAssetId,
          },
        },
        create: {
          walletId: sellerWallet.id,
          assetId: testAssetId,
          availableUnits: 20,
          totalUnits: 20,
        },
        update: {
          availableUnits: { increment: 20 },
          totalUnits: { increment: 20 },
        },
      });

      // 4. Ensure buyer has ample funds (starter credits = 500,000 cents / $5,000)
      const buyerWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${testBuyerToken}`);
      expect(buyerWallet.status).toBe(200);
    }, 30000);

    it("Submitting BUY order reserves available wallet balance and returns HTTP 202 PENDING_SUBMIT", async () => {
      const initialWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${testBuyerToken}`);
      const startAvailable = initialWallet.body.available_minor;

      const buyRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", `idem-buy-${Date.now()}`)
        .send({
          asset: testSymbol,
          side: "BUY",
          type: "LIMIT",
          quantity: 2,
          price: 10000, // $100.00 each = 20000 minor required
        });

      expect(buyRes.status).toBe(202);
      expect(buyRes.body.status).toBe("PENDING_SUBMIT");
      expect(buyRes.body).toHaveProperty("order_id");

      // Verify wallet balance was debited into reserved
      const postWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${testBuyerToken}`);
      expect(postWallet.body.available_minor).toBe(startAvailable - 20000);
      expect(postWallet.body.reserved_minor).toBeGreaterThanOrEqual(20000);
    });

    it("Rejects order with INSUFFICIENT_FUNDS when available balance is too low", async () => {
      // Temporarily set available balance to low amount
      const buyerUser = await prisma.user.findUniqueOrThrow({ where: { email: testBuyerEmail } });
      const currentWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyerUser.id } });
      await prisma.wallet.update({
        where: { userId: buyerUser.id },
        data: { availableBalance: 100 },
      });

      const buyRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", `idem-fail-funds-${Date.now()}`)
        .send({
          asset: testSymbol,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 10000, // $100 requires 10000 > 100 available
        });

      // Restore wallet balance
      await prisma.wallet.update({
        where: { userId: buyerUser.id },
        data: { availableBalance: currentWallet.availableBalance },
      });

      expect(buyRes.status).toBe(422);
      expect(buyRes.body.error?.code || buyRes.body.code).toBe("INSUFFICIENT_FUNDS");
    });

    it("Submitting SELL order reserves available holding units and returns HTTP 202", async () => {
      const sellRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testSellerToken}`)
        .set("Idempotency-Key", `idem-sell-${Date.now()}`)
        .send({
          asset: testSymbol,
          side: "SELL",
          type: "LIMIT",
          quantity: 5,
          price: 10500,
        });

      expect(sellRes.status).toBe(202);
      expect(sellRes.body.status).toBe("PENDING_SUBMIT");
      expect(sellRes.body).toHaveProperty("order_id");
    });

    it("Rejects SELL order with INSUFFICIENT_HOLDINGS when trader owns insufficient units", async () => {
      const sellRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`) // Buyer currently has 0 units
        .set("Idempotency-Key", `idem-fail-units-${Date.now()}`)
        .send({
          asset: testSymbol,
          side: "SELL",
          type: "LIMIT",
          quantity: 5,
          price: 10000,
        });

      expect(sellRes.status).toBe(422);
      expect(sellRes.body.error?.code || buyResCode(sellRes)).toBe("INSUFFICIENT_HOLDINGS");
    });

    it("Replaying identical Idempotency-Key returns stored response without duplicating order", async () => {
      const idempotencyKey = `idem-replay-${Date.now()}`;
      const payload = {
        asset: testSymbol,
        side: "BUY",
        type: "LIMIT",
        quantity: 1,
        price: 5000,
      };

      const first = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send(payload);

      expect(first.status).toBe(202);
      const originalOrderId = first.body.order_id;

      // Repeat with same key
      const second = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", idempotencyKey)
        .send(payload);

      expect([200, 202]).toContain(second.status);
      expect(second.body.order_id).toBe(originalOrderId);
    });

    it("Canceling order releases reserved funds back to available balance", async () => {
      const buyRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", `idem-cancel-test-${Date.now()}`)
        .send({
          asset: testSymbol,
          side: "BUY",
          type: "LIMIT",
          quantity: 1,
          price: 4000,
        });

      expect(buyRes.status).toBe(202);
      const orderId = buyRes.body.order_id;

      // Ensure order status is OPEN before cancelling
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "OPEN" },
      });

      // Cancel the order
      const cancelRes = await request(app)
        .delete(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${testBuyerToken}`)
        .set("Idempotency-Key", `idem-del-${Date.now()}`);

      expect([200, 202]).toContain(cancelRes.status);
    });

    it("Querying /me/wallet, /me/holdings, and /me/orders returns formatted domain resources", async () => {
      const walletRes = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${testBuyerToken}`);
      expect(walletRes.status).toBe(200);
      expect(walletRes.body).toHaveProperty("available_minor");
      expect(walletRes.body).toHaveProperty("reserved_minor");

      const holdingsRes = await request(app)
        .get("/me/holdings")
        .set("Authorization", `Bearer ${testSellerToken}`);
      expect(holdingsRes.status).toBe(200);
      const holdingItems = holdingsRes.body.items || holdingsRes.body;
      expect(Array.isArray(holdingItems)).toBe(true);

      const ordersRes = await request(app)
        .get("/me/orders?status=open")
        .set("Authorization", `Bearer ${testBuyerToken}`);
      expect(ordersRes.status).toBe(200);
      const orderItems = ordersRes.body.items || ordersRes.body;
      expect(Array.isArray(orderItems)).toBe(true);
    });

    it("Key E2E flow: Buy → balance reservation → matching → settlement → updated wallet and trade history", async () => {
      // 1. Setup clean isolated asset & dedicated buyer and seller
      const e2eAssetId = "MOONRISE-GA-2026";
      const e2eSymbol = "MOONRISE-GA";

      const e2eBuyerEmail = `e2e_buyer_${Date.now()}@darkhold.io`;
      const e2eSellerEmail = `e2e_seller_${Date.now()}@darkhold.io`;

      const buyerReg = await request(app)
        .post("/api/auth/register")
        .send({ email: e2eBuyerEmail, password: "SecurePassword2026!" });
      expect(buyerReg.status).toBe(201);
      const e2eBuyerToken = buyerReg.body.token;
      const buyerId = buyerReg.body.user.id;

      const sellerReg = await request(app)
        .post("/api/auth/register")
        .send({ email: e2eSellerEmail, password: "SecurePassword2026!" });
      expect(sellerReg.status).toBe(201);
      const e2eSellerToken = sellerReg.body.token;
      const sellerId = sellerReg.body.user.id;

      // Credit seller with 10 holding units of e2eAssetId
      const sellerWallet = await prisma.wallet.findUniqueOrThrow({
        where: { userId: sellerId },
      });
      await prisma.walletHolding.upsert({
        where: {
          walletId_assetId: {
            walletId: sellerWallet.id,
            assetId: e2eAssetId,
          },
        },
        create: {
          walletId: sellerWallet.id,
          assetId: e2eAssetId,
          availableUnits: 10,
          totalUnits: 10,
        },
        update: {
          availableUnits: 10,
          totalUnits: 10,
          reservedUnits: 0,
        },
      });

      // Fetch buyer initial wallet state
      const buyerInitialWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      const initialBuyerAvailable = buyerInitialWallet.body.available_minor; // 500000

      // Fetch seller initial wallet state
      const sellerInitialWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${e2eSellerToken}`);
      const initialSellerAvailable = sellerInitialWallet.body.available_minor; // 500000

      // -----------------------------------------------------------------------
      // Step 1: BUY order placement & Balance reservation
      // -----------------------------------------------------------------------
      const buyPrice = 15000; // $150.00
      const tradeQty = 2;
      const totalTradeCost = buyPrice * tradeQty; // 30000 ($300.00)

      const buyRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${e2eBuyerToken}`)
        .set("Idempotency-Key", `idem-e2e-buy-${Date.now()}`)
        .send({
          asset: e2eSymbol,
          side: "BUY",
          type: "LIMIT",
          quantity: tradeQty,
          price: buyPrice,
        });

      expect(buyRes.status).toBe(202);
      expect(buyRes.body.status).toBe("PENDING_SUBMIT");
      const buyerOrderId = buyRes.body.order_id;
      expect(buyerOrderId).toBeDefined();

      // Check balance reservation on buyer's wallet:
      // availableBalance decremented by 30000, reservedBalance incremented by 30000
      const buyerWalletPostBuy = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      expect(buyerWalletPostBuy.body.available_minor).toBe(initialBuyerAvailable - totalTradeCost);
      expect(buyerWalletPostBuy.body.reserved_minor).toBe(totalTradeCost);

      // -----------------------------------------------------------------------
      // Step 2: SELL order placement & Inventory reservation
      // -----------------------------------------------------------------------
      const sellRes = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${e2eSellerToken}`)
        .set("Idempotency-Key", `idem-e2e-sell-${Date.now()}`)
        .send({
          asset: e2eSymbol,
          side: "SELL",
          type: "LIMIT",
          quantity: tradeQty,
          price: buyPrice,
        });

      expect(sellRes.status).toBe(202);
      expect(sellRes.body.status).toBe("PENDING_SUBMIT");
      const sellerOrderId = sellRes.body.order_id;
      expect(sellerOrderId).toBeDefined();

      // Check inventory reservation on seller's holdings:
      // availableUnits decremented by 2, reservedUnits incremented by 2
      const sellerHoldingsPostSell = await request(app)
        .get("/me/holdings")
        .set("Authorization", `Bearer ${e2eSellerToken}`);
      const sellerItems = sellerHoldingsPostSell.body.items || sellerHoldingsPostSell.body;
      const sellerAssetHolding = sellerItems.find((h: any) => h.asset_id === e2eAssetId || h.assetId === e2eAssetId);
      expect(sellerAssetHolding).toBeDefined();
      expect(sellerAssetHolding.available_units ?? sellerAssetHolding.availableUnits).toBe(8);
      expect(sellerAssetHolding.reserved_units ?? sellerAssetHolding.reservedUnits).toBe(2);

      // -----------------------------------------------------------------------
      // Step 3: Engine Matching & Trade Event Ingestion
      // -----------------------------------------------------------------------
      let matchedTrade: any = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        matchedTrade = await prisma.trade.findFirst({
          where: {
            OR: [
              { buyOrderId: buyerOrderId },
              { sellOrderId: sellerOrderId },
            ],
          },
        });
        if (matchedTrade) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!matchedTrade) {
        const events = (engineService as any).eventRing as any[];
        console.log("DEBUG events in engine:", events.map((e: any) => ({ type: e.type, seq: e.seq, asset: e.asset, buy_order_id: e.buy_order_id, sell_order_id: e.sell_order_id })));
        const tradeEvt = events.find(
          (e: any) =>
            e.type === "TradeExecuted" &&
            (e.buy_order_id === buyerOrderId || e.sell_order_id === sellerOrderId)
        );
        if (tradeEvt) {
          await sseConsumer.applyEvent(tradeEvt);
          matchedTrade = await prisma.trade.findUnique({ where: { id: tradeEvt.trade_id } });
        }
      }

      console.log("DEBUG matchedTrade:", matchedTrade);
      console.log("DEBUG buyerOrderId:", buyerOrderId, "sellerOrderId:", sellerOrderId);

      expect(matchedTrade).not.toBeNull();
      expect(matchedTrade.quantity).toBe(tradeQty);
      expect(Number(matchedTrade.executionPrice)).toBe(buyPrice);
      expect(Number(matchedTrade.totalCost)).toBe(totalTradeCost);
      expect(matchedTrade.state).toBe("PENDING_SETTLEMENT");

      // -----------------------------------------------------------------------
      // Step 4: Settlement Execution
      // -----------------------------------------------------------------------
      const settledCount = await settlementWorker.processPendingTrades();
      expect(settledCount).toBeGreaterThanOrEqual(1);

      // Verify trade is now marked SETTLED
      const settledTrade = await prisma.trade.findUnique({
        where: { id: matchedTrade.id },
      });
      expect(settledTrade?.state).toBe("SETTLED");
      expect(settledTrade?.settledAt).not.toBeNull();

      // Verify orders updated to FILLED and settlementStatus: COMPLETED
      const buyOrderDb = await prisma.order.findUnique({ where: { id: buyerOrderId } });
      expect(buyOrderDb?.settlementStatus).toBe("COMPLETED");

      const sellOrderDb = await prisma.order.findUnique({ where: { id: sellerOrderId } });
      expect(sellOrderDb?.settlementStatus).toBe("COMPLETED");

      // -----------------------------------------------------------------------
      // Step 5: Verify Updated Wallets & Holdings
      // -----------------------------------------------------------------------
      // Buyer wallet: reserved funds cleared, balance debited
      const buyerFinalWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      expect(buyerFinalWallet.body.available_minor).toBe(initialBuyerAvailable - totalTradeCost);
      expect(buyerFinalWallet.body.reserved_minor).toBe(0);

      // Buyer holdings: received 2 units of e2eAssetId
      const buyerFinalHoldings = await request(app)
        .get("/me/holdings")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      const buyerItems = buyerFinalHoldings.body.items || buyerFinalHoldings.body;
      const buyerAssetHolding = buyerItems.find((h: any) => h.asset_id === e2eAssetId || h.assetId === e2eAssetId);
      expect(buyerAssetHolding).toBeDefined();
      expect(buyerAssetHolding.available_units ?? buyerAssetHolding.availableUnits).toBe(tradeQty);
      expect(buyerAssetHolding.total_units ?? buyerAssetHolding.totalUnits).toBe(tradeQty);

      // Seller wallet: credited with 30000 sale proceeds
      const sellerFinalWallet = await request(app)
        .get("/me/wallet")
        .set("Authorization", `Bearer ${e2eSellerToken}`);
      expect(sellerFinalWallet.body.available_minor).toBe(initialSellerAvailable + totalTradeCost);
      expect(sellerFinalWallet.body.reserved_minor).toBe(0);

      // Seller holdings: reserved 2 units deducted, remaining 8 units
      const sellerFinalHoldings = await request(app)
        .get("/me/holdings")
        .set("Authorization", `Bearer ${e2eSellerToken}`);
      const sellerFinalItems = sellerFinalHoldings.body.items || sellerFinalHoldings.body;
      const sellerFinalAssetHolding = sellerFinalItems.find((h: any) => h.asset_id === e2eAssetId || h.assetId === e2eAssetId);
      expect(sellerFinalAssetHolding.available_units ?? sellerFinalAssetHolding.availableUnits).toBe(8);
      expect(sellerFinalAssetHolding.reserved_units ?? sellerFinalAssetHolding.reservedUnits).toBe(0);
      expect(sellerFinalAssetHolding.total_units ?? sellerFinalAssetHolding.totalUnits).toBe(8);

      // -----------------------------------------------------------------------
      // Step 6: Verify Trade History & Receipts Tape
      // -----------------------------------------------------------------------
      // Buyer Receipts (/api/receipts)
      const buyerReceiptsRes = await request(app)
        .get("/api/receipts")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      expect(buyerReceiptsRes.status).toBe(200);
      const buyerReceipts = Array.isArray(buyerReceiptsRes.body) ? buyerReceiptsRes.body : buyerReceiptsRes.body.receipts;
      const buyerReceipt = buyerReceipts.find((r: any) => r.trade_id === matchedTrade.id);
      expect(buyerReceipt).toBeDefined();
      expect(buyerReceipt.side).toBe("BUY");
      expect(buyerReceipt.qty).toBe(tradeQty);
      expect(buyerReceipt.price).toBe(buyPrice);
      expect(buyerReceipt.total_cost).toBe(totalTradeCost);
      expect(buyerReceipt.settlement_status).toBe("COMPLETED");
      expect(buyerReceipt.counterparty_id).toBe(sellerId);
      expect(buyerReceipt.settled_at).not.toBeNull();

      // Buyer Transactions Tape (/me/transactions)
      const buyerTxRes = await request(app)
        .get("/me/transactions")
        .set("Authorization", `Bearer ${e2eBuyerToken}`);
      expect(buyerTxRes.status).toBe(200);
      const buyerTxItems = buyerTxRes.body.items || buyerTxRes.body.receipts || [];
      const buyerTx = buyerTxItems.find((t: any) => t.trade_id === matchedTrade.id);
      expect(buyerTx).toBeDefined();
      expect(buyerTx.side).toBe("BUY");
      expect(buyerTx.state).toBe("SETTLED");

      // Seller Receipts (/api/receipts)
      const sellerReceiptsRes = await request(app)
        .get("/api/receipts")
        .set("Authorization", `Bearer ${e2eSellerToken}`);
      expect(sellerReceiptsRes.status).toBe(200);
      const sellerReceipts = Array.isArray(sellerReceiptsRes.body) ? sellerReceiptsRes.body : sellerReceiptsRes.body.receipts;
      const sellerReceipt = sellerReceipts.find((r: any) => r.trade_id === matchedTrade.id);
      expect(sellerReceipt).toBeDefined();
      expect(sellerReceipt.side).toBe("SELL");
      expect(sellerReceipt.qty).toBe(tradeQty);
      expect(sellerReceipt.price).toBe(buyPrice);
      expect(sellerReceipt.total_cost).toBe(totalTradeCost);
      expect(sellerReceipt.settlement_status).toBe("COMPLETED");
      expect(sellerReceipt.counterparty_id).toBe(buyerId);
    }, 90000);
  });
});

function buyResCode(res: any): string {
  return res.body?.error?.code || res.body?.code || "";
}
