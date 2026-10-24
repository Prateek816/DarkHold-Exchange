import type { TradeTick } from "@/lib/types";
import { MOCK_ASSETS } from "./assets";

const PRICE_BY_ASSET = new Map(MOCK_ASSETS.map((asset) => [asset.id, asset.last_price]));

/**
 * Seeded tape history. Every print is fictional and every counterparty is a
 * simulated venue account, so is_sim is always true in mock mode.
 */
export function generateMockTrades(assetId: string, count: number = 25): TradeTick[] {
  const basePrice = PRICE_BY_ASSET.get(assetId) ?? 10000;
  const trades: TradeTick[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const offset = (Math.floor(Math.random() * 7) - 3) * 25;
    const seq = 7000 + (count - i);
    trades.push({
      seq,
      trade_id: `TRD-SEED-${seq}`,
      asset_id: assetId,
      price: Math.max(1, basePrice + offset),
      qty: Math.floor(Math.random() * 3) + 1,
      aggressor_side: Math.random() > 0.48 ? "BUY" : "SELL",
      is_sim: true,
      timestamp: now - i * 14000,
    });
  }

  return trades;
}
