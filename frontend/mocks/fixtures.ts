import {
  Asset,
  OrderBookSnapshot,
  TradeTick,
  Candle,
  UserOrder,
  UserHolding,
  UserWallet,
  LedgerStub,
  DutchAuction,
  ReconRule,
} from '@/lib/types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'dfest-wkd',
    symbol: 'DFEST-WKD',
    name: 'Darkhold Fest Weekend Pass',
    category: 'PASS',
    face_value: 12000, // $120.00
    ceiling_price: 14400, // $144.00 (1.2x)
    last_price: 13850, // $138.50
    change_24h: 4.2,
    high_24h: 14400,
    low_24h: 12100,
    volume_24h: 1420,
    best_bid: 13800,
    best_ask: 13900,
    total_asks: 48,
    holding_cap: 4,
    is_halted: false,
    has_sim: true,
  },
  {
    id: 'moon-ga',
    symbol: 'MOON-GA',
    name: 'Moonrise GA Pass',
    category: 'PASS',
    face_value: 8000, // $80.00
    ceiling_price: 9600, // $96.00 (1.2x)
    last_price: 8800, // $88.00
    change_24h: -1.5,
    high_24h: 9200,
    low_24h: 8000,
    volume_24h: 890,
    best_bid: 8750,
    best_ask: 8850,
    total_asks: 26,
    holding_cap: 6,
    is_halted: false,
    has_sim: true,
  },
  {
    id: 'df-hoodie',
    symbol: 'DF-HOODIE',
    name: 'Darkhold Hoodie Limited',
    category: 'MERCH',
    face_value: 6500, // $65.00
    ceiling_price: 7800, // $78.00 (1.2x)
    last_price: 7600, // $76.00
    change_24h: 8.5,
    high_24h: 7800,
    low_24h: 6500,
    volume_24h: 310,
    best_bid: 7550,
    best_ask: 7650,
    total_asks: 12,
    holding_cap: 2,
    is_halted: false,
    has_sim: false,
  },
  {
    id: 'sigil-pin',
    symbol: 'SIGIL-PIN',
    name: 'Sigil Collector Pin',
    category: 'MERCH',
    face_value: 2500, // $25.00
    ceiling_price: 3000, // $30.00 (1.2x)
    last_price: 2750, // $27.50
    change_24h: 2.1,
    high_24h: 2950,
    low_24h: 2400,
    volume_24h: 640,
    best_bid: 2700,
    best_ask: 2800,
    total_asks: 35,
    holding_cap: 10,
    is_halted: false,
    has_sim: true,
    active_auction_id: 'auc-sigil-01',
  },
];

export const MOCK_ORDER_BOOKS: Record<string, OrderBookSnapshot> = {
  'dfest-wkd': {
    asset_id: 'dfest-wkd',
    as_of_seq: 104829,
    spread: 100, // $1.00
    spread_percent: 0.72,
    asks: [
      { price: 14400, quantity: 18, total: 48, order_count: 5 }, // ceiling level
      { price: 14300, quantity: 8, total: 30, order_count: 3 },
      { price: 14200, quantity: 6, total: 22, order_count: 2 },
      { price: 14050, quantity: 10, total: 16, order_count: 4 },
      { price: 13900, quantity: 6, total: 6, order_count: 2 },
    ],
    bids: [
      { price: 13800, quantity: 12, total: 12, order_count: 3 },
      { price: 13750, quantity: 8, total: 20, order_count: 2 },
      { price: 13600, quantity: 15, total: 35, order_count: 4 },
      { price: 13400, quantity: 20, total: 55, order_count: 6 },
      { price: 13100, quantity: 25, total: 80, order_count: 7 },
    ],
  },
  'moon-ga': {
    asset_id: 'moon-ga',
    as_of_seq: 82941,
    spread: 100,
    spread_percent: 1.13,
    asks: [
      { price: 9600, quantity: 10, total: 26, order_count: 3 },
      { price: 9300, quantity: 6, total: 16, order_count: 2 },
      { price: 9000, quantity: 5, total: 10, order_count: 2 },
      { price: 8850, quantity: 5, total: 5, order_count: 1 },
    ],
    bids: [
      { price: 8750, quantity: 8, total: 8, order_count: 2 },
      { price: 8600, quantity: 12, total: 20, order_count: 3 },
      { price: 8400, quantity: 14, total: 34, order_count: 4 },
    ],
  },
  'df-hoodie': {
    asset_id: 'df-hoodie',
    as_of_seq: 41203,
    spread: 100,
    spread_percent: 1.31,
    asks: [
      { price: 7800, quantity: 5, total: 12, order_count: 2 },
      { price: 7700, quantity: 4, total: 7, order_count: 2 },
      { price: 7650, quantity: 3, total: 3, order_count: 1 },
    ],
    bids: [
      { price: 7550, quantity: 4, total: 4, order_count: 1 },
      { price: 7400, quantity: 6, total: 10, order_count: 2 },
      { price: 7200, quantity: 8, total: 18, order_count: 3 },
    ],
  },
  'sigil-pin': {
    asset_id: 'sigil-pin',
    as_of_seq: 19842,
    spread: 100,
    spread_percent: 3.63,
    asks: [
      { price: 3000, quantity: 15, total: 35, order_count: 4 },
      { price: 2900, quantity: 10, total: 20, order_count: 3 },
      { price: 2800, quantity: 10, total: 10, order_count: 2 },
    ],
    bids: [
      { price: 2700, quantity: 12, total: 12, order_count: 3 },
      { price: 2600, quantity: 18, total: 30, order_count: 4 },
      { price: 2500, quantity: 20, total: 50, order_count: 5 },
    ],
  },
};

export function generateInitialCandles(assetId: string): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const basePrice = assetId === 'dfest-wkd' ? 12500 : assetId === 'moon-ga' ? 8200 : assetId === 'df-hoodie' ? 6800 : 2550;
  
  // 60 candles (each 1 minute), first 45 simulated rehearsal, last 15 live
  for (let i = 60; i >= 0; i--) {
    const time = now - i * 60;
    const isSimulated = i > 15;
    const variation = Math.sin(i * 0.3) * 350 + (60 - i) * 20;
    const open = Math.round((basePrice + variation) / 100);
    const high = open + Math.floor(Math.random() * 3) + 1;
    const low = open - Math.floor(Math.random() * 3) - 1;
    const close = Math.random() > 0.45 ? open + 1 : open - 1;
    const volume = Math.floor(Math.random() * 40) + 10;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      is_simulated: isSimulated,
    });
  }
  return candles;
}

export const MOCK_TRADES: Record<string, TradeTick[]> = {
  'dfest-wkd': [
    {
      id: 'tr-98124',
      asset_id: 'dfest-wkd',
      price: 13850,
      quantity: 2,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 12,
      is_sim: true,
    },
    {
      id: 'tr-98123',
      asset_id: 'dfest-wkd',
      price: 13800,
      quantity: 1,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 35,
      is_sim: false,
    },
    {
      id: 'tr-98122',
      asset_id: 'dfest-wkd',
      price: 13850,
      quantity: 4,
      side: 'SELL',
      timestamp: Date.now() - 1000 * 68,
      is_sim: true,
    },
    {
      id: 'tr-98121',
      asset_id: 'dfest-wkd',
      price: 13750,
      quantity: 1,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 110,
      is_sim: true,
    },
    {
      id: 'tr-98120',
      asset_id: 'dfest-wkd',
      price: 13700,
      quantity: 3,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 150,
      is_sim: false,
    },
  ],
  'moon-ga': [
    {
      id: 'tr-72911',
      asset_id: 'moon-ga',
      price: 8800,
      quantity: 2,
      side: 'SELL',
      timestamp: Date.now() - 1000 * 45,
      is_sim: true,
    },
  ],
  'df-hoodie': [
    {
      id: 'tr-51829',
      asset_id: 'df-hoodie',
      price: 7600,
      quantity: 1,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 80,
      is_sim: false,
    },
  ],
  'sigil-pin': [
    {
      id: 'tr-30192',
      asset_id: 'sigil-pin',
      price: 2750,
      quantity: 5,
      side: 'BUY',
      timestamp: Date.now() - 1000 * 95,
      is_sim: true,
    },
  ],
};

export const MOCK_USER_WALLET: UserWallet = {
  available_balance: 150000, // $1,500.00
  reserved_balance: 27800, // $278.00 (locked in open buy order)
  total_balance: 177800, // $1,778.00
};

export const MOCK_USER_HOLDINGS: UserHolding[] = [
  {
    asset_id: 'dfest-wkd',
    asset_symbol: 'DFEST-WKD',
    asset_name: 'Darkhold Fest Weekend Pass',
    available_units: 1,
    reserved_units: 0,
  },
  {
    asset_id: 'sigil-pin',
    asset_symbol: 'SIGIL-PIN',
    asset_name: 'Sigil Collector Pin',
    available_units: 2,
    reserved_units: 0,
  },
];

export const MOCK_USER_ORDERS: UserOrder[] = [
  {
    id: 'ord-84920',
    asset_id: 'dfest-wkd',
    asset_symbol: 'DFEST-WKD',
    asset_name: 'Darkhold Fest Weekend Pass',
    side: 'BUY',
    type: 'LIMIT',
    price: 13900,
    quantity: 2,
    filled_quantity: 0,
    status: 'OPEN',
    created_at: Date.now() - 1000 * 120,
    updated_at: Date.now() - 1000 * 120,
    reserved_amount: 27800,
  },
  {
    id: 'ord-81042',
    asset_id: 'moon-ga',
    asset_symbol: 'MOON-GA',
    asset_name: 'Moonrise GA Pass',
    side: 'SELL',
    type: 'LIMIT',
    price: 9000,
    quantity: 1,
    filled_quantity: 1,
    status: 'FILLED',
    created_at: Date.now() - 1000 * 3600 * 2,
    updated_at: Date.now() - 1000 * 3600 * 2 + 5000,
    reserved_amount: 0,
  },
  {
    id: 'ord-79210',
    asset_id: 'dfest-wkd',
    asset_symbol: 'DFEST-WKD',
    asset_name: 'Darkhold Fest Weekend Pass',
    side: 'BUY',
    type: 'LIMIT',
    price: 13500,
    quantity: 1,
    filled_quantity: 0,
    status: 'CANCELED',
    created_at: Date.now() - 1000 * 3600 * 5,
    updated_at: Date.now() - 1000 * 3600 * 4,
    reserved_amount: 0,
  },
];

export const MOCK_LEDGER_STUBS: LedgerStub[] = [
  {
    id: 'stub-00918',
    trade_id: 'tr-98123',
    asset_id: 'dfest-wkd',
    asset_symbol: 'DFEST-WKD',
    asset_name: 'Darkhold Fest Weekend Pass',
    side: 'BUY',
    price: 13800,
    quantity: 1,
    total_value: 13800,
    settled_at: Date.now() - 1000 * 35,
    tx_hash: '0x8f9a4c12d83b5e71a0e9c4',
    status: 'SETTLED',
  },
  {
    id: 'stub-00845',
    trade_id: 'tr-72911',
    asset_id: 'moon-ga',
    asset_symbol: 'MOON-GA',
    asset_name: 'Moonrise GA Pass',
    side: 'SELL',
    price: 8800,
    quantity: 1,
    total_value: 8800,
    settled_at: Date.now() - 1000 * 3600 * 2,
    tx_hash: '0x3b1c8f44a9e2d751b8c0a3',
    status: 'SETTLED',
  },
];

export const MOCK_AUCTIONS: DutchAuction[] = [
  {
    id: 'auc-sigil-01',
    asset_id: 'sigil-pin',
    asset_symbol: 'SIGIL-PIN',
    asset_name: 'Sigil Collector Pin (Batch #4)',
    start_price: 3000, // $30.00
    floor_price: 2200, // $22.00
    current_price: 2650, // $26.50
    quantity: 1,
    start_time: Date.now() - 1000 * 60 * 15,
    end_time: Date.now() + 1000 * 60 * 15,
    status: 'ACTIVE',
  },
  {
    id: 'auc-dfest-02',
    asset_id: 'dfest-wkd',
    asset_symbol: 'DFEST-WKD',
    asset_name: 'Darkhold Fest Pass VIP Drop',
    start_price: 14400,
    floor_price: 11000,
    current_price: 11000,
    quantity: 1,
    start_time: Date.now() - 1000 * 3600 * 3,
    end_time: Date.now() - 1000 * 3600 * 2,
    status: 'EXPIRED',
  },
  {
    id: 'auc-hoodie-03',
    asset_id: 'df-hoodie',
    asset_symbol: 'DF-HOODIE',
    asset_name: 'Limited Artist Embroidered Hoodie',
    start_price: 7800,
    floor_price: 6000,
    current_price: 6900,
    quantity: 1,
    start_time: Date.now() - 1000 * 3600 * 6,
    end_time: Date.now() - 1000 * 3600 * 5,
    status: 'ACCEPTED',
    buyer_id: 'usr-sim-98',
  },
];

export const MOCK_RECON_RULES: ReconRule[] = [
  {
    id: 'R1',
    name: 'Zero-Sum Ledger Transactions',
    description: 'Every ledger transaction sums to zero per commodity',
    invariant: 'SUM(debits) - SUM(credits) == 0',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R2',
    name: 'Mirror Balance Parity',
    description: 'Wallet and holding mirrors equal ledger account sums',
    invariant: 'wallet.balance == ledger.account_sum',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R3',
    name: 'Escrow Conservation',
    description: 'Reserved totals equal sum of active reservations',
    invariant: 'reserved_total == SUM(active_reservations)',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R4',
    name: 'Supply Conservation',
    description: 'Total units per asset equal issued supply. Credits equal faucet issued',
    invariant: 'SUM(units) == issued_supply',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R5',
    name: 'Settlement SLA Invariant',
    description: 'No PENDING_SETTLEMENT older than the SLA (30s)',
    invariant: 'COUNT(stuck_pending) == 0',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R6',
    name: 'Engine Book Divergence',
    description: 'Engine open orders match database OPEN and PARTIALLY_FILLED orders',
    invariant: 'engine.open == db.open',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R7',
    name: 'Price Ceiling Enforcer',
    description: 'Every executed trade price at most the ceiling in force at its time',
    invariant: 'trade.price <= asset.ceiling_price',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
  {
    id: 'R8',
    name: 'Non-Negative Balances',
    description: 'No negative balances or quantities anywhere in database',
    invariant: 'MIN(balance) >= 0 && MIN(units) >= 0',
    status: 'PASSED',
    last_checked: Date.now() - 1000 * 45,
    drift_value: 0,
  },
];

export const ERROR_MESSAGES: Record<string, string> = {
  PRICE_EXCEEDS_CEILING: 'Resale price cannot exceed {ceiling}. Maximum resale price is {multiplier}x face value ({face_value}).',
  INSUFFICIENT_FUNDS: 'Insufficient available funds. Required: {required}, available: {available}.',
  INSUFFICIENT_HOLDINGS: 'You do not hold enough units to place this sell order.',
  HOLDING_CAP_EXCEEDED: 'Order would exceed your holding cap of {cap} units for this asset.',
  ORDER_RESTRICTED_AUCTION: 'This unit is currently locked in an active auction.',
  ASSET_HALTED: 'Trading in this asset has been halted by the risk system.',
  MARKET_ORDER_NO_LIQUIDITY: 'Cannot execute market order: no resting orders on the opposite side of the book.',
  RATE_LIMITED: 'Too many requests. Please wait {seconds}s before retrying.',
  AUCTION_ALREADY_SOLD: 'This auction has already been accepted by another buyer.',
  AUCTION_EXPIRED: 'This auction reached its floor price without a buyer and has ended.',
  SETTLEMENT_FAILED: 'Trade settlement encountered an unrecoverable error. An operator has been alerted.',
};
