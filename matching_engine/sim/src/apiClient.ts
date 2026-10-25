// The ONLY file that knows Member 3's REST field names. Everything else uses the normalized types below.
import type { Accounts, LoginResult } from './accounts';
import type { Clock } from './clock';
import type { Metrics } from './metrics';
import { PARAMS } from './params';
import type { Rng } from './rng';

type Obj = Record<string, unknown>;
export type Side = 'BUY' | 'SELL';

/** Request-body field names used when placing orders (edit here if Member 3's contract differs). */
const F = { qty: 'quantity', price: 'price' } as const;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiAsset {
  id: string;
  asset: string;
  faceValue: number;
  ceiling: number;
  tickSize: number;
  minQty: number;
  maxQty: number;
  status: string;
}
export interface BookLevel {
  price: number;
  qty: number;
}
export interface BookSnapshotData {
  asset: string;
  asOfSeq: number;
  bids: BookLevel[];
  asks: BookLevel[];
  bestBid: number | null;
  bestAsk: number | null;
}
export interface PlacedOrder {
  orderId: string;
  status: string;
}
export interface WalletData {
  available: number;
  reserved: number;
}
export interface HoldingData {
  asset: string;
  available: number;
  reserved: number;
}
export interface OpenOrderData {
  orderId: string;
  asset: string;
  side: Side;
  price: number;
  qty: number;
  remainingQty: number;
}
export interface TransactionData {
  asset: string;
  side: Side;
  price: number;
  qty: number;
  ts: number;
}
export interface AuctionCreated {
  auctionId: string;
  startPrice: number;
  floorPrice: number;
  endsAt: string | number | null;
}
export interface AuctionData {
  id: string;
  asset: string;
  currentPrice: number;
  floorPrice: number;
  qty: number;
  status: string;
  endsAt: string | number | null;
}
export interface AuctionReceipt {
  auctionId: string;
  price: number;
}

// ---------- tolerant field readers ----------
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function tryNum(o: Obj, keys: readonly string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function num(o: Obj, keys: readonly string[], dflt?: number): number {
  const v = tryNum(o, keys);
  if (v !== undefined) return v;
  if (dflt !== undefined) return dflt;
  throw new ApiError('BAD_RESPONSE', 0, `missing numeric field ${keys[0]}`);
}

function str(o: Obj, keys: readonly string[], dflt?: string): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v !== '') return v;
    if (typeof v === 'number') return String(v);
  }
  if (dflt !== undefined) return dflt;
  throw new ApiError('BAD_RESPONSE', 0, `missing string field ${keys[0]}`);
}

function timeLike(o: Obj, keys: readonly string[]): string | number | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v !== '') return v;
    if (typeof v === 'number') return v;
  }
  return null;
}

function toMs(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Date.parse(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function unwrapList(body: unknown): Obj[] {
  if (Array.isArray(body)) return body.filter(isObj);
  if (isObj(body)) {
    for (const k of ['items', 'data', 'assets', 'orders', 'transactions', 'holdings', 'auctions']) {
      const v = body[k];
      if (Array.isArray(v)) return v.filter(isObj);
    }
  }
  return [];
}

function levels(v: unknown): BookLevel[] {
  if (!Array.isArray(v)) return [];
  const out: BookLevel[] = [];
  for (const x of v) {
    if (Array.isArray(x) && x.length >= 2) {
      const p = Number(x[0]);
      const q = Number(x[1]);
      if (Number.isFinite(p) && Number.isFinite(q)) out.push({ price: p, qty: q });
    } else if (isObj(x)) {
      const p = tryNum(x, ['price', 'price_minor']);
      const q = tryNum(x, ['qty', 'quantity', 'total_qty']);
      if (p !== undefined && q !== undefined) out.push({ price: p, qty: q });
    }
  }
  return out;
}

/** Normalizes a REST book body or a WS BookSnapshot payload. Also used by marketFeed. */
export function normalizeBook(raw: unknown, assetHint = ''): BookSnapshotData {
  const o: Obj = isObj(raw) ? (isObj(raw.book) ? raw.book : raw) : {};
  const bids = levels(o.bids).sort((a, b) => b.price - a.price);
  const asks = levels(o.asks).sort((a, b) => a.price - b.price);
  return {
    asset: str(o, ['asset', 'symbol'], assetHint),
    asOfSeq: num(o, ['as_of_seq', 'asOfSeq'], 0),
    bids,
    asks,
    bestBid: bids.length > 0 ? bids[0]!.price : null,
    bestAsk: asks.length > 0 ? asks[0]!.price : null,
  };
}

function inner(body: unknown, key: string): Obj {
  if (!isObj(body)) return {};
  const v = body[key];
  return isObj(v) ? v : body;
}

function errorFrom(status: number, body: unknown, retryAfterMs?: number): ApiError {
  let code = `HTTP_${status}`;
  let message = `HTTP ${status}`;
  if (isObj(body)) {
    const e = isObj(body.error) ? body.error : body;
    if (typeof e.code === 'string' && e.code !== '') code = e.code;
    if (typeof e.message === 'string' && e.message !== '') message = e.message;
  }
  return new ApiError(code, status, message, retryAfterMs);
}

function parseRetryAfter(h: string | null): number {
  if (h) {
    const n = Number(h);
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 1000);
  }
  return 1000;
}

export interface ApiClientOptions {
  baseUrl: string;
  accounts: Accounts;
  metrics: Metrics;
  rng: Rng;
  clock: Clock;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly accounts: Accounts;
  private readonly metrics: Metrics;
  private readonly rng: Rng;
  private readonly clock: Clock;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private counters = new Map<string, number>();
  private cooldowns = new Map<string, number>();
  private assetIds = new Map<string, string>();

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.accounts = opts.accounts;
    this.metrics = opts.metrics;
    this.rng = opts.rng;
    this.clock = opts.clock;
    this.fetchFn = opts.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Epoch ms until which this bot must not call the API (set after a 429). 0 when not cooling down. */
  cooldownUntil(botKey: string): number {
    const until = this.cooldowns.get(botKey) ?? 0;
    return until > this.clock.now() ? until : 0;
  }

  private newKey(botKey: string): string {
    const n = (this.counters.get(botKey) ?? 0) + 1;
    this.counters.set(botKey, n);
    return `${botKey}-${n}-${this.rng.uuid()}`;
  }

  private async request(
    botKey: string | null,
    method: string,
    path: string,
    o: { body?: unknown; idempotencyKey?: string; query?: Record<string, string | number> } = {},
  ): Promise<unknown> {
    if (botKey) {
      const until = this.cooldownUntil(botKey);
      if (until > 0) throw new ApiError('RATE_LIMITED', 429, 'bot cooling down', until - this.clock.now());
    }
    let url = `${this.baseUrl}${path}`;
    if (o.query) {
      const qs = Object.entries(o.query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }
    const delays = PARAMS.api.retryDelaysMs;
    let attempt = 0;
    let reauthed = false;
    for (;;) {
      this.metrics.apiRequest();
      let res: Response;
      try {
        const headers: Record<string, string> = { accept: 'application/json' };
        if (o.body !== undefined) headers['content-type'] = 'application/json';
        if (o.idempotencyKey) headers['idempotency-key'] = o.idempotencyKey;
        if (botKey) headers.authorization = `Bearer ${await this.accounts.getToken(botKey)}`;
        res = await this.fetchFn(url, {
          method,
          headers,
          body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
          signal: AbortSignal.timeout(PARAMS.api.timeoutMs),
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        this.metrics.apiError('network');
        const delay = delays[attempt];
        if (delay !== undefined) {
          attempt++;
          await this.sleep(delay);
          continue;
        }
        throw new ApiError('NETWORK_ERROR', 0, err instanceof Error ? err.message : String(err));
      }

      const text = await res.text();
      let body: unknown;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = undefined;
        }
      }
      if (res.ok) return body;

      const status = res.status;
      this.metrics.apiError(status);
      if (status === 401 && botKey && !reauthed) {
        reauthed = true;
        this.accounts.invalidate(botKey);
        continue;
      }
      if (status >= 500) {
        const delay = delays[attempt];
        if (delay !== undefined) {
          attempt++;
          await this.sleep(delay);
          continue;
        }
        throw errorFrom(status, body);
      }
      if (status === 429) {
        const ra = parseRetryAfter(res.headers.get('retry-after'));
        if (botKey) this.cooldowns.set(botKey, this.clock.now() + ra);
        const e = errorFrom(status, body, ra);
        throw new ApiError(e.code === 'HTTP_429' ? 'RATE_LIMITED' : e.code, 429, e.message, ra);
      }
      throw errorFrom(status, body);
    }
  }

  // ---------- auth ----------
  async login(email: string, password: string): Promise<LoginResult> {
    const body = await this.request(null, 'POST', '/auth/login', { body: { email, password } });
    const o: Obj = isObj(body) ? body : {};
    const user = isObj(o.user) ? o.user : o;
    const result: LoginResult = {
      token: str(o, ['access_token', 'token', 'accessToken']),
      userId: str(user, ['id', 'user_id', 'userId']),
    };
    const exp = tryNum(o, ['expires_in', 'expiresIn']);
    if (exp !== undefined) result.expiresInSec = exp;
    return result;
  }

  // ---------- catalog and books (public) ----------
  async listAssets(): Promise<ApiAsset[]> {
    const body = await this.request(null, 'GET', '/assets');
    const out: ApiAsset[] = [];
    for (const o of unwrapList(body)) {
      const asset = str(o, ['engine_symbol', 'symbol', 'asset']);
      const id = str(o, ['id', 'asset_id'], asset);
      const faceValue = num(o, ['face_value_minor', 'faceValue', 'face_value']);
      let ceiling = tryNum(o, ['ceiling_minor', 'ceiling', 'resale_ceiling', 'ceilingMinor']);
      if (ceiling === undefined) {
        const bps = tryNum(o, ['ceiling_bps', 'ceilingBps']);
        if (bps === undefined) throw new ApiError('BAD_RESPONSE', 0, `asset ${asset} has no ceiling`);
        ceiling = Math.floor((faceValue * bps) / 10000);
      }
      this.assetIds.set(asset, id);
      out.push({
        id,
        asset,
        faceValue,
        ceiling,
        tickSize: num(o, ['tick_size', 'tickSize'], 1),
        minQty: num(o, ['min_qty', 'minQty'], 1),
        maxQty: num(o, ['max_qty', 'maxQty'], 10),
        status: str(o, ['status'], 'ACTIVE'),
      });
    }
    return out;
  }

  async getBook(asset: string): Promise<BookSnapshotData> {
    const id = this.assetIds.get(asset) ?? asset;
    const body = await this.request(null, 'GET', `/assets/${encodeURIComponent(id)}/book`, {
      query: { depth: PARAMS.api.bookDepth },
    });
    const book = normalizeBook(body, asset);
    return { ...book, asset };
  }

  // ---------- orders ----------
  async placeLimit(
    botKey: string,
    p: { asset: string; side: Side; price: number; qty: number; tif?: 'GTC' | 'IOC' },
  ): Promise<PlacedOrder> {
    const body: Obj = { asset: p.asset, side: p.side, type: 'LIMIT', [F.qty]: p.qty, [F.price]: p.price };
    if (p.tif) body.tif = p.tif;
    return this.placeOrder(botKey, body);
  }

  async placeMarket(
    botKey: string,
    p: { asset: string; side: Side; qty: number; protectionPrice: number },
  ): Promise<PlacedOrder> {
    const body: Obj = { asset: p.asset, side: p.side, type: 'MARKET', [F.qty]: p.qty, [F.price]: p.protectionPrice };
    return this.placeOrder(botKey, body);
  }

  private async placeOrder(botKey: string, body: Obj): Promise<PlacedOrder> {
    const key = this.newKey(botKey);
    this.metrics.orderSent(botKey);
    try {
      const res = await this.request(botKey, 'POST', '/orders', { body, idempotencyKey: key });
      const o = inner(res, 'order');
      const placed: PlacedOrder = {
        orderId: str(o, ['order_id', 'id', 'orderId']),
        status: str(o, ['status'], 'PENDING_SUBMIT'),
      };
      this.metrics.orderAccepted(botKey);
      return placed;
    } catch (err) {
      if (err instanceof ApiError) this.metrics.orderRejected(botKey, err.code);
      throw err;
    }
  }

  async cancel(botKey: string, orderId: string): Promise<void> {
    this.metrics.cancelSent(botKey);
    await this.request(botKey, 'DELETE', `/orders/${encodeURIComponent(orderId)}`, {
      idempotencyKey: this.newKey(botKey),
    });
  }

  // ---------- own state ----------
  async getWallet(botKey: string): Promise<WalletData> {
    const body = await this.request(botKey, 'GET', '/me/wallet');
    const o = inner(body, 'wallet');
    return {
      available: num(o, ['available_minor', 'available', 'available_funds']),
      reserved: num(o, ['reserved_minor', 'reserved', 'reserved_funds'], 0),
    };
  }

  async getHoldings(botKey: string): Promise<HoldingData[]> {
    const body = await this.request(botKey, 'GET', '/me/holdings');
    return unwrapList(body).map((o) => ({
      asset: str(o, ['engine_symbol', 'symbol', 'asset', 'asset_symbol']),
      available: num(o, ['available_qty', 'available'], 0),
      reserved: num(o, ['reserved_qty', 'reserved'], 0),
    }));
  }

  async getOpenOrders(botKey: string): Promise<OpenOrderData[]> {
    const body = await this.request(botKey, 'GET', '/me/orders', { query: { status: 'open' } });
    const out: OpenOrderData[] = [];
    for (const o of unwrapList(body)) {
      const status = str(o, ['status'], 'OPEN').toUpperCase();
      if (status !== 'OPEN' && status !== 'PARTIALLY_FILLED' && status !== 'PENDING_SUBMIT') continue;
      const qty = num(o, ['qty', 'quantity']);
      const matched = tryNum(o, ['matched_qty', 'filled_qty']) ?? 0;
      out.push({
        orderId: str(o, ['order_id', 'id', 'orderId']),
        asset: str(o, ['engine_symbol', 'symbol', 'asset', 'asset_symbol']),
        side: str(o, ['side']).toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
        price: num(o, ['limit_price_minor', 'price', 'limit_price']),
        qty,
        remainingQty: tryNum(o, ['remaining_qty']) ?? Math.max(0, qty - matched),
      });
    }
    return out;
  }

  async getTransactions(botKey: string): Promise<TransactionData[]> {
    const body = await this.request(botKey, 'GET', '/me/transactions', { query: { limit: 200 } });
    const out: TransactionData[] = [];
    for (const o of unwrapList(body)) {
      const side = str(o, ['side'], '').toUpperCase();
      if (side !== 'BUY' && side !== 'SELL') continue;
      out.push({
        asset: str(o, ['engine_symbol', 'symbol', 'asset', 'asset_symbol']),
        side,
        price: num(o, ['price_minor', 'price']),
        qty: num(o, ['qty', 'quantity']),
        ts: toMs(o.ts ?? o.settled_at ?? o.created_at),
      });
    }
    return out;
  }

  // ---------- auctions ----------
  async createAuction(
    botKey: string,
    p: { asset: string; qty: number; startPrice: number; floorPrice: number; stepSeconds: number; durationSec: number },
  ): Promise<AuctionCreated> {
    const res = await this.request(botKey, 'POST', '/auctions', {
      idempotencyKey: this.newKey(botKey),
      body: {
        asset: p.asset,
        [F.qty]: p.qty,
        start_price: p.startPrice,
        floor_price: p.floorPrice,
        step_seconds: p.stepSeconds,
        duration_seconds: p.durationSec,
      },
    });
    const o = inner(res, 'auction');
    return {
      auctionId: str(o, ['id', 'auction_id', 'auctionId']),
      startPrice: num(o, ['start_price_minor', 'start_price', 'startPrice'], p.startPrice),
      floorPrice: num(o, ['floor_price_minor', 'floor_price', 'floorPrice'], p.floorPrice),
      endsAt: timeLike(o, ['end_time', 'ends_at', 'endsAt']),
    };
  }

  async listAuctions(): Promise<AuctionData[]> {
    const body = await this.request(null, 'GET', '/auctions');
    return unwrapList(body).map((o) => ({
      id: str(o, ['id', 'auction_id']),
      asset: str(o, ['symbol', 'asset', 'asset_symbol']),
      currentPrice: num(o, ['current_price_minor', 'current_price', 'currentPrice']),
      floorPrice: num(o, ['floor_price_minor', 'floor_price'], 0),
      qty: num(o, ['qty', 'quantity'], 0),
      status: str(o, ['status'], 'ACTIVE'),
      endsAt: timeLike(o, ['end_time', 'ends_at', 'endsAt']),
    }));
  }

  async acceptAuction(botKey: string, auctionId: string, maxPrice: number): Promise<AuctionReceipt> {
    const res = await this.request(botKey, 'POST', `/auctions/${encodeURIComponent(auctionId)}/accept`, {
      idempotencyKey: this.newKey(botKey),
      body: { max_price: maxPrice },
    });
    const o = inner(res, 'receipt');
    return {
      auctionId,
      price: num(o, ['accepted_price_minor', 'accepted_price', 'price_minor', 'price'], maxPrice),
    };
  }
}
