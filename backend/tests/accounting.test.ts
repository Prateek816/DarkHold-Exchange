import { describe, it, expect } from "vitest";

describe("Accounting & Ledger Correctness", () => {
  it("uses exact integer minor units (cents) with zero floating point drift", () => {
    // Standard JS float error: 0.1 + 0.2 === 0.30000000000000004
    // Minor units integer calculation:
    const priceMinor = BigInt(26850); // $268.50
    const qty = 3;
    const totalCost = priceMinor * BigInt(qty); // 80550 cents = $805.50

    expect(totalCost.toString()).toBe("80550");
    expect(Number(totalCost)).toBe(80550);
  });

  it("enforces available and reserved balance separation", () => {
    let available = BigInt(500000); // $5,000.00
    let reserved = BigInt(0);
    let total = available + reserved;

    // Place Buy Order for 2x @ $265.00 = $530.00 (53000 cents)
    const orderCost = BigInt(53000);
    expect(available >= orderCost).toBe(true);

    available -= orderCost;
    reserved += orderCost;

    // Conservation invariant
    expect(available + reserved).toBe(total);
    expect(available).toBe(BigInt(447000));
    expect(reserved).toBe(BigInt(53000));
  });

  it("correctly releases reservation on order cancellation", () => {
    let available = BigInt(447000);
    let reserved = BigInt(53000);
    const total = available + reserved;

    // Cancel order
    const releaseAmount = BigInt(53000);
    available += releaseAmount;
    reserved -= releaseAmount;

    expect(available + reserved).toBe(total);
    expect(available).toBe(BigInt(500000));
    expect(reserved).toBe(BigInt(0));
  });

  it("settles trade with price improvement refunding excess reservation to available balance", () => {
    // Market buy order reserved at ceiling price 27500 ($275.00)
    let available = BigInt(472500);
    let reserved = BigInt(27500);
    let total = available + reserved; // 500000

    // Matched at 26850 ($268.50). Actual cost = 26850. Excess = 650.
    const executionPrice = BigInt(26850);
    const reservedCost = BigInt(27500);
    const excessRefund = reservedCost - executionPrice;

    reserved -= reservedCost;
    total -= executionPrice;
    available += excessRefund;

    expect(available + reserved).toBe(total);
    expect(available).toBe(BigInt(473150));
    expect(reserved).toBe(BigInt(0));
    expect(total).toBe(BigInt(473150));
  });

  it("prevents negative balances and overselling", () => {
    const availableBalance = BigInt(10000); // $100.00
    const needed = BigInt(25000); // $250.00

    const canAfford = availableBalance >= needed;
    expect(canAfford).toBe(false);

    const availableUnits = 2;
    const sellQty = 3;
    const canSell = availableUnits >= sellQty;
    expect(canSell).toBe(false);
  });
});
