import { TradeTick } from "@/lib/types";

export function generateMockTrades(assetId: string, count: number = 25): TradeTick[] {
  let basePrice = 26850;
  if (assetId === "MOONRISE-GA-2026") basePrice = 19400;
  if (assetId === "DARKHOLD-HOODIE-LTD") basePrice = 14200;
  if (assetId === "SIGIL-COLLECTOR-PIN") basePrice = 4800;

  const trades: TradeTick[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.48;
    const offset = Math.floor((Math.random() - 0.5) * 10) * 50;
    const price = basePrice + offset;
    const qty = Math.floor(Math.random() * 5) + 1;
    const isSim = Math.random() > 0.25; // 75% of trades involve SIM traders

    trades.push({
      seq: 5000 + (count - i),
      trade_id: `TRD-${5000 + (count - i)}`,
      asset_id: assetId,
      price,
      qty,
      aggressor_side: isBuy ? "BUY" : "SELL",
      is_sim: isSim,
      timestamp: now - i * 14000,
    });
  }

  return trades;
}
