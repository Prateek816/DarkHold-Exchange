import type { Candle } from "@/lib/types";
import { MOCK_ASSETS } from "./assets";

const BASE_PRICE = new Map(MOCK_ASSETS.map((asset) => [asset.id, asset.last_price]));

/**
 * Seeded candle history for the mock venue. This is manufactured display data,
 * so every candle is marked SEEDED_SIM. Live ENGINE candles are only appended
 * by the mock server when an actual mock trade print exists.
 */
export function generateSeededCandles(
  assetId: string,
  interval: "5s" | "1m" = "1m",
  count: number = 60
): Candle[] {
  const candles: Candle[] = [];
  const stepMs = interval === "5s" ? 5000 : 60000;
  const now = Math.floor(Date.now() / stepMs) * stepMs;
  const basePrice = BASE_PRICE.get(assetId) ?? 10000;

  let currentClose = Math.round(basePrice * 0.985);
  const seededCount = Math.max(1, Math.floor(count * 0.8));

  for (let i = seededCount; i >= 0; i--) {
    const openTime = now - i * stepMs;
    const closeTime = openTime + stepMs;
    const variation =
      (Math.sin(i / 3) + (Math.random() - 0.5) * 0.9) * (basePrice * 0.0045);
    const open = Math.round(currentClose);
    const close = Math.round(open + variation);
    const high = Math.round(Math.max(open, close) + Math.random() * (basePrice * 0.0025));
    const low = Math.round(Math.min(open, close) - Math.random() * (basePrice * 0.0025));
    const volume = Math.floor(Math.random() * 9) + 1;

    currentClose = close;

    candles.push({
      open_time: Math.floor(openTime / 1000),
      close_time: Math.floor(closeTime / 1000),
      open,
      high,
      low,
      close,
      volume,
      interval,
      origin: "SEEDED_SIM",
    });
  }

  return candles;
}
