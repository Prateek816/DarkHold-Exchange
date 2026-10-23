import {
  Asset,
  BookSnapshot,
  TradeTick,
  Candle,
  Order,
  WalletBalance,
  DutchAuction,
  ReconciliationRing,
  MLRiskAccount,
  TransactionReceipt,
  AuthUser,
  AuthSessionResponse,
} from "@/lib/types";
import { MOCK_ASSETS } from "./fixtures/assets";
import { generateMockBookSnapshot } from "./fixtures/orderBook";
import { generateMockTrades } from "./fixtures/trades";
import { generateSeededCandles } from "./fixtures/candles";
import { MOCK_ORDERS } from "./fixtures/orders";
import { MOCK_WALLET } from "./fixtures/wallet";
import { MOCK_AUCTIONS } from "./fixtures/auctions";
import { MOCK_RECONCILIATION_RINGS } from "./fixtures/reconciliation";
import { MOCK_ML_RISK_SCORES } from "./fixtures/mlScores";
import { ApiErrorPayload } from "@/lib/errors";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  created_at: number;
}

export interface ServerSession {
  token: string;
  user_id: string;
  email: string;
  name: string;
  created_at: number;
  expires_at: number;
}

// In-memory mock server state
class FakeServerStore {
  // User Registry & Sessions
  private users: UserRecord[] = [
    {
      id: "trader_01",
      email: "trader@darkhold.io",
      name: "trader_01",
      passwordHash: "darkhold2026!",
      created_at: Date.now() - 86400000 * 7,
    },
    {
      id: "trader_taken",
      email: "taken@darkhold.io",
      name: "taken_user",
      passwordHash: "Darkhold123!",
      created_at: Date.now() - 86400000 * 30,
    },
  ];

  // Map of sessionToken -> ServerSession
  private sessions: Map<string, ServerSession> = new Map([
    [
      "dkh_sess_trader_01_live",
      {
        token: "dkh_sess_trader_01_live",
        user_id: "trader_01",
        email: "trader@darkhold.io",
        name: "trader_01",
        created_at: Date.now() - 3600000,
        expires_at: Date.now() + 86400000 * 30,
      },
    ],
  ]);

  // Auth rate limiting failure tracker: key -> { count: number, lockedUntil: number }
  private authFailures: Map<string, { count: number; lockedUntil: number }> = new Map();
  public assets: Asset[] = [...MOCK_ASSETS];
  public orders: Order[] = [...MOCK_ORDERS];
  public wallet: WalletBalance = JSON.parse(JSON.stringify(MOCK_WALLET));
  public auctions: DutchAuction[] = [...MOCK_AUCTIONS];
  public rings: ReconciliationRing[] = [...MOCK_RECONCILIATION_RINGS];
  public mlScores: MLRiskAccount[] = [...MOCK_ML_RISK_SCORES];
  public receipts: TransactionReceipt[] = [
    {
      trade_id: "TRD-4998",
      ledger_tx_id: "LTX-8849201",
      asset_id: "DARKHOLD-PASS-2026",
      asset_name: "Darkhold Fest Weekend Pass",
      side: "BUY",
      qty: 1,
      price: 26500,
      total_cost: 26500,
      counterparty_id: "sim_bot_echo_4",
      counterparty_is_sim: true,
      matched_at: Date.now() - 3600000,
      settled_at: Date.now() - 3598500,
      balance_before: 500000,
      balance_after: 473500,
      settlement_status: "COMPLETED",
    },
    {
      trade_id: "TRD-4890",
      ledger_tx_id: "LTX-8739104",
      asset_id: "MOONRISE-GA-2026",
      asset_name: "Moonrise GA Pass",
      side: "SELL",
      qty: 1,
      price: 19500,
      total_cost: 19500,
      counterparty_id: "sim_market_maker",
      counterparty_is_sim: true,
      matched_at: Date.now() - 14400000,
      settled_at: Date.now() - 14399100,
      balance_before: 454000,
      balance_after: 473500,
      settlement_status: "COMPLETED",
    },
  ];

  // Map to enforce idempotency
  private processedKeys: Set<string> = new Set();

  public getAssets(): Asset[] {
    return this.assets;
  }

  public getAsset(id: string): Asset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  public getBook(assetId: string): BookSnapshot {
    return generateMockBookSnapshot(assetId, Date.now() % 100000);
  }

  public getTrades(assetId: string): TradeTick[] {
    return generateMockTrades(assetId, 30);
  }

  public getCandles(assetId: string, interval: "5s" | "1m" = "1m"): Candle[] {
    return generateSeededCandles(assetId, interval, 60);
  }

  public getWallet(): WalletBalance {
    return this.wallet;
  }

  public getOrders(): Order[] {
    return this.orders;
  }

  public getAuctions(): DutchAuction[] {
    return this.auctions;
  }

  public getAuction(id: string): DutchAuction | undefined {
    return this.auctions.find((a) => a.auction_id === id);
  }

  public getReconciliationRings(): ReconciliationRing[] {
    return this.rings;
  }

  public getMlScores(): MLRiskAccount[] {
    return this.mlScores;
  }

  public getReceipts(): TransactionReceipt[] {
    return this.receipts;
  }

  // Submit Order Mock Handler
  public submitOrder(params: {
    idempotencyKey: string;
    assetId: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    price: number;
    qty: number;
  }): { status: number; data?: Order; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check Idempotency conflict
    if (this.processedKeys.has(params.idempotencyKey)) {
      return {
        status: 409,
        error: {
          code: "IDEMPOTENCY_CONFLICT",
          requestId,
        },
      };
    }
    this.processedKeys.add(params.idempotencyKey);

    const asset = this.getAsset(params.assetId);
    if (!asset) {
      return {
        status: 404,
        error: {
          code: "INTERNAL_ERROR",
          requestId,
        },
      };
    }

    if (asset.is_halted) {
      return {
        status: 400,
        error: {
          code: "ASSET_NOT_TRADABLE",
          requestId,
        },
      };
    }

    // Server truth enforcement: Price ceiling (The Ward)
    if (params.side === "BUY" && params.type === "LIMIT" && params.price > asset.ceiling_price) {
      return {
        status: 422,
        error: {
          code: "PRICE_ABOVE_CEILING",
          context: {
            ceiling: asset.ceiling_price,
            face: asset.face_value,
            pct: asset.ceiling_pct,
          },
          requestId,
        },
      };
    }

    // Balance check for Buy
    const estimatedCost = params.type === "LIMIT" ? params.price * params.qty : asset.ceiling_price * params.qty;
    if (params.side === "BUY" && this.wallet.available_credits < estimatedCost) {
      return {
        status: 400,
        error: {
          code: "INSUFFICIENT_FUNDS",
          context: {
            needed: estimatedCost,
            available: this.wallet.available_credits,
          },
          requestId,
        },
      };
    }

    // Holdings check for Sell
    if (params.side === "SELL") {
      const holding = this.wallet.holdings.find((h) => h.asset_id === params.assetId);
      if (!holding || holding.available_units < params.qty) {
        return {
          status: 400,
          error: {
            code: "INSUFFICIENT_HOLDINGS",
            context: {
              available: holding?.available_units ?? 0,
            },
            requestId,
          },
        };
      }
    }

    // Order ACCEPTED (202 - not filled yet, fills happen over matching engine pipeline)
    const newOrder: Order = {
      order_id: `ORD-${Date.now().toString().slice(-4)}`,
      idempotency_key: params.idempotencyKey,
      asset_id: params.assetId,
      side: params.side,
      type: params.type,
      price: params.price,
      qty: params.qty,
      matched_qty: 0,
      remaining_qty: params.qty,
      status: "OPEN",
      settlement_status: "PENDING", // Reserved state
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Server slides funds to reserved
    if (params.side === "BUY") {
      this.wallet.available_credits -= estimatedCost;
      this.wallet.reserved_credits += estimatedCost;
    } else {
      const holding = this.wallet.holdings.find((h) => h.asset_id === params.assetId);
      if (holding) {
        holding.available_units -= params.qty;
        holding.reserved_units += params.qty;
      }
    }

    this.orders.unshift(newOrder);

    return {
      status: 202,
      data: newOrder,
    };
  }

  // Cancel Order Mock Handler
  public cancelOrder(orderId: string): { status: number; data?: Order; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const order = this.orders.find((o) => o.order_id === orderId);

    if (!order) {
      return {
        status: 404,
        error: { code: "INTERNAL_ERROR", requestId },
      };
    }

    if (order.status === "FILLED" || order.status === "CANCELED") {
      return {
        status: 400,
        error: { code: "ORDER_NOT_CANCELABLE", requestId },
      };
    }

    order.status = "CANCELED";
    order.settlement_status = "COMPLETED";
    order.updated_at = Date.now();

    // Release reserved funds
    if (order.side === "BUY") {
      const asset = this.getAsset(order.asset_id);
      const effectivePrice =
        order.type === "MARKET" ? (asset?.ceiling_price ?? 0) : order.price;
      const refund = effectivePrice * order.remaining_qty;
      this.wallet.reserved_credits = Math.max(0, this.wallet.reserved_credits - refund);
      this.wallet.available_credits += refund;
    } else {
      const holding = this.wallet.holdings.find((h) => h.asset_id === order.asset_id);
      if (holding) {
        holding.reserved_units -= order.remaining_qty;
        holding.available_units += order.remaining_qty;
      }
    }

    return {
      status: 200,
      data: order,
    };
  }

  // Buy / Accept Auction Mock Handler
  public buyAuction(params: {
    auctionId: string;
    maxPrice?: number;
  }): {
    status: number;
    data?: { auction: DutchAuction; receipt: TransactionReceipt };
    error?: ApiErrorPayload;
  } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const auction = this.getAuction(params.auctionId);

    if (!auction) {
      return {
        status: 404,
        error: { code: "INTERNAL_ERROR", requestId },
      };
    }

    if (auction.status === "SOLD") {
      return {
        status: 409,
        error: { code: "AUCTION_ALREADY_SOLD", requestId },
      };
    }

    if (auction.status !== "ACTIVE") {
      return {
        status: 400,
        error: { code: "AUCTION_NOT_ACTIVE", requestId },
      };
    }

    if (params.maxPrice !== undefined && auction.current_price > params.maxPrice) {
      return {
        status: 409,
        error: { code: "PRICE_MOVED", requestId },
      };
    }

    const price = params.maxPrice !== undefined ? params.maxPrice : auction.current_price;
    const totalCost = price * auction.qty;

    if (this.wallet.available_credits < totalCost) {
      return {
        status: 400,
        error: {
          code: "INSUFFICIENT_FUNDS",
          context: {
            needed: totalCost,
            available: this.wallet.available_credits,
          },
          requestId,
        },
      };
    }

    const balanceBefore = this.wallet.available_credits;
    this.wallet.available_credits -= totalCost;
    this.wallet.total_credits -= totalCost;

    // Add holdings to buyer wallet
    const holding = this.wallet.holdings.find((h) => h.asset_id === auction.asset_id);
    if (holding) {
      const prevCost = holding.avg_cost * holding.total_units;
      holding.available_units += auction.qty;
      holding.total_units += auction.qty;
      holding.avg_cost = Math.round((prevCost + totalCost) / holding.total_units);
      holding.current_price = price;
    } else {
      const asset = this.getAsset(auction.asset_id);
      this.wallet.holdings.push({
        asset_id: auction.asset_id,
        symbol: asset?.symbol || "ASSET",
        name: auction.asset_name,
        available_units: auction.qty,
        reserved_units: 0,
        total_units: auction.qty,
        avg_cost: price,
        current_price: price,
      });
    }

    auction.status = "SOLD";
    auction.current_price = price;
    auction.winning_buyer_id = "trader_01";

    const receipt: TransactionReceipt = {
      trade_id: `TRD-${Date.now().toString().slice(-4)}`,
      ledger_tx_id: `LTX-${Math.floor(1000000 + Math.random() * 9000000)}`,
      asset_id: auction.asset_id,
      asset_name: auction.asset_name,
      side: "BUY",
      qty: auction.qty,
      price,
      total_cost: totalCost,
      counterparty_id: auction.seller_id,
      counterparty_is_sim: auction.is_sim_seller,
      matched_at: Date.now(),
      settled_at: Date.now(),
      balance_before: balanceBefore,
      balance_after: this.wallet.available_credits,
      settlement_status: "COMPLETED",
    };
    this.receipts.unshift(receipt);

    return {
      status: 200,
      data: { auction, receipt },
    };
  }

  // Create Auction Mock Handler
  public createAuction(params: {
    idempotencyKey?: string;
    assetId: string;
    qty: number;
    startPrice: number;
    floorPrice: number;
    durationMinutes: number;
    stepSeconds?: number;
  }): { status: number; data?: DutchAuction; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Idempotency enforcement to prevent duplicate submission
    if (params.idempotencyKey) {
      if (this.processedKeys.has(params.idempotencyKey)) {
        return {
          status: 409,
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            requestId,
          },
        };
      }
      this.processedKeys.add(params.idempotencyKey);
    }

    if (params.qty <= 0) {
      return {
        status: 400,
        error: {
          code: "VALIDATION_FAILED",
          context: { field: "qty", field_message: "Quantity must be at least 1 unit." },
          requestId,
        },
      };
    }

    if (params.floorPrice <= 0 || params.floorPrice > params.startPrice) {
      return {
        status: 400,
        error: {
          code: "VALIDATION_FAILED",
          context: {
            field: "floorPrice",
            field_message: "Floor price must be positive and less than or equal to start price.",
          },
          requestId,
        },
      };
    }

    const asset = this.getAsset(params.assetId);
    if (!asset) {
      return {
        status: 404,
        error: {
          code: "INTERNAL_ERROR",
          requestId,
        },
      };
    }

    if (asset.is_halted) {
      return {
        status: 400,
        error: {
          code: "ASSET_NOT_TRADABLE",
          requestId,
        },
      };
    }

    // Server-side ceiling check (The Ward enforcement)
    if (params.startPrice > asset.ceiling_price) {
      return {
        status: 422,
        error: {
          code: "PRICE_ABOVE_CEILING",
          context: {
            ceiling: asset.ceiling_price,
            face: asset.face_value,
            pct: asset.ceiling_pct,
          },
          requestId,
        },
      };
    }

    // Holdings check: ensure seller has enough available units and cannot auction twice
    const holding = this.wallet.holdings.find((h) => h.asset_id === params.assetId);
    if (!holding || holding.available_units < params.qty) {
      return {
        status: 400,
        error: {
          code: "INSUFFICIENT_HOLDINGS",
          context: { available: holding?.available_units ?? 0 },
          requestId,
        },
      };
    }

    // Lock and reserve seller's units (prevents double auctioning)
    holding.available_units -= params.qty;
    holding.reserved_units += params.qty;

    const stepSec = params.stepSeconds || 15;
    const priceRange = params.startPrice - params.floorPrice;
    const estimatedSteps = Math.max(1, (params.durationMinutes * 60) / stepSec);
    const decrement = Math.max(10, Math.floor(priceRange / estimatedSteps));

    const newAuction: DutchAuction = {
      auction_id: `AUC-${Date.now().toString().slice(-4)}`,
      asset_id: params.assetId,
      asset_name: asset.name,
      seller_id: "trader_01",
      is_sim_seller: false,
      qty: params.qty,
      start_price: params.startPrice,
      floor_price: params.floorPrice,
      ceiling_price: asset.ceiling_price,
      current_price: params.startPrice,
      start_time: Date.now(),
      end_time: Date.now() + params.durationMinutes * 60 * 1000,
      step_seconds: stepSec,
      price_decrement: decrement,
      next_step_in_seconds: stepSec,
      status: "ACTIVE",
    };

    this.auctions.unshift(newAuction);

    return {
      status: 201,
      data: newAuction,
    };
  }

  // ================= Auth Service =================
  public validateSession(token?: string): {
    valid: boolean;
    session?: ServerSession;
    error?: ApiErrorPayload;
  } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    if (!token) {
      return {
        valid: false,
        error: {
          code: "UNAUTHENTICATED",
          context: { field_message: "Authorization token is missing." },
          requestId,
        },
      };
    }

    const session = this.sessions.get(token);
    if (!session) {
      return {
        valid: false,
        error: {
          code: "UNAUTHENTICATED",
          context: { field_message: "Invalid session token. Please log in." },
          requestId,
        },
      };
    }

    if (session.expires_at < Date.now()) {
      this.sessions.delete(token);
      return {
        valid: false,
        error: {
          code: "UNAUTHENTICATED",
          context: { field_message: "Session expired. Please log in again." },
          requestId,
        },
      };
    }

    return { valid: true, session };
  }

  public login(params: {
    email: string;
    password: string;
  }): { status: number; data?: AuthSessionResponse; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const emailKey = params.email.toLowerCase().trim();
    const now = Date.now();

    // 1. Backend rate limiting check
    const failRecord = this.authFailures.get(emailKey);
    if (failRecord && failRecord.lockedUntil > now) {
      const retryAfter = Math.ceil((failRecord.lockedUntil - now) / 1000);
      return {
        status: 429,
        error: {
          code: "RATE_LIMITED",
          context: { retry_after_seconds: retryAfter },
          requestId,
        },
      };
    }

    // Test shortcut: password === "ratelimit" triggers server-side rate limit
    if (params.password === "ratelimit") {
      this.authFailures.set(emailKey, { count: 3, lockedUntil: now + 10000 });
      return {
        status: 429,
        error: {
          code: "RATE_LIMITED",
          context: { retry_after_seconds: 10 },
          requestId,
        },
      };
    }

    // 2. Lookup user and verify credentials
    const user = this.users.find((u) => u.email.toLowerCase() === emailKey);
    const passwordMatches =
      user &&
      (user.passwordHash === params.password ||
        (params.password !== "wrongpassword" && params.password.length >= 8));

    if (!user || !passwordMatches || params.password === "wrongpassword") {
      const prevCount = failRecord?.count ?? 0;
      const newCount = prevCount + 1;
      if (newCount >= 3) {
        this.authFailures.set(emailKey, { count: newCount, lockedUntil: now + 10000 });
        return {
          status: 429,
          error: {
            code: "RATE_LIMITED",
            context: { retry_after_seconds: 10 },
            requestId,
          },
        };
      } else {
        this.authFailures.set(emailKey, { count: newCount, lockedUntil: 0 });
      }

      return {
        status: 401,
        error: {
          code: "UNAUTHENTICATED",
          context: { field_message: "Email or password incorrect." },
          requestId,
        },
      };
    }

    // 3. Clear failure tracking on success
    this.authFailures.delete(emailKey);

    // 4. Create and persist server session token
    const token = `dkh_sess_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    const session: ServerSession = {
      token,
      user_id: user.id,
      email: user.email,
      name: user.name,
      created_at: now,
      expires_at: expiresAt,
    };
    this.sessions.set(token, session);

    return {
      status: 200,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token,
        expires_at: expiresAt,
      },
    };
  }

  public register(params: {
    email: string;
    password: string;
    name?: string;
  }): { status: number; data?: AuthSessionResponse; error?: ApiErrorPayload } {
    const requestId = "REQ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const emailKey = params.email.toLowerCase().trim();
    const now = Date.now();

    // 1. Check rate limit
    const failRecord = this.authFailures.get(emailKey);
    if (failRecord && failRecord.lockedUntil > now) {
      const retryAfter = Math.ceil((failRecord.lockedUntil - now) / 1000);
      return {
        status: 429,
        error: {
          code: "RATE_LIMITED",
          context: { retry_after_seconds: retryAfter },
          requestId,
        },
      };
    }

    if (params.password === "ratelimit") {
      this.authFailures.set(emailKey, { count: 3, lockedUntil: now + 10000 });
      return {
        status: 429,
        error: {
          code: "RATE_LIMITED",
          context: { retry_after_seconds: 10 },
          requestId,
        },
      };
    }

    // 2. Validate email availability (handle email taken on backend)
    const existing = this.users.find((u) => u.email.toLowerCase() === emailKey);
    if (existing) {
      return {
        status: 409,
        error: {
          code: "VALIDATION_FAILED",
          context: {
            field: "email",
            field_message: "EMAIL_TAKEN: This email is already bound to an existing grimoire account.",
          },
          requestId,
        },
      };
    }

    // 3. Server-side security requirements enforcement (passphrase validation)
    const hasMinLen = params.password.length >= 8;
    const hasNumber = /\d/.test(params.password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(params.password);
    if (!hasMinLen || !hasNumber || !hasSymbol) {
      return {
        status: 400,
        error: {
          code: "VALIDATION_FAILED",
          context: {
            field: "password",
            field_message: "Passphrase must meet all three security requirements before registration.",
          },
          requestId,
        },
      };
    }

    // 4. Create user record
    const userId = `trader_${Math.floor(1000 + Math.random() * 9000)}`;
    const name = params.name || params.email.split("@")[0];
    const newUser: UserRecord = {
      id: userId,
      email: emailKey,
      name,
      passwordHash: params.password,
      created_at: now,
    };
    this.users.push(newUser);

    // Provision starter credits ($5,000.00) in vault for new registration
    this.wallet = {
      available_credits: 500000,
      reserved_credits: 0,
      total_credits: 500000,
      holdings: [],
    };

    // 5. Create server session
    const token = `dkh_sess_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
    const expiresAt = now + 24 * 60 * 60 * 1000;
    const session: ServerSession = {
      token,
      user_id: userId,
      email: emailKey,
      name,
      created_at: now,
      expires_at: expiresAt,
    };
    this.sessions.set(token, session);

    return {
      status: 201,
      data: {
        user: { id: userId, email: emailKey, name },
        token,
        expires_at: expiresAt,
      },
    };
  }

  public getSession(token?: string): {
    status: number;
    data?: { user: AuthUser; expires_at: number };
    error?: ApiErrorPayload;
  } {
    const val = this.validateSession(token);
    if (!val.valid || !val.session) {
      return {
        status: 401,
        error: val.error,
      };
    }

    return {
      status: 200,
      data: {
        user: {
          id: val.session.user_id,
          email: val.session.email,
          name: val.session.name,
        },
        expires_at: val.session.expires_at,
      },
    };
  }

  public logout(token: string): { status: number; message: string } {
    this.sessions.delete(token);
    return { status: 200, message: "Logged out successfully" };
  }
}

export const fakeServer = new FakeServerStore();
