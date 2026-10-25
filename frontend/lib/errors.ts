import { formatCurrency, formatQuantity } from "./format";

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
  needed?: number; // minor units
  available?: number; // minor units or units
  ceiling?: number; // minor units
  pct?: number; // percentage
  face?: number; // minor units
  cap?: number;
  retry_after_seconds?: number;
  field?: string;
  field_message?: string;
  request_id?: string;
}

export interface ApiErrorPayload {
  code: ErrorCode;
  message?: string;
  context?: ApiErrorContext;
  requestId: string;
}

export function formatErrorMessage(
  code: ErrorCode,
  context?: ApiErrorContext,
  fallbackMessage?: string
): string {
  if (context?.field_message) {
    return context.field_message;
  }
  if (fallbackMessage && fallbackMessage !== code && fallbackMessage !== "VALIDATION_FAILED") {
    return fallbackMessage;
  }
  switch (code) {
    case "VALIDATION_FAILED":
      return context?.field_message || fallbackMessage || "Validation failed for the submitted values.";
    case "UNAUTHENTICATED":
      return context?.field_message || fallbackMessage || "Session expired or credentials incorrect. Please log in.";
    case "FORBIDDEN":
      return fallbackMessage || "You do not have permission to perform this action.";
    case "RATE_LIMITED":
      return `Rate limit exceeded. Try again in ${context?.retry_after_seconds ?? 5} seconds.`;
    case "INSUFFICIENT_FUNDS":
      return `You need ${formatCurrency(context?.needed ?? 0)} but have ${formatCurrency(
        context?.available ?? 0
      )} available.`;
    case "INSUFFICIENT_HOLDINGS":
      return `You have ${formatQuantity(context?.available ?? 0)} units available.`;
    case "PRICE_ABOVE_CEILING":
      return `Resale cap is ${formatCurrency(context?.ceiling ?? 0)} (${
        context?.pct ?? 110
      }% of face value ${formatCurrency(context?.face ?? 0)}). Lower your price.`;
    case "ASSET_NOT_TRADABLE":
      return context?.field_message || fallbackMessage || "Trading on this asset is not configured or has been halted by the exchange.";
    case "HOLDING_CAP_EXCEEDED":
      return `Limit of ${formatQuantity(context?.cap ?? 0)} units per account for this asset.`;
    case "MAX_OPEN_ORDERS":
      return "Maximum active open orders limit reached. Cancel an open order to proceed.";
    case "SELF_TRADE_PREVENTED":
      return "Self-trade prevention: Order would match your own resting order.";
    case "NO_LIQUIDITY":
      return "No liquidity within your price limit to fill this order.";
    case "ORDER_NOT_CANCELABLE":
      return "Already filled or completed.";
    case "ENGINE_BUSY":
      return `Matching engine is experiencing high load. Retrying in ${context?.retry_after_seconds ?? 2}s...`;
    case "ENGINE_UNAVAILABLE":
      return "Matching engine is temporarily offline. System is in read-only mode.";
    case "AUCTION_NOT_ACTIVE":
      return "This auction has ended or has not started yet.";
    case "AUCTION_ALREADY_SOLD":
      return "Another buyer accepted just before you.";
    case "PRICE_MOVED":
      return "Auction price updated during transaction. Please review current price and retry.";
    case "IDEMPOTENCY_CONFLICT":
      return "An operation with this submission key is currently being processed.";
    case "INTERNAL_ERROR":
    default:
      return fallbackMessage || `Something went wrong. Reference ${context?.request_id || "REQ-UNKNOWN"}.`;
  }
}
