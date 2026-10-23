export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";

export type OrderStatus =
  | "PENDING_SUBMIT"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED";

export type SettlementStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: "FESTIVAL_PASS" | "LIMITED_MERCH" | "VIP_EXPERIENCE";
  face_value: number; // minor units e.g. 25000 = $250.00
  ceiling_pct: number; // e.g. 110 means 110% of face value
  ceiling_price: number; // minor units e.g. 27500 = $275.00
  last_price: number;
  last_price_timestamp: number;
  price_change_24h_pct: number;
  best_bid?: number;
  best_ask?: number;
  available_ask_qty: number;
  volume_24h: number;
  is_halted: boolean;
  is_thin: boolean;
  sim_active: boolean;
  has_active_auction: boolean;
  sparkline_1h: number[]; // array of minor unit prices
}

export interface BookLevel {
  price: number;
  qty: number;
  total_qty: number; // cumulative
  order_count: number;
  has_user_order?: boolean;
}

export interface BookSnapshot {
  asset_id: string;
  as_of_seq: number;
  timestamp: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface TradeTick {
  seq: number;
  trade_id: string;
  asset_id: string;
  price: number;
  qty: number;
  aggressor_side: OrderSide;
  is_sim: boolean;
  timestamp: number;
}

export interface Candle {
  open_time: number;
  close_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: "5s" | "1m";
  origin: "SEEDED_SIM" | "ENGINE";
}

export interface Order {
  order_id: string;
  client_id?: string;
  idempotency_key: string;
  asset_id: string;
  side: OrderSide;
  type: OrderType;
  price: number; // 0 for market
  qty: number;
  matched_qty: number;
  remaining_qty: number;
  status: OrderStatus;
  settlement_status: SettlementStatus;
  created_at: number;
  updated_at: number;
  average_price?: number;
  reject_reason?: string;
}

export interface WalletHolding {
  asset_id: string;
  symbol: string;
  name: string;
  available_units: number;
  reserved_units: number;
  total_units: number;
  avg_cost: number;
  current_price: number;
}

export interface WalletBalance {
  available_credits: number; // minor units e.g. 100000 = $1,000.00
  reserved_credits: number;
  total_credits: number;
  holdings: WalletHolding[];
}

export interface TransactionReceipt {
  trade_id: string;
  ledger_tx_id: string;
  asset_id: string;
  asset_name: string;
  side: OrderSide;
  qty: number;
  price: number;
  total_cost: number;
  counterparty_id: string;
  counterparty_is_sim: boolean;
  matched_at: number;
  settled_at: number;
  balance_before: number;
  balance_after: number;
  settlement_status: SettlementStatus;
}

export interface DutchAuction {
  auction_id: string;
  asset_id: string;
  asset_name: string;
  seller_id: string;
  is_sim_seller: boolean;
  qty: number;
  start_price: number;
  floor_price: number;
  ceiling_price: number;
  current_price: number;
  start_time: number;
  end_time: number;
  step_seconds: number;
  price_decrement: number;
  next_step_in_seconds: number;
  status: "ACTIVE" | "SOLD" | "EXPIRED" | "CANCELLED";
  winning_buyer_id?: string;
}

export interface ReconciliationRing {
  id: string;
  code: "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";
  name: string;
  description: string;
  passed: boolean;
  discrepancy_count: number;
  last_verified_at: number;
}

export interface MLRiskAccount {
  account_id: string;
  is_sim: boolean;
  risk_score: number; // 0 - 100
  flag: "LOW" | "ELEVATED" | "CRITICAL";
  cancel_ratio: number; // 0 - 1
  orders_per_min: number;
  supply_share_pct: number;
  above_ceiling_attempts: number;
  notes: string;
}

export type ConnectionState = "CONNECTING" | "AUTHENTICATING" | "SYNCING" | "LIVE" | "RECONNECTING" | "DISCONNECTED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  token: string;
  expires_at: number;
}
