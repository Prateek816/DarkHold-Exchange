/**
 * Runtime configuration for the exchange client.
 *
 * The mock adapter is the default so the venue is usable without a backend.
 * Set NEXT_PUBLIC_USE_MOCK=false only when a matching REST/WebSocket contract
 * is actually deployed. Features without a backend contract fail explicitly.
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const VENUE_NAME = "Darkhold Exchange";

export const DEMO_ACCOUNT_LABEL = "trader_01";
