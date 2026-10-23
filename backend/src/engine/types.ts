// Contract Types aligned with contracts/VERSION 1.0.0 and generated/types.ts

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type TimeInForce = 'GTC' | 'IOC';
export type AssetStatus = 'ACTIVE' | 'HALTED';
export type CancelReason =
  | 'USER'
  | 'POLICY_BREACH'
  | 'ADMIN'
  | 'IOC_REMAINDER'
  | 'NO_LIQUIDITY'
  | 'SELF_TRADE_PREVENTED';

export type EngineRejectCode =
  | 'UNKNOWN_ASSET'
  | 'ASSET_HALTED'
  | 'INVALID_QTY'
  | 'INVALID_PRICE'
  | 'PRICE_NOT_ON_TICK'
  | 'PRICE_ABOVE_COLLAR'
  | 'NOTIONAL_OVERFLOW'
  | 'INVALID_TIF'
  | 'ORDER_ID_REUSED'
  | 'INVALID_CONFIG';

// Commands
export interface SubmitOrderCommand {
  type: 'SubmitOrder';
  order_id: string; // lowercase uuid
  asset: string; // symbol
  user_id: string; // users.id (UUID or printable ascii)
  side: OrderSide;
  order_type: OrderType;
  tif: TimeInForce;
  qty: number;
  price: number;
}

export interface CancelOrderCommand {
  type: 'CancelOrder';
  order_id: string;
  reason: 'USER' | 'POLICY_BREACH' | 'ADMIN';
}

export interface ConfigureAssetCommand {
  type: 'ConfigureAsset';
  asset: string;
  tick_size: number;
  min_qty: number;
  max_qty: number;
  collar_max_price: number | null;
  status: AssetStatus;
}

export interface HaltAssetCommand {
  type: 'HaltAsset';
  asset: string;
}

export interface ResumeAssetCommand {
  type: 'ResumeAsset';
  asset: string;
}

export type EngineCommand =
  | SubmitOrderCommand
  | CancelOrderCommand
  | ConfigureAssetCommand
  | HaltAssetCommand
  | ResumeAssetCommand;

// Replies
export interface CommandReply {
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'ALREADY_CANCELED' | 'ALREADY_FILLED' | 'UNKNOWN_ORDER' | 'OK' | 'NOOP';
  seq: number | null;
  last_seq: number;
  engine_epoch: string;
  duplicate: boolean;
  order_id?: string;
  asset?: string;
  code?: EngineRejectCode;
  remaining_qty?: number;
}

// Events
export interface BaseEngineEvent {
  type: string;
  engine_epoch: string;
  seq: number;
  ts: number;
  asset: string;
}

export interface AssetConfiguredEvent extends BaseEngineEvent {
  type: 'AssetConfigured';
  tick_size: number;
  min_qty: number;
  max_qty: number;
  collar_max_price: number | null;
  status: AssetStatus;
}

export interface AssetHaltedEvent extends BaseEngineEvent {
  type: 'AssetHalted';
}

export interface AssetResumedEvent extends BaseEngineEvent {
  type: 'AssetResumed';
}

export interface OrderAcceptedEvent extends BaseEngineEvent {
  type: 'OrderAccepted';
  order_id: string;
  user_id: string;
  side: OrderSide;
  order_type: OrderType;
  tif: TimeInForce;
  price: number;
  qty: number;
}

export interface OrderRejectedEvent extends BaseEngineEvent {
  type: 'OrderRejected';
  order_id: string;
  user_id: string;
  code: EngineRejectCode;
}

export interface TradeExecutedEvent extends BaseEngineEvent {
  type: 'TradeExecuted';
  trade_id: string; // e-epoch:seq
  price: number;
  qty: number;
  buy_order_id: string;
  sell_order_id: string;
  buy_user_id: string;
  sell_user_id: string;
  maker_order_id: string;
  taker_order_id: string;
  taker_side: OrderSide;
  buy_remaining: number;
  sell_remaining: number;
}

export interface OrderPartiallyFilledEvent extends BaseEngineEvent {
  type: 'OrderPartiallyFilled';
  order_id: string;
  user_id: string;
  filled_qty: number;
  remaining_qty: number;
}

export interface OrderFilledEvent extends BaseEngineEvent {
  type: 'OrderFilled';
  order_id: string;
  user_id: string;
  filled_qty: number;
}

export interface OrderCanceledEvent extends BaseEngineEvent {
  type: 'OrderCanceled';
  order_id: string;
  user_id: string;
  filled_qty: number;
  remaining_qty: number;
  reason: CancelReason;
}

export type EngineEvent =
  | AssetConfiguredEvent
  | AssetHaltedEvent
  | AssetResumedEvent
  | OrderAcceptedEvent
  | OrderRejectedEvent
  | TradeExecutedEvent
  | OrderPartiallyFilledEvent
  | OrderFilledEvent
  | OrderCanceledEvent;

// Views
export interface BookLevel {
  price: number;
  qty: number;
  orders: number;
}

export interface BookSnapshot {
  asset: string;
  engine_epoch: string;
  as_of_seq: number;
  ts: number;
  depth: number;
  bids: BookLevel[];
  asks: BookLevel[];
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
}

export interface OrderOutcome {
  order_id: string;
  asset: string;
  user_id: string;
  side: OrderSide;
  order_type: OrderType;
  tif: TimeInForce;
  price: number;
  qty: number;
  filled_qty: number;
  remaining_qty: number;
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  reject_code: EngineRejectCode | null;
  cancel_reason: CancelReason | null;
  first_seq: number | null;
  engine_epoch: string;
  as_of_seq: number;
}

export interface OpenOrderItem {
  order_id: string;
  asset: string;
  user_id: string;
  side: OrderSide;
  price: number;
  qty: number;
  filled_qty: number;
  remaining_qty: number;
  accept_seq: number;
}

export interface OpenOrdersResponse {
  engine_epoch: string;
  as_of_seq: number;
  orders: OpenOrderItem[];
}

export interface HealthResponse {
  status: 'ok' | 'down';
  engine_epoch: string;
  seq: number;
  uptime_s: number;
}

export interface SseHello {
  engine_epoch: string;
  current_seq: number;
  ring_start_seq: number;
  assets: Array<{ asset: string; status: AssetStatus }>;
  server_time: number;
}
