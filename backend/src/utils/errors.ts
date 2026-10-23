export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_HOLDINGS"
  | "PRICE_ABOVE_CEILING"
  | "ASSET_NOT_TRADABLE"
  | "HOLDING_CAP_EXCEEDED"
  | "MAX_OPEN_ORDERS"
  | "SELF_TRADE_PREVENTED"
  | "NO_LIQUIDITY"
  | "ORDER_NOT_CANCELABLE"
  | "ENGINE_BUSY"
  | "ENGINE_UNAVAILABLE"
  | "AUCTION_NOT_ACTIVE"
  | "AUCTION_ALREADY_SOLD"
  | "PRICE_MOVED"
  | "IDEMPOTENCY_CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiErrorContext {
  needed?: number;
  available?: number;
  ceiling?: number;
  pct?: number;
  face?: number;
  cap?: number;
  retry_after_seconds?: number;
  field?: string;
  field_message?: string;
  request_id?: string;
  [key: string]: any;
}

export interface ApiErrorPayload {
  code: ErrorCode;
  message?: string;
  context?: ApiErrorContext;
  requestId: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly context?: ApiErrorContext;
  public readonly requestId: string;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message?: string,
    context?: ApiErrorContext,
    requestId: string = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  ) {
    super(message || code);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toPayload(): ApiErrorPayload {
    return {
      code: this.code,
      message: this.message,
      context: {
        ...this.context,
        request_id: this.requestId,
      },
      requestId: this.requestId,
    };
  }
}

export class ValidationError extends AppError {
  constructor(field: string, message: string, requestId?: string) {
    super(
      400,
      "VALIDATION_FAILED",
      message,
      { field, field_message: message },
      requestId
    );
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string = "Session expired or credentials incorrect. Please log in.", requestId?: string) {
    super(401, "UNAUTHENTICATED", message, { field_message: message }, requestId);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action.", requestId?: string) {
    super(403, "FORBIDDEN", message, undefined, requestId);
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds: number = 5, requestId?: string) {
    super(
      429,
      "RATE_LIMITED",
      `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      { retry_after_seconds: retryAfterSeconds },
      requestId
    );
  }
}

export class InsufficientFundsError extends AppError {
  constructor(needed: number, available: number, requestId?: string) {
    super(
      400,
      "INSUFFICIENT_FUNDS",
      `Insufficient funds: needed ${needed}, available ${available}`,
      { needed, available },
      requestId
    );
  }
}

export class InsufficientHoldingsError extends AppError {
  constructor(available: number, requestId?: string) {
    super(
      400,
      "INSUFFICIENT_HOLDINGS",
      `Insufficient asset holdings: available ${available}`,
      { available },
      requestId
    );
  }
}

export class PriceAboveCeilingError extends AppError {
  constructor(ceiling: number, pct: number, face: number, requestId?: string) {
    super(
      400,
      "PRICE_ABOVE_CEILING",
      `Price exceeds resale ceiling cap of ${ceiling} (${pct}% of face value ${face})`,
      { ceiling, pct, face },
      requestId
    );
  }
}

export class AssetNotTradableError extends AppError {
  constructor(message: string = "Trading on this asset has been halted by the exchange.", requestId?: string) {
    super(400, "ASSET_NOT_TRADABLE", message, undefined, requestId);
  }
}

export class SelfTradePreventedError extends AppError {
  constructor(message: string = "Self-trade prevention: Order would match your own resting order.", requestId?: string) {
    super(400, "SELF_TRADE_PREVENTED", message, undefined, requestId);
  }
}

export class OrderNotCancelableError extends AppError {
  constructor(message: string = "Order is already filled, cancelled, or cannot be cancelled.", requestId?: string) {
    super(400, "ORDER_NOT_CANCELABLE", message, undefined, requestId);
  }
}

export class AuctionNotActiveError extends AppError {
  constructor(message: string = "This auction has ended or has not started yet.", requestId?: string) {
    super(400, "AUCTION_NOT_ACTIVE", message, undefined, requestId);
  }
}

export class AuctionAlreadySoldError extends AppError {
  constructor(message: string = "Another buyer accepted just before you.", requestId?: string) {
    super(409, "AUCTION_ALREADY_SOLD", message, undefined, requestId);
  }
}

export class PriceMovedError extends AppError {
  constructor(message: string = "Auction price updated during transaction. Please review current price and retry.", requestId?: string) {
    super(409, "PRICE_MOVED", message, undefined, requestId);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message: string = "An operation with this submission key is currently being processed.", requestId?: string) {
    super(409, "IDEMPOTENCY_CONFLICT", message, undefined, requestId);
  }
}
