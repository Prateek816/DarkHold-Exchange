import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Asset, OrderBookSnapshot, TradeTick, Candle,
  UserOrder, UserHolding, UserWallet, DutchAuction, ReconRule,
} from './types';
import { MOCK_RECON_RULES } from '@/mocks/fixtures';

/* ═══════════════════════════════════════════════════════════
   CONNECTION STORE
═══════════════════════════════════════════════════════════ */
type ConnStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

interface ConnState {
  status: ConnStatus;
  lastMessageAt: number;
  reconnectAttempt: number;
  setStatus: (s: ConnStatus) => void;
  setLastMessage: () => void;
  incAttempt: () => void;
  resetAttempt: () => void;
}

export const useConnStore = create<ConnState>()(
  subscribeWithSelector((set) => ({
    status: 'connecting',
    lastMessageAt: Date.now(),
    reconnectAttempt: 0,
    setStatus: (s) => set({ status: s }),
    setLastMessage: () => set({ lastMessageAt: Date.now() }),
    incAttempt: () => set((st) => ({ reconnectAttempt: st.reconnectAttempt + 1 })),
    resetAttempt: () => set({ reconnectAttempt: 0 }),
  }))
);

/* ═══════════════════════════════════════════════════════════
   USER / AUTH STORE
═══════════════════════════════════════════════════════════ */
export interface UserProfile {
  id: string;
  email: string;
  role: 'USER' | 'OPERATOR' | 'ISSUER';
}

interface UserState {
  user: UserProfile | null;
  token: string | null;
  wallet: UserWallet | null;
  holdings: UserHolding[];
  orders: UserOrder[];
  setUser: (u: UserProfile, token: string) => void;
  logout: () => void;
  setWallet: (w: UserWallet) => void;
  setHoldings: (h: UserHolding[]) => void;
  setOrders: (o: UserOrder[]) => void;
  upsertOrder: (o: UserOrder) => void;
  cancelOrder: (orderId: string) => void;
}

export const useUserStore = create<UserState>()(
  subscribeWithSelector((set) => ({
    user: { id: 'usr-demo-01', email: 'demo@darkhold.io', role: 'OPERATOR' },
    token: 'mock-token',
    wallet: {
      available_balance: 150000,
      reserved_balance: 27800,
      total_balance: 177800,
    },
    holdings: [],
    orders: [],
    setUser: (u, token) => set({ user: u, token }),
    logout: () => set({ user: null, token: null, wallet: null, holdings: [], orders: [] }),
    setWallet: (w) => set({ wallet: w }),
    setHoldings: (h) => set({ holdings: h }),
    setOrders: (o) => set({ orders: o }),
    upsertOrder: (incoming) =>
      set((st) => {
        const ORDER_RANK: Record<string, number> = {
          PENDING_SUBMIT: 0, OPEN: 1, PARTIALLY_FILLED: 2,
          FILLED: 3, CANCELING: 4, CANCELED: 5, REJECTED: 6,
        };
        const existing = st.orders.find((o) => o.id === incoming.id);
        if (existing && (ORDER_RANK[existing.status] ?? 0) > (ORDER_RANK[incoming.status] ?? 0)) {
          return {}; // never regress status
        }
        const next = existing
          ? st.orders.map((o) => (o.id === incoming.id ? incoming : o))
          : [...st.orders, incoming];
        return { orders: next };
      }),
    cancelOrder: (orderId) =>
      set((st) => ({
        orders: st.orders.map((o) =>
          o.id === orderId ? { ...o, status: 'CANCELED' as const } : o
        ),
      })),
  }))
);

/* ═══════════════════════════════════════════════════════════
   MARKET STORE — per-asset live data
═══════════════════════════════════════════════════════════ */
interface AssetMarket {
  book: OrderBookSnapshot | null;
  trades: TradeTick[];
  candles1m: Candle[];
  candles5s: Candle[];
  lastPrice: number | null;
  lastTradeAt: number | null;
}

interface MarketState {
  assets: Asset[];
  markets: Record<string, AssetMarket>;
  auctions: DutchAuction[];
  setAssets: (a: Asset[]) => void;
  setBook: (assetId: string, book: OrderBookSnapshot) => void;
  addTrade: (t: TradeTick) => void;
  upsertCandle: (assetId: string, interval: '1m' | '5s', c: Candle) => void;
  setCandles: (assetId: string, interval: '1m' | '5s', cs: Candle[]) => void;
  setAuctions: (a: DutchAuction[]) => void;
  updateAuctionPrice: (id: string, price: number) => void;
  acceptAuction: (id: string, buyerId: string) => void;
  haltAsset: (assetId: string, halted: boolean) => void;
}

const emptyMarket = (): AssetMarket => ({
  book: null, trades: [], candles1m: [], candles5s: [],
  lastPrice: null, lastTradeAt: null,
});

const MAX_TRADES = 100;

export const useMarketStore = create<MarketState>()(
  subscribeWithSelector((set) => ({
    assets: [],
    markets: {},
    auctions: [],

    setAssets: (assets) =>
      set((st) => {
        const markets: Record<string, AssetMarket> = { ...st.markets };
        for (const a of assets) {
          if (!markets[a.id]) markets[a.id] = emptyMarket();
        }
        return { assets, markets };
      }),

    setBook: (assetId, book) =>
      set((st) => {
        const cur = st.markets[assetId] ?? emptyMarket();
        if (cur.book && cur.book.as_of_seq >= book.as_of_seq) return {}; // ignore older
        return { markets: { ...st.markets, [assetId]: { ...cur, book } } };
      }),

    addTrade: (t) =>
      set((st) => {
        const cur = st.markets[t.asset_id] ?? emptyMarket();
        if (cur.trades.some((x) => x.id === t.id)) return {};
        const trades = [t, ...cur.trades].slice(0, MAX_TRADES);
        const assets = st.assets.map((a) =>
          a.id === t.asset_id ? { ...a, last_price: t.price } : a
        );
        return {
          assets,
          markets: {
            ...st.markets,
            [t.asset_id]: { ...cur, trades, lastPrice: t.price, lastTradeAt: t.timestamp },
          },
        };
      }),

    upsertCandle: (assetId, interval, c) =>
      set((st) => {
        const cur = st.markets[assetId] ?? emptyMarket();
        const key = interval === '1m' ? 'candles1m' : 'candles5s';
        const existing = cur[key];
        const idx = existing.findIndex((x) => x.time === c.time);
        const next = idx >= 0
          ? existing.map((x, i) => (i === idx ? c : x))
          : [...existing, c].sort((a, b) => a.time - b.time);
        return { markets: { ...st.markets, [assetId]: { ...cur, [key]: next } } };
      }),

    setCandles: (assetId, interval, cs) =>
      set((st) => {
        const cur = st.markets[assetId] ?? emptyMarket();
        const key = interval === '1m' ? 'candles1m' : 'candles5s';
        return { markets: { ...st.markets, [assetId]: { ...cur, [key]: cs } } };
      }),

    setAuctions: (auctions) => set({ auctions }),

    updateAuctionPrice: (id, price) =>
      set((st) => ({
        auctions: st.auctions.map((a) => (a.id === id ? { ...a, current_price: price } : a)),
      })),

    acceptAuction: (id, buyerId) =>
      set((st) => ({
        auctions: st.auctions.map((a) =>
          a.id === id ? { ...a, status: 'ACCEPTED' as const, buyer_id: buyerId } : a
        ),
      })),

    haltAsset: (assetId, halted) =>
      set((st) => ({
        assets: st.assets.map((a) => (a.id === assetId ? { ...a, is_halted: halted } : a)),
      })),
  }))
);

// Alias for auctions compatibility
export const useAuctionsStore = useMarketStore;

/* ═══════════════════════════════════════════════════════════
   DEMO / OPERATOR STORE
═══════════════════════════════════════════════════════════ */
interface DemoState {
  simRunning: boolean;
  activeScenario: string | null;
  reconRules: ReconRule[];
  lastReconRun: number;
  engineLagMs: number;
  pendingSettlements: number;
  setSimRunning: (running: boolean) => void;
  triggerScenario: (name: string) => void;
  runReconciliation: () => void;
  resetDemo: () => void;
}

export const useDemoStore = create<DemoState>()((set) => ({
  simRunning: true,
  activeScenario: null,
  reconRules: MOCK_RECON_RULES,
  lastReconRun: Date.now(),
  engineLagMs: 4,
  pendingSettlements: 0,

  setSimRunning: (running) => set({ simRunning: running }),

  triggerScenario: (name) => {
    set({ activeScenario: name });
    setTimeout(() => set({ activeScenario: null }), 3000);
  },

  runReconciliation: () => {
    set({
      lastReconRun: Date.now(),
      reconRules: MOCK_RECON_RULES.map((r) => ({
        ...r,
        status: 'PASSED' as const,
        last_checked: Date.now(),
        drift_value: 0,
      })),
    });
  },

  resetDemo: () => {
    set({
      simRunning: true,
      activeScenario: null,
      lastReconRun: Date.now(),
      reconRules: MOCK_RECON_RULES,
    });
  },
}));

/* ═══════════════════════════════════════════════════════════
   TOAST STORE
═══════════════════════════════════════════════════════════ */
export type ToastVariant = 'success' | 'error' | 'warn' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  autoDismissMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

let toastSeq = 0;
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${++toastSeq}`;
    set((st) => ({ toasts: [...st.toasts, { ...t, id }] }));
    const ms = t.autoDismissMs ?? 4000;
    setTimeout(() => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })), ms);
  },
  dismiss: (id) => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })),
}));

/* ═══════════════════════════════════════════════════════════
   SIDEBAR / WORKPLACE LAYOUT STORE
═══════════════════════════════════════════════════════════ */
interface SidebarState {
  isCollapsed: boolean;
  mobileOpen: boolean;
  categoryFilter: 'PASSES' | 'MERCH';
  toggleCollapse: () => void;
  setCollapsed: (c: boolean) => void;
  toggleMobile: () => void;
  setMobileOpen: (m: boolean) => void;
  setCategoryFilter: (cat: 'PASSES' | 'MERCH') => void;
}

export const useSidebarStore = create<SidebarState>()(
  subscribeWithSelector((set) => ({
    isCollapsed: false,
    mobileOpen: false,
    categoryFilter: 'PASSES',
    toggleCollapse: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
    setCollapsed: (c) => set({ isCollapsed: c }),
    toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
    setMobileOpen: (m) => set({ mobileOpen: m }),
    setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  }))
);
