import type { BookLevel, BookSnapshot } from "@/lib/types";

const REFERENCE_PRICE: Record<string, number> = {
  "DARKHOLD-PASS-2026": 26850,
  "MOONRISE-GA-2026": 19400,
  "DARKHOLD-HOODIE-LTD": 14200,
  "SIGIL-COLLECTOR-PIN": 4800,
};

/**
 * Book snapshots are generated around the asset's last print. The server owns
 * the sequence number; callers pass it in and must discard older snapshots.
 */
export function generateMockBookSnapshot(
  assetId: string,
  asOfSeq: number = 1000,
  options?: { emptyBids?: boolean; emptyAsks?: boolean },
  referencePrice?: number
): BookSnapshot {
  const midPrice = referencePrice ?? REFERENCE_PRICE[assetId] ?? 10000;
  const tick = midPrice >= 10000 ? 50 : 25;
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];

  if (!options?.emptyBids) {
    let cumBid = 0;
    for (let i = 1; i <= 12; i++) {
      const price = Math.max(1, midPrice - i * tick);
      const qty = ((asOfSeq + i * 3) % 7) + 1 + (i % 3);
      cumBid += qty;
      bids.push({
        price,
        qty,
        total_qty: cumBid,
        order_count: ((asOfSeq + i) % 3) + 1,
        has_user_order: false,
      });
    }
  }

  if (!options?.emptyAsks) {
    let cumAsk = 0;
    for (let i = 1; i <= 12; i++) {
      const price = midPrice + i * tick;
      const qty = ((asOfSeq + i * 5) % 7) + 1 + (i % 2);
      cumAsk += qty;
      asks.push({
        price,
        qty,
        total_qty: cumAsk,
        order_count: ((asOfSeq + i * 2) % 3) + 1,
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
