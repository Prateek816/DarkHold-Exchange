import type { Clock } from './clock';
import { log } from './log';
import { PARAMS } from './params';
import type { Rng } from './rng';
import type { HoldingData, OpenOrderData, TransactionData, WalletData } from './apiClient';

export interface TrackedOrder {
  id: string;
  asset: string;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  placedAt: number;
  /** Time-to-live in ms, or null for orders that are never auto-canceled. */
  ttlMs: number | null;
  managedBy: string;
}

export interface OwnStateApi {
  getWallet(botKey: string): Promise<WalletData>;
  getHoldings(botKey: string): Promise<HoldingData[]>;
  getTransactions(botKey: string): Promise<TransactionData[]>;
  getOpenOrders(botKey: string): Promise<OpenOrderData[]>;
}

export class OwnState {
  private orders = new Map<string, TrackedOrder>();
  private cash = 0;
  private units = new Map<string, number>();
  private basis = new Map<string, number>();
  private lastBalanceRefresh = -Infinity;
  private nextReconcileAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(
    readonly botKey: string,
    private readonly clock: Clock,
    private readonly rng: Rng,
  ) {}

  // ----- tracked orders -----
  track(order: TrackedOrder): void {
    this.orders.set(order.id, order);
  }

  drop(id: string): void {
    this.orders.delete(id);
  }

  has(id: string): boolean {
    return this.orders.has(id);
  }

  list(asset?: string): TrackedOrder[] {
    const out = [...this.orders.values()].filter((o) => asset === undefined || o.asset === asset);
    return out.sort((a, b) => a.placedAt - b.placedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  /** Orders whose TTL has elapsed. Market-maker quotes are never returned. */
  expired(now: number = this.clock.now()): TrackedOrder[] {
    return this.list().filter(
      (o) => o.ttlMs !== null && o.managedBy !== 'marketMaker' && o.placedAt + o.ttlMs <= now,
    );
  }

  // ----- cached balances -----
  availableCash(): number {
    return this.cash;
  }

  availableUnits(asset: string): number {
    return this.units.get(asset) ?? 0;
  }

  /** Average buy price over settled buys, or null when there is no basis. */
  costBasis(asset: string): number | null {
    return this.basis.get(asset) ?? null;
  }

  /** Optimistic local adjustment applied after placing an order, until the next refresh. */
  adjustCash(delta: number): void {
    this.cash += delta;
  }

  adjustUnits(asset: string, delta: number): void {
    this.units.set(asset, (this.units.get(asset) ?? 0) + delta);
  }

  // ----- refresh -----
  async refreshBalances(api: OwnStateApi): Promise<void> {
    const [wallet, holdings, txs] = await Promise.all([
      api.getWallet(this.botKey),
      api.getHoldings(this.botKey),
      api.getTransactions(this.botKey),
    ]);
    this.cash = wallet.available;
    this.units = new Map(holdings.map((h) => [h.asset, h.available]));
    const cost = new Map<string, number>();
    const qty = new Map<string, number>();
    for (const t of txs) {
      if (t.side !== 'BUY') continue;
      cost.set(t.asset, (cost.get(t.asset) ?? 0) + t.price * t.qty);
      qty.set(t.asset, (qty.get(t.asset) ?? 0) + t.qty);
    }
    this.basis = new Map();
    for (const [asset, q] of qty) if (q > 0) this.basis.set(asset, (cost.get(asset) ?? 0) / q);
  }

  /** Drops locally tracked orders that the server no longer lists as open. */
  async reconcile(api: OwnStateApi): Promise<void> {
    const open = await api.getOpenOrders(this.botKey);
    const ids = new Set(open.map((o) => o.orderId));
    const now = this.clock.now();
    for (const o of [...this.orders.values()]) {
      if (!ids.has(o.id) && now - o.placedAt > PARAMS.ownState.reconcileGraceMs) this.orders.delete(o.id);
    }
  }

  /** Refreshes balances every 10 s and reconciles open orders every 15 s (plus jitter). Safe to call often. */
  refreshIfDue(api: OwnStateApi): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const now = this.clock.now();
    const needBalances = now - this.lastBalanceRefresh >= PARAMS.ownState.balanceRefreshMs;
    const needReconcile = now >= this.nextReconcileAt;
    if (!needBalances && !needReconcile) return Promise.resolve();
    this.refreshing = (async () => {
      try {
        if (needBalances) {
          this.lastBalanceRefresh = this.clock.now();
          await this.refreshBalances(api);
        }
        if (needReconcile) {
          this.nextReconcileAt =
            this.clock.now() + PARAMS.ownState.reconcileMs + this.rng.int(0, PARAMS.ownState.reconcileJitterMs);
          await this.reconcile(api);
        }
      } catch (err) {
        log.warn({ err, bot: this.botKey }, 'own state refresh failed');
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }
}

export class OwnStateStore {
  private bots = new Map<string, OwnState>();

  constructor(
    private readonly clock: Clock,
    private readonly rng: Rng,
  ) {}

  forBot(botKey: string): OwnState {
    let s = this.bots.get(botKey);
    if (!s) {
      s = new OwnState(botKey, this.clock, this.rng.child(`own:${botKey}`));
      this.bots.set(botKey, s);
    }
    return s;
  }
}
