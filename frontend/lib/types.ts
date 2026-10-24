export type AssetCategory = 'PASS' | 'MERCH';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  face_value: number; // minor units (cents)
  ceiling_price: number; // 1.2x face value
  last_price: number;
  change_24h: number; // percentage, e.g. 4.2
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  best_bid: number;
  best_ask: number;
  total_asks: number;
  holding_cap: number;
  is_halted: boolean;
  has_sim: boolean;
  active_auction_id?: string;
}

export interface OrderBookLevel {
  price: number; // cents
  quantity: number;
  total: number; // cumulative
  order_count: number;
}

export interface OrderBookSnapshot {
  asset_id: string;
  as_of_seq: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spread_percent: number;
}

export interface TradeTick {
  id: string;
  asset_id: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  is_sim: boolean;
  buyer_id?: string;
  seller_id?: string;
}

export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_simulated?: boolean;
}

export type OrderStatus =
  | 'PENDING_SUBMIT'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELING'
  | 'CANCELED'
  | 'REJECTED';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';

export interface UserOrder {
  id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  side: OrderSide;
  type: OrderType;
  price: number; // cents (0 for market)
  quantity: number;
  filled_quantity: number;
  status: OrderStatus;
  created_at: number;
  updated_at: number;
  reserved_amount: number; // funds or units reserved
}

export interface UserHolding {
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  available_units: number;
  reserved_units: number;
}

export interface UserWallet {
  available_balance: number; // cents
  reserved_balance: number; // cents
  total_balance: number;
}

export interface LedgerStub {
  id: string;
  trade_id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name?: string;
  side: OrderSide;
  price: number;
  quantity: number;
  total_value: number;
  settled_at: number;
  tx_hash: string;
  status: 'SETTLED' | 'PENDING' | 'FAILED';
}

export interface DutchAuction {
  id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  start_price: number; // cents
  floor_price: number; // cents
  current_price: number; // cents
  quantity: number;
  start_time: number;
  end_time: number;
  status: 'ACTIVE' | 'ACCEPTED' | 'EXPIRED';
  buyer_id?: string;
}

export interface ReconRule {
  id: string; // R1-R8
  name: string;
  description: string;
  invariant: string;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  last_checked: number;
  drift_value: number;
}
