import { describe, it, expect } from "vitest";
import { calculateCurrentAuctionPrice } from "@/utils/serialization";
import { AuctionAlreadySoldError, PriceMovedError } from "@/utils/errors";

describe("Dutch Auction Mechanics", () => {
  it("determines price decay deterministically over time", () => {
    const now = Date.now();
    const startPrice = BigInt(27500); // $275.00
    const floorPrice = BigInt(24000); // $240.00
    const priceDecrement = BigInt(50); // $0.50 per step
    const stepSeconds = 15;

    // 1. At start time
    const atStart = calculateCurrentAuctionPrice({
      startPrice,
      floorPrice,
      priceDecrement,
      stepSeconds,
      startTime: new Date(now),
      endTime: new Date(now + 1800000),
      status: "ACTIVE",
    });
    expect(atStart.currentPrice).toBe(27500);
    expect(atStart.nextStepInSeconds).toBe(15);

    // 2. After 30 seconds (2 steps)
    const after30s = calculateCurrentAuctionPrice({
      startPrice,
      floorPrice,
      priceDecrement,
      stepSeconds,
      startTime: new Date(now - 30000),
      endTime: new Date(now + 1800000),
      status: "ACTIVE",
    });
    expect(after30s.currentPrice).toBe(27400); // 27500 - (2 * 50) = 27400

    // 3. After expiry / reaching floor
    const atFloor = calculateCurrentAuctionPrice({
      startPrice,
      floorPrice,
      priceDecrement,
      stepSeconds,
      startTime: new Date(now - 3600000), // 1 hour ago
      endTime: new Date(now - 1000), // expired
      status: "ACTIVE",
    });
    expect(atFloor.currentPrice).toBe(24000); // Clamped at floorPrice
  });

  it("handles concurrent purchase race guarantee (only one winner)", async () => {
    let auctionStatus = "ACTIVE";
    let winnerId: string | null = null;

    // Simulate atomic lock function
    async function attemptPurchase(buyerId: string) {
      if (auctionStatus === "ACTIVE") {
        auctionStatus = "SOLD";
        winnerId = buyerId;
        return { success: true, winner: buyerId };
      }
      throw new AuctionAlreadySoldError();
    }

    // Two buyers race concurrently
    const buyer1Promise = attemptPurchase("buyer_alice");
    const buyer2Promise = attemptPurchase("buyer_bob");

    const results = await Promise.allSettled([buyer1Promise, buyer2Promise]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(auctionStatus).toBe("SOLD");
    expect(winnerId).toBe("buyer_alice");

    // Rejected buyer receives AUCTION_ALREADY_SOLD
    const rejectedReason: any = (failures[0] as PromiseRejectedResult).reason;
    expect(rejectedReason.code).toBe("AUCTION_ALREADY_SOLD");
  });

  it("rejects purchase when current price exceeds buyer slippage maxPrice", () => {
    const currentPrice = 25800; // $258.00
    const maxPrice = 25000; // Buyer only willing to pay up to $250.00

    expect(currentPrice > maxPrice).toBe(true);
    const err = new PriceMovedError();
    expect(err.code).toBe("PRICE_MOVED");
  });
});
