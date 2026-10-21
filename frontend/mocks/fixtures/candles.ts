import { Candle } from "@/lib/types";

export function generateSeededCandles(
  assetId: string,
  interval: "5s" | "1m" = "1m",
  count: number = 60
): Candle[] {
  const candles: Candle[] = [];
  const stepMs = interval === "5s" ? 5000 : 60000;
  const now = Math.floor(Date.now() / stepMs) * stepMs;
  
  // Starting base price per asset
  let basePrice = 26000;
  if (assetId === "MOONRISE-GA-2026") basePrice = 19000;
  if (assetId === "DARKHOLD-HOODIE-LTD") basePrice = 14000;
  if (assetId === "SIGIL-COLLECTOR-PIN") basePrice = 4500;

  let currentClose = basePrice;
  const liveDividerIndex = Math.floor(count * 0.7); // 70% seeded history, 30% live

  for (let i = count; i >= 0; i--) {
    const openTime = now - i * stepMs;
    const closeTime = openTime + stepMs;

    const variation = (Math.sin(i / 3) + (Math.random() - 0.48)) * (basePrice * 0.008);
    const open = Math.round(currentClose);
    const close = Math.round(open + variation);
    const high = Math.round(Math.max(open, close) + Math.random() * (basePrice * 0.005));
    const low = Math.round(Math.min(open, close) - Math.random() * (basePrice * 0.005));
    const volume = Math.floor(Math.random() * 20) + 1;

    currentClose = close;

    // Distinguish seeded simulation history from live engine data
    const isSeeded = i > (count - liveDividerIndex);

    candles.push({
      open_time: Math.floor(openTime / 1000), // seconds for Lightweight Charts
      close_time: Math.floor(closeTime / 1000),
      open,
      high,
      low,
      close,
      volume,
      interval,
      origin: isSeeded ? "SEEDED_SIM" : "ENGINE",
    });
  }

  return candles;
}
