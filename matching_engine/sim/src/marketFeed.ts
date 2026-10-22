import { readFile } from 'node:fs/promises';
import WebSocket from 'ws';
import { normalizeBook, type BookSnapshotData } from './apiClient';
import type { Clock, TimerHandle } from './clock';
import { log } from './log';
import { PARAMS } from './params';
import type { Rng } from './rng';

export interface TradeRec {
  ts: number;
  price: number;
  qty: number;
  takerSide: 'BUY' | 'SELL';
}

export interface MarketView {
  asset: string;
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  lastPrice: number | null;
  lastTradeTs: number;
  lastTradeSeq: number;
  referencePrice: number | null;
  asOfSeq: number;
  recentTrades: TradeRec[];
}

export interface WsLike {
  on(event: 'open' | 'message' | 'close' | 'error', cb: (...args: any[]) => void): unknown;
  send(data: string): void;
  close(): void;
}
export type WsFactory = (url: string) => WsLike;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function numOf(o: Obj, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function parseTrade(d: Obj): { trade: TradeRec; seq?: number } | null {
  const price = numOf(d, ['price', 'price_minor']);
  const qty = numOf(d, ['qty', 'quantity']);
  if (price === undefined || qty === undefined) return null;
  let ts = numOf(d, ['ts']);
  if (ts === undefined) {
    const t = d.ts ?? d.time;
    ts = typeof t === 'string' && Number.isFinite(Date.parse(t)) ? Date.parse(t) : Date.now();
  }
  const sideRaw = String(d.taker_side ?? d.aggressor_side ?? d.side ?? '').toUpperCase();
  const trade: TradeRec = { ts, price, qty, takerSide: sideRaw === 'SELL' ? 'SELL' : 'BUY' };
  const seq = numOf(d, ['seq']);
  return seq === undefined ? { trade } : { trade, seq };
}

export interface MarketFeedOptions {
  wsUrl: string;
  api: { getBook(asset: string): Promise<BookSnapshotData> };
  clock: Clock;
  rng: Rng;
  wsFactory?: WsFactory;
}

export class MarketFeed {
  private views = new Map<string, MarketView>();
  private socket: WsLike | null = null;
  private connected = false;
  private stopped = true;
  private backoffMs: number = PARAMS.marketFeed.reconnectBaseMs;
  private reconnectTimer: TimerHandle | undefined;
  private pollTimer: TimerHandle | undefined;
  private readonly wsFactory: WsFactory;

  constructor(private readonly opts: MarketFeedOptions) {
    this.wsFactory = opts.wsFactory ?? ((url) => new WebSocket(url) as unknown as WsLike);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getView(asset: string): MarketView | undefined {
    return this.views.get(asset);
  }

  views_(): MarketView[] {
    return [...this.views.values()];
  }

  private ensureView(asset: string): MarketView {
    let v = this.views.get(asset);
    if (!v) {
      v = {
        asset,
        bestBid: null,
        bestAsk: null,
        mid: null,
        lastPrice: null,
        lastTradeTs: 0,
        lastTradeSeq: -1,
        referencePrice: null,
        asOfSeq: -1,
        recentTrades: [],
      };
      this.views.set(asset, v);
    }
    return v;
  }

  /** Seeds referencePrice (and lastPrice if still unknown) from the seeded candle file. */
  async loadReferencePrices(file: string): Promise<void> {
    const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (!isObj(raw) || !isObj(raw.assets)) throw new Error(`unexpected seeded candles format in ${file}`);
    for (const [asset, entry] of Object.entries(raw.assets)) {
      if (!isObj(entry) || typeof entry.reference_price !== 'number') continue;
      const v = this.ensureView(asset);
      v.referencePrice = entry.reference_price;
      if (v.lastPrice === null) v.lastPrice = entry.reference_price;
    }
  }

  /** Returns false when the snapshot is stale (older as_of_seq) and was ignored. */
  applyBook(asset: string, snap: BookSnapshotData): boolean {
    const v = this.ensureView(asset);
    if (snap.asOfSeq < v.asOfSeq) return false;
    v.asOfSeq = snap.asOfSeq;
    v.bestBid = snap.bestBid;
    v.bestAsk = snap.bestAsk;
    v.mid = snap.bestBid !== null && snap.bestAsk !== null ? (snap.bestBid + snap.bestAsk) / 2 : null;
    return true;
  }

  applyTrade(asset: string, trade: TradeRec, seq?: number): boolean {
    const v = this.ensureView(asset);
    if (seq !== undefined) {
      if (seq <= v.lastTradeSeq) return false;
      v.lastTradeSeq = seq;
    }
    v.recentTrades.push(trade);
    while (v.recentTrades.length > PARAMS.marketFeed.recentTradesCap) v.recentTrades.shift();
    if (trade.ts >= v.lastTradeTs) {
      v.lastTradeTs = trade.ts;
      v.lastPrice = trade.price;
    }
    return true;
  }

  start(assets: string[]): void {
    if (!this.stopped) return;
    this.stopped = false;
    for (const a of assets) this.ensureView(a);
    void this.pollOnce();
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.connected = false;
    if (this.reconnectTimer !== undefined) this.opts.clock.clear(this.reconnectTimer);
    if (this.pollTimer !== undefined) this.opts.clock.clear(this.pollTimer);
    this.reconnectTimer = undefined;
    this.pollTimer = undefined;
    const s = this.socket;
    this.socket = null;
    if (s) {
      try {
        s.close();
      } catch {
        /* ignore */
      }
    }
  }

  private connect(): void {
    if (this.stopped) return;
    let ws: WsLike;
    try {
      ws = this.wsFactory(this.opts.wsUrl);
    } catch (err) {
      log.warn({ err }, 'ws connect threw');
      this.onDown();
      return;
    }
    this.socket = ws;
    ws.on('open', () => {
      if (this.socket !== ws) return;
      this.connected = true;
      this.backoffMs = PARAMS.marketFeed.reconnectBaseMs;
      this.stopPolling();
      for (const asset of this.views.keys()) {
        ws.send(JSON.stringify({ type: 'subscribe', channel: `book:${asset}` }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: `trades:${asset}` }));
      }
    });
    ws.on('message', (data: unknown) => this.onMessage(data));
    const down = (): void => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.connected = false;
      this.onDown();
    };
    ws.on('close', down);
    ws.on('error', down);
  }

  private onDown(): void {
    if (this.stopped) return;
    this.startPolling();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== undefined) return;
    const jitter = 0.8 + 0.4 * this.opts.rng.next();
    const delay = Math.round(this.backoffMs * jitter);
    this.backoffMs = Math.min(PARAMS.marketFeed.reconnectMaxMs, this.backoffMs * 2);
    this.reconnectTimer = this.opts.clock.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private startPolling(): void {
    if (this.pollTimer !== undefined) return;
    const tick = async (): Promise<void> => {
      this.pollTimer = undefined;
      if (this.stopped || this.connected) return;
      await this.pollOnce();
      if (!this.stopped && !this.connected && this.pollTimer === undefined) {
        this.pollTimer = this.opts.clock.setTimeout(() => void tick(), PARAMS.marketFeed.pollMs);
      }
    };
    this.pollTimer = this.opts.clock.setTimeout(() => void tick(), 0);
  }

  private stopPolling(): void {
    if (this.pollTimer !== undefined) {
      this.opts.clock.clear(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async pollOnce(): Promise<void> {
    for (const asset of [...this.views.keys()]) {
      try {
        this.applyBook(asset, await this.opts.api.getBook(asset));
      } catch (err) {
        log.debug({ err, asset }, 'book poll failed');
      }
    }
  }

  private onMessage(raw: unknown): void {
    let msg: unknown;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!isObj(msg)) return;
    const type = String(msg.type ?? msg.event ?? '');
    const channel = typeof msg.channel === 'string' ? msg.channel : '';
    const data: Obj = isObj(msg.data) ? msg.data : isObj(msg.payload) ? msg.payload : msg;
    const colon = channel.indexOf(':');
    const fromChannel = colon >= 0 ? channel.slice(colon + 1) : '';
    const asset = String(data.asset ?? data.symbol ?? fromChannel);
    if (!asset || !this.views.has(asset)) return;
    if (type === 'BookSnapshot' || channel.startsWith('book:')) {
      this.applyBook(asset, normalizeBook(data, asset));
    } else if (type === 'TradeTick' || channel.startsWith('trades:')) {
      const t = parseTrade(data);
      if (t) this.applyTrade(asset, t.trade, t.seq);
    }
  }
}
