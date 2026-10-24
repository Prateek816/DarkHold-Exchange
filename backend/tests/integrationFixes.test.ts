import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "@/app";
import { resolveAssetIdentifiers, toEngineSymbol, toDbAssetIdentifier } from "@/utils/assetMapping";
import { calculateCurrentAuctionPrice, serializeAuction } from "@/utils/serialization";

describe("Regression: Integration Bug Fixes", () => {
  describe("Asset Identifier Normalization", () => {
    it("normalizes DB asset ID, DB symbol, and Engine symbol to the same canonical triplet", () => {
      const byId = resolveAssetIdentifiers("DARKHOLD-PASS-2026");
      const byDbSym = resolveAssetIdentifiers("DKH-FEST");
      const byEngineSym = resolveAssetIdentifiers("DFEST-WKND");

      expect(byId.id).toBe("DARKHOLD-PASS-2026");
      expect(byId.symbol).toBe("DKH-FEST");
      expect(byId.engineSymbol).toBe("DFEST-WKND");

      expect(byDbSym).toEqual(byId);
      expect(byEngineSym).toEqual(byId);
    });

    it("normalizes Moonrise GA across all representations", () => {
      const byId = resolveAssetIdentifiers("MOONRISE-GA-2026");
      const byDbSym = resolveAssetIdentifiers("MNR-GA");
      const byEngineSym = resolveAssetIdentifiers("MOONRISE-GA");

      expect(byId.id).toBe("MOONRISE-GA-2026");
      expect(byId.symbol).toBe("MNR-GA");
      expect(byId.engineSymbol).toBe("MOONRISE-GA");

      expect(byDbSym.id).toBe("MOONRISE-GA-2026");
      expect(byEngineSym.id).toBe("MOONRISE-GA-2026");
    });
  });

  describe("Candle Polling API Compatibility", () => {
    it("GET /api/candles/:assetId returns candle array for fallback polling", async () => {
      const res = await request(app).get("/api/candles/DARKHOLD-PASS-2026?interval=1m");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const candle = res.body[0];
        expect(candle).toHaveProperty("open");
        expect(candle).toHaveProperty("high");
        expect(candle).toHaveProperty("low");
        expect(candle).toHaveProperty("close");
        expect(candle).toHaveProperty("volume");
        expect(candle).toHaveProperty("interval");
      }
    });

    it("GET /api/candles/:assetId works with symbol identifier", async () => {
      const res = await request(app).get("/api/candles/DKH-FEST?interval=5s");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Dutch Auction Polling Fallback", () => {
    it("GET /api/auctions/:id returns valid auction structure for live price updates", async () => {
      const listRes = await request(app).get("/api/auctions");
      expect(listRes.status).toBe(200);
      const items = Array.isArray(listRes.body) ? listRes.body : listRes.body.items || listRes.body.auctions;
      expect(Array.isArray(items)).toBe(true);

      if (items.length > 0) {
        const targetId = items[0].auction_id || items[0].id;
        const detailRes = await request(app).get(`/api/auctions/${targetId}`);
        expect(detailRes.status).toBe(200);
        expect(detailRes.body).toHaveProperty("current_price");
        expect(detailRes.body).toHaveProperty("status");
        expect(detailRes.body).toHaveProperty("step_seconds");
        expect(detailRes.body).toHaveProperty("price_decrement");
      }
    });
  });
});
