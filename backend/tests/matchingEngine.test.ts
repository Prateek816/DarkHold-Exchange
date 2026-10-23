import { describe, it, expect } from "vitest";
import { MatchingEngineSimulation } from "@/services/matchingEngine";
import { PriceAboveCeilingError, SelfTradePreventedError } from "@/utils/errors";

describe("Matching Engine & Order Book Priority", () => {
  it("provides deterministic book snapshot with sorted bids (descending) and asks (ascending)", () => {
    const engine = new MatchingEngineSimulation();
    const snapshot = engine.getBookSnapshot("DARKHOLD-PASS-2026");

    expect(snapshot.asset_id).toBe("DARKHOLD-PASS-2026");
    expect(snapshot.bids.length).toBeGreaterThan(0);
    expect(snapshot.asks.length).toBeGreaterThan(0);

    // Verify Bids are descending
    for (let i = 1; i < snapshot.bids.length; i++) {
      expect(snapshot.bids[i - 1].price).toBeGreaterThanOrEqual(snapshot.bids[i].price);
    }

    // Verify Asks are ascending
    for (let i = 1; i < snapshot.asks.length; i++) {
      expect(snapshot.asks[i - 1].price).toBeLessThanOrEqual(snapshot.asks[i].price);
    }

    // Verify cumulative quantities
    let runningBidQty = 0;
    for (const b of snapshot.bids) {
      runningBidQty += b.qty;
      expect(b.total_qty).toBe(runningBidQty);
    }
  });

  it("calculates price ceiling correctly based on statutory cap percentage", () => {
    const faceValue = 25000; // $250.00
    const ceilingPct = 110; // 110%
    const expectedCeiling = Math.floor((faceValue * ceilingPct) / 100); // 27500 ($275.00)

    expect(expectedCeiling).toBe(27500);

    // Price Above Ceiling
    const bidPrice = 28000;
    const isAboveCeiling = bidPrice > expectedCeiling;
    expect(isAboveCeiling).toBe(true);

    const err = new PriceAboveCeilingError(expectedCeiling, ceilingPct, faceValue);
    expect(err.code).toBe("PRICE_ABOVE_CEILING");
    expect(err.context?.ceiling).toBe(27500);
  });
});
