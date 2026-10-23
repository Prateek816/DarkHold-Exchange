import { prisma } from "@/config/db";
import { serializeAsset } from "@/utils/serialization";
import { matchingEngine } from "@/services/matchingEngine";

export class AssetsService {
  public async getAssets() {
    const assets = await prisma.asset.findMany({
      orderBy: { symbol: "asc" },
    });
    return assets.map((a) => serializeAsset(a));
  }

  public async getAsset(idOrSymbol: string) {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ id: idOrSymbol }, { symbol: idOrSymbol }],
      },
    });
    return asset ? serializeAsset(asset) : null;
  }

  public async getBook(assetId: string, userId?: string) {
    return matchingEngine.getBookSnapshot(assetId, userId);
  }

  public async getCandles(assetId: string, interval: "5s" | "1m" = "1m") {
    // Return seeded / calculated candles based on asset last price
    const asset = await this.getAsset(assetId);
    const basePrice = asset ? asset.last_price : 25000;
    const now = Date.now();
    const intervalMs = interval === "5s" ? 5000 : 60000;
    const count = 30;

    const candles = [];
    let curPrice = basePrice;
    for (let i = count - 1; i >= 0; i--) {
      const openTime = now - (i + 1) * intervalMs;
      const closeTime = now - i * intervalMs;
      const variance = Math.floor((Math.random() - 0.48) * 100);
      const open = curPrice;
      const close = Math.max(1000, curPrice + variance);
      const high = Math.max(open, close) + Math.floor(Math.random() * 50);
      const low = Math.min(open, close) - Math.floor(Math.random() * 50);
      const volume = Math.floor(Math.random() * 15) + 1;
      curPrice = close;

      candles.push({
        open_time: openTime,
        close_time: closeTime,
        open,
        high,
        low,
        close,
        volume,
        interval,
        origin: "ENGINE" as const,
      });
    }

    return candles;
  }
}

export const assetsService = new AssetsService();
