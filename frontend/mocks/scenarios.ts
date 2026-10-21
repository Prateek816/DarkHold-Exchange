import {
  BookSnapshot,
  TradeTick,
  Candle,
  Order,
  SettlementStatus,
  DutchAuction,
} from "@/lib/types";
import { generateMockBookSnapshot } from "./fixtures/orderBook";
import { generateMockTrades } from "./fixtures/trades";
import { MOCK_ORDERS } from "./fixtures/orders";
import { MOCK_WALLET } from "./fixtures/wallet";
import { MOCK_AUCTIONS } from "./fixtures/auctions";

export type MockScenarioType =
  | "NORMAL_FLOW"
  | "PARTIAL_FILL"
  | "CANCEL_RACE"
  | "DISCONNECT_RECONNECT"
  | "SETTLEMENT_PENDING_TO_COMPLETED"
  | "ASSET_HALTED"
  | "SELL_WALL"
  | "PUMP_TO_CEILING";

export interface MockScenarioContext {
  activeScenario: MockScenarioType;
  isHalted: boolean;
  seqCounter: number;
}
