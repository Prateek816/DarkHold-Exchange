import type { ApiAsset, BookSnapshotData, HoldingData, OpenOrderData, PlacedOrder, TransactionData, WalletData } from '../src/apiClient';
import type { AssetInfo, Liquidity } from '../src/assets';
import type { Clock } from '../src/clock';
import type { MarketView } from '../src/marketFeed';
import { Metrics } from '../src/metrics';
import { OwnStateStore } from '../src/ownState';
import { PARAMS } from '../src/params';
import type { PersonaContext } from '../src/personas/base';
import { RegimeManager } from '../src/regime';
import { Rng } from '../src/rng';

export class FakeApi {
  placedOrders: Array<{ botKey: string; body: any; type: 'LIMIT' | 'MARKET' }> = [];
  canceledOrders: Array<{ botKey: string; orderId: string }> = [];
  wallets = new Map<string, WalletData>();
  holdings = new Map<string, Map<string, number>>();
  transactions = new Map<string, TransactionData[]>();
  openOrders = new Map<string, OpenOrderData[]>();
  orderSeq = 1;

  async placeLimit(botKey: string, p: { asset: string; side: 'BUY' | 'SELL'; price: number; qty: number }): Promise<PlacedOrder> {
    const orderId = `ord-${this.orderSeq++}`;
    this.placedOrders.push({ botKey, body: p, type: 'LIMIT' });
    const list = this.openOrders.get(botKey) ?? [];
    list.push({
      orderId,
      asset: p.asset,
      side: p.side,
      price: p.price,
      qty: p.qty,
      remainingQty: p.qty,
    });
    this.openOrders.set(botKey, list);
    return { orderId, status: 'OPEN' };
  }

  async placeMarket(botKey: string, p: { asset: string; side: 'BUY' | 'SELL'; qty: number; protectionPrice: number }): Promise<PlacedOrder> {
    const orderId = `ord-${this.orderSeq++}`;
    this.placedOrders.push({ botKey, body: p, type: 'MARKET' });
    return { orderId, status: 'FILLED' };
  }

  async cancel(botKey: string, orderId: string): Promise<void> {
    this.canceledOrders.push({ botKey, orderId });
    const list = this.openOrders.get(botKey) ?? [];
    this.openOrders.set(botKey, list.filter((o) => o.orderId !== orderId));
  }

  async getWallet(botKey: string): Promise<WalletData> {
    return this.wallets.get(botKey) ?? { available: 10000000, reserved: 0 };
  }

  async getHoldings(botKey: string): Promise<HoldingData[]> {
    const h = this.holdings.get(botKey);
    if (!h) return [{ asset: 'DFEST-WKND', available: 100, reserved: 0 }];
    return [...h.entries()].map(([asset, available]) => ({ asset, available, reserved: 0 }));
  }

  async getOpenOrders(botKey: string): Promise<OpenOrderData[]> {
    return this.openOrders.get(botKey) ?? [];
  }

  async getTransactions(botKey: string): Promise<TransactionData[]> {
    return this.transactions.get(botKey) ?? [];
  }

  async listAssets(): Promise<ApiAsset[]> {
    return [
      {
        id: 'DFEST-WKND',
        asset: 'DFEST-WKND',
        faceValue: 10000,
        ceiling: 20000,
        tickSize: 100,
        minQty: 1,
        maxQty: 10,
        status: 'ACTIVE',
      },
      {
        id: 'MOONRISE-GA',
        asset: 'MOONRISE-GA',
        faceValue: 5000,
        ceiling: 15000,
        tickSize: 50,
        minQty: 1,
        maxQty: 10,
        status: 'ACTIVE',
      },
    ];
  }

  async getBook(_asset: string): Promise<BookSnapshotData> {
    return {
      asset: 'DFEST-WKND',
      asOfSeq: 1,
      bids: [{ price: 9900, qty: 5 }],
      asks: [{ price: 10100, qty: 5 }],
      bestBid: 9900,
      bestAsk: 10100,
    };
  }

  async createAuction(_botKey: string, p: any): Promise<any> {
    return {
      auctionId: 'auc-1',
      startPrice: p.startPrice,
      floorPrice: p.floorPrice,
      endsAt: '2026-10-25T15:00:00Z',
    };
  }
}

export class FakeFeed {
  views = new Map<string, MarketView>();

  getView(asset: string): MarketView | undefined {
    return this.views.get(asset);
  }

  setView(asset: string, view: Partial<MarketView>): void {
    const existing = this.views.get(asset) ?? {
      asset,
      bestBid: null,
      bestAsk: null,
      mid: null,
      lastPrice: null,
      lastTradeTs: 0,
      lastTradeSeq: 0,
      referencePrice: 10000,
      asOfSeq: 1,
      recentTrades: [],
    };
    this.views.set(asset, { ...existing, ...view });
  }
}

export class FakeCatalog {
  assets = new Map<string, AssetInfo>();

  constructor() {
    this.set('DFEST-WKND', {
      asset: 'DFEST-WKND',
      faceValue: 10000,
      ceiling: 20000,
      tickSize: 100,
      minQty: 1,
      maxQty: 10,
      status: 'ACTIVE',
      liquidity: 'HIGH' as Liquidity,
    });
    this.set('MOONRISE-GA', {
      asset: 'MOONRISE-GA',
      faceValue: 5000,
      ceiling: 15000,
      tickSize: 50,
      minQty: 1,
      maxQty: 10,
      status: 'ACTIVE',
      liquidity: 'MEDIUM' as Liquidity,
    });
  }

  set(asset: string, info: AssetInfo): void {
    this.assets.set(asset, info);
  }

  get(asset: string): AssetInfo | undefined {
    return this.assets.get(asset);
  }

  all(): AssetInfo[] {
    return [...this.assets.values()];
  }

  tradable(): AssetInfo[] {
    return this.all().filter((a) => a.status === 'ACTIVE');
  }
}

export function createTestPersonaContext(clock: Clock, seed = 'test-seed'): {
  ctx: PersonaContext;
  api: FakeApi;
  feed: FakeFeed;
  catalog: FakeCatalog;
} {
  const rng = new Rng(seed);
  const metrics = new Metrics();
  const api = new FakeApi();
  const feed = new FakeFeed();
  const catalog = new FakeCatalog();
  const own = new OwnStateStore(clock, rng);
  const regime = new RegimeManager({ mode: 'demo', rng: rng.child('regime'), clock });

  // Accounts stub
  const mockAccounts = [
    { key: 'mm-01', email: 'mm-01@sim.darkhold.local', password: 'pw', role: 'market_maker' as const, isSimulated: true, starterCredits: 20000000, initialUnits: { 'DFEST-WKND': 100 }, quotes: ['DFEST-WKND'] },
    { key: 'noise-01', email: 'noise-01@sim.darkhold.local', password: 'pw', role: 'noise' as const, isSimulated: true, starterCredits: 1000000, initialUnits: { 'DFEST-WKND': 20 }, quotes: [] },
    { key: 'noise-02', email: 'noise-02@sim.darkhold.local', password: 'pw', role: 'noise' as const, isSimulated: true, starterCredits: 1000000, initialUnits: { 'DFEST-WKND': 20 }, quotes: [] },
    { key: 'momentum-01', email: 'momentum-01@sim.darkhold.local', password: 'pw', role: 'momentum' as const, isSimulated: true, starterCredits: 1000000, initialUnits: { 'DFEST-WKND': 20 }, quotes: [] },
    { key: 'profit-01', email: 'profit-01@sim.darkhold.local', password: 'pw', role: 'profit_taker' as const, isSimulated: true, starterCredits: 1000000, initialUnits: { 'DFEST-WKND': 20 }, quotes: [] },
    { key: 'demo-seller', email: 'demo-seller@sim.darkhold.local', password: 'pw', role: 'judge_seller' as const, isSimulated: true, starterCredits: 0, initialUnits: { 'DFEST-WKND': 500 }, quotes: [] },
    { key: 'scalper-1', email: 'scalper-1@sim.darkhold.local', password: 'pw', role: 'scalper' as const, isSimulated: true, starterCredits: 1000000, initialUnits: { 'DFEST-WKND': 50 }, quotes: [] },
    { key: 'issuer', email: 'issuer@sim.darkhold.local', password: 'pw', role: 'issuer' as const, isSimulated: true, starterCredits: 0, initialUnits: { 'DFEST-WKND': 4000 }, quotes: [] },
  ];

  const accounts: any = {
    list: (filter?: any) => {
      if (!filter?.role) return mockAccounts;
      const roles = Array.isArray(filter.role) ? filter.role : [filter.role];
      return mockAccounts.filter((a) => roles.includes(a.role));
    },
    get: (key: string) => mockAccounts.find((a) => a.key === key),
    has: (key: string) => mockAccounts.some((a) => a.key === key),
    login: async () => ({ token: 'mock-token', userId: 'mock-user' }),
    getToken: async () => 'mock-token',
    getUserId: async () => 'mock-user',
  };

  const ctx: PersonaContext = {
    rng,
    clock,
    metrics,
    accounts,
    api: api as any,
    catalog: catalog as any,
    feed: feed as any,
    own,
    regime,
    params: PARAMS,
  };

  return { ctx, api, feed, catalog };
}
