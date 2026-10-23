import { prisma } from "@/config/db";
import { serializeAsset } from "@/utils/serialization";
import { engineClient } from "@/engine/engineClient";
import { candleService } from "@/market/candleService";

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

  public async getBook(assetIdOrSymbol: string, userId?: string, depth: number = 15) {
    const symbolAliases: Record<string, string> = {
      "DFEST-WKND": "DKH-FEST",
      "MOONRISE-GA": "MNR-GA",
      "DFEST-HOODIE": "DKH-HOOD",
      "SIGIL-PIN": "SGL-PIN",
    };
    const resolved = symbolAliases[assetIdOrSymbol] || assetIdOrSymbol;
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ id: assetIdOrSymbol }, { symbol: assetIdOrSymbol }, { id: resolved }, { symbol: resolved }],
      },
    });

    const symbol = asset ? asset.symbol : resolved;
    const clampedDepth = Math.max(1, Math.min(100, depth));

    try {
      const engineBook = await engineClient.getBook(symbol, clampedDepth);
      if (engineBook) {
        return {
          ...engineBook,
          asset_id: asset ? asset.id : symbol,
        };
      }
    } catch (err) {
      // Fallback if engine is momentarily unavailable
    }

    // Default book response
    return {
      asset: symbol,
      asset_id: asset ? asset.id : symbol,
      engine_epoch: "e-live0001",
      as_of_seq: 1000,
      ts: Date.now(),
      depth: clampedDepth,
      bids: asset?.bestBid ? [{ price: Number(asset.bestBid), qty: 10, orders: 1 }] : [],
      asks: asset?.bestAsk ? [{ price: Number(asset.bestAsk), qty: 10, orders: 1 }] : [],
      best_bid: asset?.bestBid ? Number(asset.bestBid) : null,
      best_ask: asset?.bestAsk ? Number(asset.bestAsk) : null,
      spread:
        asset?.bestBid && asset?.bestAsk ? Number(asset.bestAsk - asset.bestBid) : null,
    };
  }

  public async getCandles(assetIdOrSymbol: string, interval: "5s" | "1m" = "1m", limit: number = 500) {
    return candleService.getCandles(assetIdOrSymbol, interval, limit);
  }
}

export const assetsService = new AssetsService();
