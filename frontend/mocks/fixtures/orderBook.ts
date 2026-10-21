import { BookLevel, BookSnapshot } from "@/lib/types";

export function generateMockBookSnapshot(
  assetId: string,
  asOfSeq: number = 1000,
  options?: { emptyBids?: boolean; emptyAsks?: boolean }
): BookSnapshot {
  let midPrice = 26850;
  let tick = 50; // $0.50 tick

  if (assetId === "MOONRISE-GA-2026") {
    midPrice = 19400;
    tick = 50;
  } else if (assetId === "DARKHOLD-HOODIE-LTD") {
    midPrice = 14200;
    tick = 50;
  } else if (assetId === "SIGIL-COLLECTOR-PIN") {
    midPrice = 4800;
    tick = 25;
  }

  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];

  if (!options?.emptyBids) {
    let cumBid = 0;
    for (let i = 1; i <= 15; i++) {
      const price = midPrice - i * tick;
      const qty = Math.floor(Math.random() * 8) + 1 + (i % 3);
      cumBid += qty;
      bids.push({
        price,
        qty,
        total_qty: cumBid,
        order_count: Math.floor(Math.random() * 3) + 1,
        has_user_order: i === 3, // Simulate user resting order on level 3
      });
    }
  }

  if (!options?.emptyAsks) {
    let cumAsk = 0;
    for (let i = 1; i <= 15; i++) {
      const price = midPrice + i * tick;
      const qty = Math.floor(Math.random() * 8) + 1 + (i % 2);
      cumAsk += qty;
      asks.push({
        price,
        qty,
        total_qty: cumAsk,
        order_count: Math.floor(Math.random() * 3) + 1,
        has_user_order: false,
      });
    }
  }

  return {
    asset_id: assetId,
    as_of_seq: asOfSeq,
    timestamp: Date.now(),
    bids,
    asks,
  };
}
