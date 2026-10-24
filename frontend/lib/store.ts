import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Asset, OrderBookSnapshot, TradeTick, Candle,
  UserOrder, UserHolding, UserWallet, DutchAuction, ReconRule,
  LedgerEntry, LedgerEntryType, OrderSide, OrderType,
} from './types';
import { MOCK_RECON_RULES, MOCK_LEDGER_STUBS } from '@/mocks/fixtures';

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
   USER / AUTH STORE & DYNAMIC DOUBLE-ENTRY LEDGER
═══════════════════════════════════════════════════════════ */
export interface UserProfile {
  id: string;
  email: string;
  role: 'USER' | 'OPERATOR' | 'ISSUER';
}

function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 24; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function getInitialAuth(): { user: UserProfile | null; token: string | null } {
  if (typeof window !== 'undefined') {
    try {
      const storedUser = sessionStorage.getItem('darkhold_user');
      const storedToken = sessionStorage.getItem('darkhold_token');
      if (storedUser && storedToken) {
        return { user: JSON.parse(storedUser), token: storedToken };
      }
    } catch {
      // fallback
    }
  }
  return {
    user: { id: 'usr-demo-01', email: 'demo@darkhold.io', role: 'OPERATOR' },
    token: 'mock-token',
  };
}

export const INITIAL_LEDGER_ENTRIES: LedgerEntry[] = MOCK_LEDGER_STUBS.map((stub, idx) => ({
  id: stub.id,
  timestamp: stub.settled_at || (Date.now() - (idx + 1) * 3600 * 1000),
  type: (stub.side === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL') as LedgerEntryType,
  asset_id: stub.asset_id,
  asset_symbol: stub.asset_symbol,
  asset_name: stub.asset_name,
  side: stub.side,
  price: stub.price,
  units: stub.quantity || 1,
  quantity: stub.quantity || 1,
  amount_cents: stub.total_value || ((stub.price || 0) * (stub.quantity || 1)),
  total_value: stub.total_value || ((stub.price || 0) * (stub.quantity || 1)),
  balance_after: 150000,
  tx_hash: stub.tx_hash,
  status: stub.status,
  note: `Filled ${stub.side} ${stub.quantity || 1}x ${stub.asset_symbol} @ $${(((stub.price || 0)) / 100).toFixed(2)}`,
  settled_at: stub.settled_at || Date.now(),
  trade_id: stub.trade_id,
  is_sim: false,
}));

export interface UserState {
  user: UserProfile | null;
  token: string | null;
  wallet: UserWallet | null;
  holdings: UserHolding[];
  orders: UserOrder[];
  ledger: LedgerEntry[];
  isSeeded: boolean;

  setUser: (u: UserProfile, token: string) => void;
  logout: () => void;
  setWallet: (w: UserWallet) => void;
  setHoldings: (h: UserHolding[]) => void;
  setOrders: (o: UserOrder[]) => void;
  setLedger: (l: LedgerEntry[]) => void;
  upsertOrder: (o: UserOrder) => void;
  cancelOrder: (orderId: string) => { success: boolean; error?: string };

  // Rule R1 & R2 Atomic Mutations
  addLedgerEntry: (
    entry: Omit<LedgerEntry, 'id' | 'timestamp' | 'tx_hash'> &
      Partial<Pick<LedgerEntry, 'id' | 'timestamp' | 'tx_hash'>>
  ) => LedgerEntry;
  deposit: (amountCents: number, note?: string) => void;
  withdraw: (amountCents: number, note?: string) => { success: boolean; error?: string };
  executeTradeMatch: (params: {
    asset: Asset;
    side: OrderSide;
    type: OrderType;
    priceCents: number;
    quantity: number;
    orderId?: string;
    isSim?: boolean;
  }) => { success: boolean; error?: string; entry?: LedgerEntry };
  settleAuctionPurchase: (
    auction: DutchAuction,
    purchasePriceCents: number
  ) => { success: boolean; error?: string; entry?: LedgerEntry };
}

const initialAuth = getInitialAuth();

export const useUserStore = create<UserState>()(
  subscribeWithSelector((set, get) => ({
    user: initialAuth.user,
    token: initialAuth.token,
    wallet: {
      available_balance: 150000,
      reserved_balance: 27800,
      total_balance: 177800,
    },
    holdings: [],
    orders: [],
    ledger: INITIAL_LEDGER_ENTRIES,
    isSeeded: false,

    setUser: (u, token) => {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('darkhold_user', JSON.stringify(u));
          sessionStorage.setItem('darkhold_token', token);
        } catch {
          // ignore storage errors
        }
      }
      set({ user: u, token });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('darkhold_user');
          sessionStorage.removeItem('darkhold_token');
        } catch {
          // ignore storage errors
        }
      }
      set({ user: null, token: null, wallet: null, holdings: [], orders: [], ledger: [] });
    },

    setWallet: (w) => set({ wallet: w }),
    setHoldings: (h) => set({ holdings: h }),
    setOrders: (o) => set({ orders: o }),
    setLedger: (l) => set({ ledger: l }),

    upsertOrder: (incoming) =>
      set((st) => {
        const ORDER_RANK: Record<string, number> = {
          PENDING_SUBMIT: 0,
          OPEN: 1,
          PARTIALLY_FILLED: 2,
          FILLED: 3,
          CANCELING: 4,
          CANCELED: 5,
          REJECTED: 6,
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

    cancelOrder: (orderId) => {
      let result: { success: boolean; error?: string } = { success: false, error: 'Order not found' };
      set((st) => {
        const order = st.orders.find((o) => o.id === orderId);
        if (!order) return {};
        if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
          result = { success: false, error: 'Order cannot be canceled in its current status.' };
          return {};
        }

        const remainingQty = Math.max(0, order.quantity - (order.filled_quantity || 0));
        let nextWallet = st.wallet;
        let nextHoldings = st.holdings;
        let refundCents = 0;

        if (order.side === 'BUY') {
          if (order.price > 0) {
            refundCents = order.price * remainingQty;
          } else if (order.reserved_amount && order.quantity > 0) {
            refundCents = Math.round((order.reserved_amount / order.quantity) * remainingQty);
          } else {
            refundCents = order.reserved_amount || 0;
          }

          if (st.wallet) {
            const curAvail = st.wallet.available_balance;
            const curRes = st.wallet.reserved_balance;
            const actualRefund = Math.min(refundCents, curRes);
            const newRes = curRes - actualRefund;
            const newAvail = curAvail + actualRefund;
            nextWallet = {
              ...st.wallet,
              available_balance: newAvail,
              reserved_balance: newRes,
              total_balance: newAvail + newRes,
            };
            refundCents = actualRefund;
          }
        } else {
          // SELL order: restore reserved units back to available units
          const remainingUnits = remainingQty;
          const existing = st.holdings.find((h) => h.asset_id === order.asset_id);
          if (existing) {
            nextHoldings = st.holdings.map((h) =>
              h.asset_id === order.asset_id
                ? {
                    ...h,
                    available_units: h.available_units + remainingUnits,
                    reserved_units: Math.max(0, (h.reserved_units || 0) - remainingUnits),
                  }
                : h
            );
          } else {
            nextHoldings = [
              ...st.holdings,
              {
                asset_id: order.asset_id,
                asset_symbol: order.asset_symbol,
                asset_name: order.asset_name,
                available_units: remainingUnits,
                reserved_units: 0,
              },
            ];
          }
        }

        const nextOrders = st.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'CANCELED' as const,
                reserved_amount: 0,
                updated_at: Date.now(),
              }
            : o
        );

        const releaseEntry: LedgerEntry = {
          id: `ledg-rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          type: 'ESCROW_RELEASE',
          asset_id: order.asset_id,
          asset_symbol: order.asset_symbol,
          asset_name: order.asset_name,
          side: order.side,
          price: order.price,
          units: remainingQty,
          quantity: remainingQty,
          amount_cents: refundCents,
          total_value: refundCents,
          balance_after: nextWallet?.available_balance ?? 0,
          tx_hash: generateTxHash(),
          status: 'SETTLED',
          note:
            order.side === 'BUY'
              ? `Escrow release: $${(refundCents / 100).toFixed(2)} refunded for canceled order #${order.id}`
              : `Escrow release: ${remainingQty} unit(s) unlocked for canceled order #${order.id}`,
          is_sim: false,
          settled_at: Date.now(),
          trade_id: `escrow-rel-${order.id}`,
        };

        result = { success: true };
        return {
          orders: nextOrders,
          wallet: nextWallet,
          holdings: nextHoldings,
          ledger: [releaseEntry, ...st.ledger],
        };
      });
      return result;
    },

    addLedgerEntry: (entryInput) => {
      const id = entryInput.id || `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = entryInput.timestamp || Date.now();
      const tx_hash = entryInput.tx_hash || generateTxHash();
      const units = entryInput.units ?? entryInput.quantity ?? 1;
      const amount_cents = entryInput.amount_cents ?? entryInput.total_value ?? 0;
      const entry: LedgerEntry = {
        ...entryInput,
        id,
        timestamp,
        tx_hash,
        units,
        quantity: units,
        amount_cents,
        total_value: amount_cents,
        settled_at: timestamp,
      };
      set((st) => ({ ledger: [entry, ...st.ledger] }));
      return entry;
    },

    deposit: (amountCents, note) => {
      set((st) => {
        if (!st.wallet) return {};
        const newAvail = st.wallet.available_balance + amountCents;
        const newTotal = st.wallet.total_balance + amountCents;
        const tx_hash = generateTxHash();
        const entry: LedgerEntry = {
          id: `ledg-dep-${Date.now()}`,
          timestamp: Date.now(),
          type: 'DEPOSIT',
          amount_cents: amountCents,
          total_value: amountCents,
          units: 0,
          quantity: 0,
          balance_after: newAvail,
          tx_hash,
          status: 'SETTLED',
          note: note || `Credited $${(amountCents / 100).toFixed(2)} simulated USD funds`,
          is_sim: false,
          settled_at: Date.now(),
        };
        return {
          wallet: {
            ...st.wallet,
            available_balance: newAvail,
            total_balance: newTotal,
          },
          ledger: [entry, ...st.ledger],
        };
      });
    },

    withdraw: (amountCents, note) => {
      const st = get();
      if (!st.wallet || st.wallet.available_balance < amountCents) {
        return { success: false, error: 'Insufficient available credits.' };
      }
      const newAvail = st.wallet.available_balance - amountCents;
      const newTotal = st.wallet.total_balance - amountCents;
      const tx_hash = generateTxHash();
      const entry: LedgerEntry = {
        id: `ledg-wth-${Date.now()}`,
        timestamp: Date.now(),
        type: 'WITHDRAWAL',
        amount_cents: amountCents,
        total_value: amountCents,
        units: 0,
        quantity: 0,
        balance_after: newAvail,
        tx_hash,
        status: 'SETTLED',
        note: note || `Debited $${(amountCents / 100).toFixed(2)} simulated USD funds`,
        is_sim: false,
        settled_at: Date.now(),
      };
      set({
        wallet: {
          ...st.wallet,
          available_balance: newAvail,
          total_balance: newTotal,
        },
        ledger: [entry, ...st.ledger],
      });
      return { success: true };
    },

    executeTradeMatch: ({ asset, side, type, priceCents, quantity, orderId, isSim = false }) => {
      const st = get();
      const totalCost = priceCents * quantity;

      if (side === 'BUY') {
        if (!st.wallet || st.wallet.available_balance < totalCost) {
          return { success: false, error: 'Insufficient funds' };
        }
      } else {
        const holding = st.holdings.find((h) => h.asset_id === asset.id);
        if (!holding || holding.available_units < quantity) {
          return { success: false, error: 'Insufficient holdings' };
        }
      }

      const tx_hash = generateTxHash();
      const balanceAfter =
        side === 'BUY'
          ? st.wallet!.available_balance - totalCost
          : st.wallet!.available_balance + totalCost;

      const entry: LedgerEntry = {
        id: `ledg-tr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type: side === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
        asset_id: asset.id,
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        side,
        price: priceCents,
        units: quantity,
        quantity,
        amount_cents: totalCost,
        total_value: totalCost,
        balance_after: balanceAfter,
        tx_hash,
        status: 'SETTLED',
        note: `Filled ${type} ${side} ${quantity}x ${asset.symbol} @ $${(priceCents / 100).toFixed(2)}`,
        is_sim: isSim,
        settled_at: Date.now(),
        trade_id: orderId || `tr-${Date.now()}`,
      };

      // Atomically update holdings
      let nextHoldings = [...st.holdings];
      const holdingIdx = nextHoldings.findIndex((h) => h.asset_id === asset.id);

      if (side === 'BUY') {
        if (holdingIdx >= 0) {
          nextHoldings[holdingIdx] = {
            ...nextHoldings[holdingIdx],
            available_units: nextHoldings[holdingIdx].available_units + quantity,
          };
        } else {
          nextHoldings.push({
            asset_id: asset.id,
            asset_symbol: asset.symbol,
            asset_name: asset.name,
            available_units: quantity,
            reserved_units: 0,
          });
        }
      } else {
        if (holdingIdx >= 0) {
          nextHoldings[holdingIdx] = {
            ...nextHoldings[holdingIdx],
            available_units: Math.max(0, nextHoldings[holdingIdx].available_units - quantity),
          };
        }
      }

      // Atomically update wallet
      const nextWallet: UserWallet = {
        ...st.wallet!,
        available_balance: balanceAfter,
        total_balance: st.wallet!.total_balance + (side === 'BUY' ? -totalCost : totalCost),
      };

      set({
        wallet: nextWallet,
        holdings: nextHoldings,
        ledger: [entry, ...st.ledger],
      });

      return { success: true, entry };
    },

    settleAuctionPurchase: (auction, purchasePriceCents) => {
      const st = get();
      const quantity = auction.quantity || 1;
      const totalCost = purchasePriceCents * quantity;

      if (!st.wallet || st.wallet.available_balance < totalCost) {
        return { success: false, error: 'Insufficient available credits to clear drop.' };
      }

      const tx_hash = generateTxHash();
      const balanceAfter = st.wallet.available_balance - totalCost;

      const entry: LedgerEntry = {
        id: `ledg-auc-${Date.now()}-${auction.id}`,
        timestamp: Date.now(),
        type: 'AUCTION_BUY',
        asset_id: auction.asset_id,
        asset_symbol: auction.asset_symbol,
        asset_name: auction.asset_name,
        side: 'BUY',
        price: purchasePriceCents,
        units: quantity,
        quantity,
        amount_cents: totalCost,
        total_value: totalCost,
        balance_after: balanceAfter,
        tx_hash,
        status: 'SETTLED',
        note: `Instant Dutch Auction Settlement for Drop #${auction.id}`,
        is_sim: false,
        settled_at: Date.now(),
        trade_id: `auc-settle-${auction.id}`,
      };

      // Credit holdings atomically
      let nextHoldings = [...st.holdings];
      const holdingIdx = nextHoldings.findIndex((h) => h.asset_id === auction.asset_id);
      if (holdingIdx >= 0) {
        nextHoldings[holdingIdx] = {
          ...nextHoldings[holdingIdx],
          available_units: nextHoldings[holdingIdx].available_units + quantity,
        };
      } else {
        nextHoldings.push({
          asset_id: auction.asset_id,
          asset_symbol: auction.asset_symbol,
          asset_name: auction.asset_name,
          available_units: quantity,
          reserved_units: 0,
        });
      }

      set({
        wallet: {
          ...st.wallet,
          available_balance: balanceAfter,
          total_balance: st.wallet.total_balance - totalCost,
        },
        holdings: nextHoldings,
        ledger: [entry, ...st.ledger],
      });

      return { success: true, entry };
    },
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
  action?: { label: string; onClick?: () => void; href?: string };
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
