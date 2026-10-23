import { prisma } from "@/config/db";
import {
  PriceAboveCeilingError,
  AuctionNotActiveError,
  AuctionAlreadySoldError,
  PriceMovedError,
  AppError,
} from "@/utils/errors";
import { walletsService } from "@/modules/wallets/wallets.service";
import {
  calculateCurrentAuctionPrice,
  serializeAuction,
  toNumber,
} from "@/utils/serialization";

export class AuctionService {
  /**
   * Retrieves all active and recent auctions.
   */
  public async getAuctions() {
    const auctions = await prisma.auction.findMany({
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    return auctions.map(serializeAuction);
  }

  /**
   * Retrieves a specific auction by ID.
   */
  public async getAuctionById(id: string) {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!auction) return null;
    return serializeAuction(auction);
  }

  /**
   * Creates a new Dutch auction, reserves seller inventory.
   */
  public async createAuction(params: {
    sellerId: string;
    assetId: string;
    qty: number;
    startPrice: number;
    floorPrice: number;
    durationMinutes: number;
    stepSeconds?: number;
    idempotencyKey?: string;
  }) {
    const asset = await prisma.asset.findUnique({
      where: { id: params.assetId },
    });

    if (!asset) {
      throw new AppError(404, "VALIDATION_FAILED", "Asset not found.");
    }

    const startPriceBig = BigInt(params.startPrice);
    const floorPriceBig = BigInt(params.floorPrice);

    // Resale Ceiling Enforcement
    if (startPriceBig > asset.ceilingPrice) {
      throw new PriceAboveCeilingError(
        Number(asset.ceilingPrice),
        asset.ceilingPct,
        Number(asset.faceValue)
      );
    }

    if (floorPriceBig > startPriceBig) {
      throw new AppError(400, "VALIDATION_FAILED", "Floor price cannot exceed start price.");
    }

    // Reserve inventory units from seller
    await walletsService.reserveHoldingUnits(params.sellerId, params.assetId, params.qty);

    const now = new Date();
    const endTime = new Date(now.getTime() + params.durationMinutes * 60 * 1000);
    const stepSeconds = params.stepSeconds || 15;
    const totalSteps = Math.max(1, Math.floor((params.durationMinutes * 60) / stepSeconds));
    const priceDecrement = (startPriceBig - floorPriceBig) / BigInt(totalSteps) || BigInt(50);

    const auctionId = `AUC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const created = await prisma.auction.create({
      data: {
        id: auctionId,
        assetId: params.assetId,
        sellerId: params.sellerId,
        quantity: params.qty,
        remainingQuantity: params.qty,
        startPrice: startPriceBig,
        floorPrice: floorPriceBig,
        ceilingPrice: asset.ceilingPrice,
        currentPrice: startPriceBig,
        stepSeconds,
        priceDecrement,
        startTime: now,
        endTime,
        status: "ACTIVE",
        isSimSeller: false,
        idempotencyKey: params.idempotencyKey,
      },
      include: { asset: true },
    });

    return serializeAuction(created);
  }

  /**
   * Concurrently-safe Dutch auction acceptance / purchase.
   * Uses atomic database update conditional on status='ACTIVE' to ensure single winner.
   */
  public async buyAuction(params: {
    auctionId: string;
    buyerId: string;
    maxPrice?: number;
  }) {
    const auction = await prisma.auction.findUnique({
      where: { id: params.auctionId },
      include: { asset: true },
    });

    if (!auction) {
      throw new AppError(404, "VALIDATION_FAILED", "Auction not found");
    }

    if (auction.status !== "ACTIVE") {
      if (auction.status === "SOLD") throw new AuctionAlreadySoldError();
      throw new AuctionNotActiveError();
    }

    const now = Date.now();
    if (now > auction.endTime.getTime()) {
      await prisma.auction.update({
        where: { id: auction.id },
        data: { status: "EXPIRED" },
      });
      throw new AuctionNotActiveError("Auction expired");
    }

    // Determine current price deterministically
    const { currentPrice } = calculateCurrentAuctionPrice(auction);
    if (params.maxPrice && currentPrice > params.maxPrice) {
      throw new PriceMovedError();
    }

    // Prevent buying own auction
    if (auction.sellerId === params.buyerId) {
      throw new AppError(400, "SELF_TRADE_PREVENTED", "Cannot purchase your own auction.");
    }

    // Concurrency Lock: Atomic transition from ACTIVE -> SOLD
    const updateResult = await prisma.auction.updateMany({
      where: {
        id: auction.id,
        status: "ACTIVE",
      },
      data: {
        status: "SOLD",
        winnerId: params.buyerId,
        currentPrice: BigInt(currentPrice),
      },
    });

    if (updateResult.count === 0) {
      throw new AuctionAlreadySoldError();
    }

    // Execute atomic settlement
    const settlement = await walletsService.executeAuctionSettlement({
      buyerId: params.buyerId,
      sellerId: auction.sellerId,
      assetId: auction.assetId,
      quantity: auction.quantity,
      price: BigInt(currentPrice),
      auctionId: auction.id,
      isSimSeller: auction.isSimSeller,
    });

    const tradeId = `TRD-AUC-${Date.now().toString(36).toUpperCase()}`;
    const ledgerTxId = `LTX-${Date.now().toString(36).toUpperCase()}`;

    // Record trade
    await prisma.trade.create({
      data: {
        id: tradeId,
        assetId: auction.assetId,
        buyerId: params.buyerId,
        sellerId: auction.sellerId,
        executionPrice: BigInt(currentPrice),
        quantity: auction.quantity,
        totalCost: BigInt(auction.quantity) * BigInt(currentPrice),
        isSim: auction.isSimSeller,
      },
    });

    const updatedAuction = await prisma.auction.findUnique({
      where: { id: auction.id },
      include: { asset: true },
    });

    const receipt = {
      trade_id: tradeId,
      ledger_tx_id: ledgerTxId,
      asset_id: auction.assetId,
      asset_name: auction.asset.name,
      side: "BUY" as const,
      qty: auction.quantity,
      price: currentPrice,
      total_cost: settlement.totalCost,
      counterparty_id: auction.sellerId,
      counterparty_is_sim: auction.isSimSeller,
      matched_at: now,
      settled_at: now,
      balance_before: settlement.balanceBefore,
      balance_after: settlement.balanceAfter,
      settlement_status: "COMPLETED" as const,
    };

    return {
      auction: serializeAuction(updatedAuction!),
      receipt,
    };
  }

  /**
   * Cancels an active auction and releases reserved inventory.
   */
  public async cancelAuction(auctionId: string, sellerId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { asset: true },
    });

    if (!auction) {
      throw new AppError(404, "VALIDATION_FAILED", "Auction not found");
    }

    if (auction.sellerId !== sellerId) {
      throw new AppError(403, "FORBIDDEN", "You do not own this auction");
    }

    if (auction.status !== "ACTIVE") {
      throw new AppError(400, "AUCTION_NOT_ACTIVE", "Cannot cancel an inactive or sold auction");
    }

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: { status: "CANCELLED" },
      include: { asset: true },
    });

    // Release reserved units
    await walletsService.releaseHoldingUnits(sellerId, auction.assetId, auction.quantity);

    return serializeAuction(updated);
  }
}

export const auctionService = new AuctionService();
