import { Asset as PrismaAsset, Order as PrismaOrder, Auction as PrismaAuction, Trade as PrismaTrade, Wallet as PrismaWallet, WalletHolding as PrismaWalletHolding } from "@prisma/client";
import { resolveEngineSymbol, ASSET_SPECS } from "@/utils/assetMapping";

export function toNumber(val: bigint | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "bigint" ? Number(val) : val;
}

export function serializeAsset(asset: PrismaAsset, sparkline: number[] = []): any {
  const face = toNumber(asset.faceValue);
  const ceiling = toNumber(asset.ceilingPrice);
  const last = asset.lastPrice !== null ? toNumber(asset.lastPrice) : face;
  const engineSymbol = resolveEngineSymbol(asset.symbol) || resolveEngineSymbol(asset.id);
  const isConfigured = !!engineSymbol;
  const isTradable = !asset.isHalted && isConfigured;
  return {
    id: asset.id,
    symbol: asset.symbol,
    asset: asset.symbol,
    name: asset.name,
    category: asset.category,
    status: asset.isHalted ? "HALTED" : (!isConfigured ? "UNCONFIGURED" : "ACTIVE"),
    tick_size: engineSymbol && ASSET_SPECS[engineSymbol] ? ASSET_SPECS[engineSymbol].tick_size : 10,
    min_qty: engineSymbol && ASSET_SPECS[engineSymbol] ? ASSET_SPECS[engineSymbol].min_qty : 1,
    max_qty: engineSymbol && ASSET_SPECS[engineSymbol] ? ASSET_SPECS[engineSymbol].max_qty : 10,
    face_value: face,
    face_value_minor: face,
    ceiling_pct: asset.ceilingPct,
    ceiling_bps: asset.ceilingPct * 100,
    ceiling_price: ceiling,
    ceiling_minor: ceiling,
    last_price: last,
    last_trade_ts: asset.lastPriceTimestamp ? asset.lastPriceTimestamp.getTime() : Date.now(),
    last_price_timestamp: asset.lastPriceTimestamp ? asset.lastPriceTimestamp.getTime() : Date.now(),
    price_change_24h_pct: asset.priceChange24hPct,
    change_bps: Math.round(asset.priceChange24hPct * 100),
    best_bid: asset.bestBid !== null ? toNumber(asset.bestBid) : null,
    best_ask: asset.bestAsk !== null ? toNumber(asset.bestAsk) : null,
    available_ask_qty: asset.availableAskQty,
    volume_24h: asset.volume24h,
    is_halted: asset.isHalted,
    is_thin: asset.isThin,
    sim_active: asset.simActive,
    has_active_auction: asset.hasActiveAuction,
    is_configured: isConfigured,
    is_tradable: isTradable,
    engine_symbol: engineSymbol,
    sparkline_1h: sparkline.length > 0 ? sparkline : [face, last],
  };
}

export function serializeOrder(order: PrismaOrder & { asset?: PrismaAsset }): any {
  const sym = order.asset?.symbol || order.assetId;
  const priceNum = toNumber(order.price);
  const engineSymbol = resolveEngineSymbol(sym) || resolveEngineSymbol(order.assetId) || sym;
  return {
    id: order.id,
    order_id: order.id,
    orderId: order.id,
    client_id: order.userId,
    user_id: order.userId,
    idempotency_key: order.idempotencyKey || `IDEMP-${order.id}`,
    asset_id: order.assetId,
    symbol: sym,
    asset: sym,
    engine_symbol: engineSymbol,
    side: order.side,
    type: order.type,
    price: priceNum,
    limit_price_minor: priceNum,
    qty: order.originalQuantity,
    quantity: order.originalQuantity,
    matched_qty: order.matchedQuantity,
    remaining_qty: order.remainingQuantity,
    status: order.status,
    settlement_status: order.settlementStatus,
    settlement:
      (order.settlementStatus as string) === "COMPLETED"
        ? "SETTLED"
        : (order.settlementStatus as string) === "FAILED"
          ? "FAILED"
          : order.status === "REJECTED"
            ? "REJECTED"
            : order.status === "CANCELED"
              ? "CANCELED"
              : order.matchedQuantity > 0 && (order.settlementStatus as string) !== "COMPLETED"
                ? "SETTLING"
                : "PENDING",
    reject_code: (order as any).rejectCode || null,
    cancel_reason: (order as any).cancelReason || null,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    average_price: order.matchedQuantity > 0 ? priceNum : undefined,
  };
}

export function serializeHolding(holding: PrismaWalletHolding & { asset?: PrismaAsset }): any {
  const currentPrice = holding.asset?.lastPrice ? toNumber(holding.asset.lastPrice) : toNumber(holding.avgCost);
  const sym = holding.asset?.symbol || holding.assetId;
  const engineSymbol = resolveEngineSymbol(sym) || resolveEngineSymbol(holding.assetId) || sym;
  return {
    asset_id: holding.assetId,
    symbol: sym,
    asset: sym,
    engine_symbol: engineSymbol,
    name: holding.asset?.name || holding.assetId,
    available_units: holding.availableUnits,
    reserved_units: holding.reservedUnits,
    total_units: holding.totalUnits,
    available_qty: holding.availableUnits,
    reserved_qty: holding.reservedUnits,
    total_qty: holding.totalUnits,
    avg_cost: toNumber(holding.avgCost),
    current_price: currentPrice,
  };
}

export function serializeWallet(
  wallet: PrismaWallet,
  holdings: (PrismaWalletHolding & { asset?: PrismaAsset })[] = []
): any {
  const avail = toNumber(wallet.availableBalance);
  const res = toNumber(wallet.reservedBalance);
  const tot = toNumber(wallet.totalBalance);
  return {
    available_credits: avail,
    reserved_credits: res,
    total_credits: tot,
    available_minor: avail,
    reserved_minor: res,
    total_minor: tot,
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
  const sym = auction.asset?.symbol || auction.assetId;
  const startP = toNumber(auction.startPrice);
  const floorP = toNumber(auction.floorPrice);
  const ceilP = toNumber(auction.ceilingPrice);
  const decP = toNumber(auction.priceDecrement);
  const nextP = Math.max(floorP, currentPrice - decP);

  return {
    id: auction.id,
    auction_id: auction.id,
    asset_id: auction.assetId,
    symbol: sym,
    asset: sym,
    asset_name: auction.asset?.name || auction.assetId,
    seller_id: auction.sellerId,
    is_sim_seller: auction.isSimSeller,
    qty: auction.quantity,
    quantity: auction.quantity,
    start_price: startP,
    start_price_minor: startP,
    floor_price: floorP,
    floor_price_minor: floorP,
    ceiling_price: ceilP,
    ceiling_minor: ceilP,
    current_price: currentPrice,
    current_price_minor: currentPrice,
    next_price_minor: nextP,
    seconds_to_next_step: nextStepInSeconds,
    step_seconds: auction.stepSeconds,
    decrement_minor: decP,
    price_decrement: decP,
    next_step_in_seconds: nextStepInSeconds,
    start_time: auction.startTime.toISOString(),
    end_time: auction.endTime.toISOString(),
    status: auction.status,
    winning_buyer_id: auction.winnerId || undefined,
  };
}

export function serializeTrade(trade: PrismaTrade & { asset?: PrismaAsset }): any {
  const sym = trade.asset?.symbol || trade.assetId;
  const priceNum = toNumber(trade.executionPrice);
  const tsNum = trade.ts ? Number(trade.ts) : trade.matchedAt.getTime();
  const seqNum = trade.seq ? Number(trade.seq) : 1;
  return {
    seq: seqNum,
    trade_id: trade.id,
    id: trade.id,
    asset_id: trade.assetId,
    symbol: sym,
    asset: sym,
    price: priceNum,
    price_minor: priceNum,
    qty: trade.quantity,
    quantity: trade.quantity,
    total_minor: toNumber(trade.totalCost),
    taker_side: trade.takerSide || "BUY",
    aggressor_side: trade.takerSide || "BUY",
    is_sim: trade.isSim,
    buyer_is_simulated: trade.buyerId.startsWith("sim_") || trade.isSim,
    seller_is_simulated: trade.sellerId.startsWith("sim_") || trade.isSim,
    ts: tsNum,
    timestamp: tsNum,
    matched_at: trade.matchedAt.toISOString(),
    settled_at: trade.settledAt ? trade.settledAt.toISOString() : null,
    state: trade.state || "SETTLED",
  };
}
