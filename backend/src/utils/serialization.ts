import { Asset as PrismaAsset, Order as PrismaOrder, Auction as PrismaAuction, Trade as PrismaTrade, Wallet as PrismaWallet, WalletHolding as PrismaWalletHolding } from "@prisma/client";

export function toNumber(val: bigint | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "bigint" ? Number(val) : val;
}

export function serializeAsset(asset: PrismaAsset, sparkline: number[] = []): any {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    category: asset.category,
    face_value: toNumber(asset.faceValue),
    ceiling_pct: asset.ceilingPct,
    ceiling_price: toNumber(asset.ceilingPrice),
    last_price: toNumber(asset.lastPrice),
    last_price_timestamp: asset.lastPriceTimestamp ? asset.lastPriceTimestamp.getTime() : Date.now(),
    price_change_24h_pct: asset.priceChange24hPct,
    best_bid: asset.bestBid !== null ? toNumber(asset.bestBid) : undefined,
    best_ask: asset.bestAsk !== null ? toNumber(asset.bestAsk) : undefined,
    available_ask_qty: asset.availableAskQty,
    volume_24h: asset.volume24h,
    is_halted: asset.isHalted,
    is_thin: asset.isThin,
    sim_active: asset.simActive,
    has_active_auction: asset.hasActiveAuction,
    sparkline_1h: sparkline.length > 0 ? sparkline : [toNumber(asset.faceValue), toNumber(asset.lastPrice || asset.faceValue)],
  };
}

export function serializeOrder(order: PrismaOrder): any {
  return {
    order_id: order.id,
    client_id: order.userId,
    idempotency_key: order.idempotencyKey || `IDEMP-${order.id}`,
    asset_id: order.assetId,
    side: order.side,
    type: order.type,
    price: toNumber(order.price),
    qty: order.originalQuantity,
    matched_qty: order.matchedQuantity,
    remaining_qty: order.remainingQuantity,
    status: order.status,
    settlement_status: order.settlementStatus,
    created_at: order.createdAt.getTime(),
    updated_at: order.updatedAt.getTime(),
    average_price: order.matchedQuantity > 0 ? toNumber(order.price) : undefined,
  };
}

export function serializeHolding(holding: PrismaWalletHolding & { asset?: PrismaAsset }): any {
  const currentPrice = holding.asset?.lastPrice ? toNumber(holding.asset.lastPrice) : toNumber(holding.avgCost);
  return {
    asset_id: holding.assetId,
    symbol: holding.asset?.symbol || holding.assetId,
    name: holding.asset?.name || holding.assetId,
    available_units: holding.availableUnits,
    reserved_units: holding.reservedUnits,
    total_units: holding.totalUnits,
    avg_cost: toNumber(holding.avgCost),
    current_price: currentPrice,
  };
}

export function serializeWallet(
  wallet: PrismaWallet,
  holdings: (PrismaWalletHolding & { asset?: PrismaAsset })[] = []
): any {
  return {
    available_credits: toNumber(wallet.availableBalance),
    reserved_credits: toNumber(wallet.reservedBalance),
    total_credits: toNumber(wallet.totalBalance),
    holdings: holdings.map(serializeHolding),
  };
}

export function calculateCurrentAuctionPrice(auction: {
  startPrice: bigint;
  floorPrice: bigint;
  priceDecrement: bigint;
  stepSeconds: number;
  startTime: Date;
  endTime: Date;
  status: string;
}): { currentPrice: number; nextStepInSeconds: number } {
  const now = Date.now();
  const startMs = auction.startTime.getTime();
  const endMs = auction.endTime.getTime();

  if (now < startMs) {
    return { currentPrice: toNumber(auction.startPrice), nextStepInSeconds: Math.ceil((startMs - now) / 1000) };
  }
  if (now >= endMs || auction.status !== "ACTIVE") {
    return { currentPrice: toNumber(auction.floorPrice), nextStepInSeconds: 0 };
  }

  const elapsedSeconds = Math.floor((now - startMs) / 1000);
  const stepsTaken = Math.floor(elapsedSeconds / auction.stepSeconds);
  const totalDecrement = BigInt(stepsTaken) * auction.priceDecrement;

  let calculatedPrice = auction.startPrice - totalDecrement;
  if (calculatedPrice < auction.floorPrice) {
    calculatedPrice = auction.floorPrice;
  }

  const nextStepInSeconds = auction.stepSeconds - (elapsedSeconds % auction.stepSeconds);
  return { currentPrice: toNumber(calculatedPrice), nextStepInSeconds };
}

export function serializeAuction(auction: PrismaAuction & { asset?: PrismaAsset }): any {
  const { currentPrice, nextStepInSeconds } = calculateCurrentAuctionPrice(auction);

  return {
    auction_id: auction.id,
    asset_id: auction.assetId,
    asset_name: auction.asset?.name || auction.assetId,
    seller_id: auction.sellerId,
    is_sim_seller: auction.isSimSeller,
    qty: auction.quantity,
    start_price: toNumber(auction.startPrice),
    floor_price: toNumber(auction.floorPrice),
    ceiling_price: toNumber(auction.ceilingPrice),
    current_price: currentPrice,
    start_time: auction.startTime.getTime(),
    end_time: auction.endTime.getTime(),
    step_seconds: auction.stepSeconds,
    price_decrement: toNumber(auction.priceDecrement),
    next_step_in_seconds: nextStepInSeconds,
    status: auction.status,
    winning_buyer_id: auction.winnerId || undefined,
  };
}

export function serializeTrade(trade: PrismaTrade & { asset?: PrismaAsset }): any {
  return {
    seq: 1,
    trade_id: trade.id,
    asset_id: trade.assetId,
    price: toNumber(trade.executionPrice),
    qty: trade.quantity,
    aggressor_side: "BUY",
    is_sim: trade.isSim,
    timestamp: trade.matchedAt.getTime(),
  };
}
