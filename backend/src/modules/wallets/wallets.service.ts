import { Prisma, Wallet, WalletHolding, Asset, LedgerEntryType } from "@prisma/client";
import { prisma } from "@/config/db";
import { InsufficientFundsError, InsufficientHoldingsError } from "@/utils/errors";
import { ledgerService } from "@/modules/ledger/ledger.service";

export class WalletsService {
  /**
   * Retrieves or initializes a wallet for a given user.
   */
  public async getOrCreateWallet(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    let wallet = await client.wallet.findUnique({
      where: { userId },
      include: {
        holdings: {
          include: { asset: true },
        },
      },
    });

    if (!wallet) {
      wallet = await client.wallet.create({
        data: {
          userId,
          availableBalance: BigInt(500000), // $5,000.00 default credit
          reservedBalance: BigInt(0),
          totalBalance: BigInt(500000),
        },
        include: {
          holdings: {
            include: { asset: true },
          },
        },
      });

      await ledgerService.recordEntry(
        {
          walletId: wallet.id,
          referenceId: `INIT-${wallet.id}`,
          entryType: "INITIAL_CREDIT",
          amount: BigInt(500000),
          balanceBefore: BigInt(0),
          balanceAfter: BigInt(500000),
          description: "Initial demo deposit",
        },
        client
      );
    }

    return wallet;
  }

  /**
   * Reserves funds for a BUY order atomically.
   */
  public async reserveOrderFunds(
    userId: string,
    orderId: string,
    amount: bigint,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const wallet = await this.getOrCreateWallet(userId, client);

    if (wallet.availableBalance < amount) {
      throw new InsufficientFundsError(Number(amount), Number(wallet.availableBalance));
    }

    const updated = await client.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: amount },
        reservedBalance: { increment: amount },
      },
    });

    await ledgerService.recordEntry(
      {
        walletId: wallet.id,
        referenceId: orderId,
        entryType: "ORDER_RESERVE",
        amount: -amount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: updated.availableBalance,
        description: `Reserved funds for buy order ${orderId}`,
      },
      client
    );

    return updated;
  }

  /**
   * Releases reserved funds back to available balance (e.g. on order cancellation).
   */
  public async releaseOrderFunds(
    userId: string,
    orderId: string,
    amount: bigint,
    tx?: Prisma.TransactionClient
  ) {
    if (amount <= BigInt(0)) return;
    const client = tx || prisma;
    const wallet = await this.getOrCreateWallet(userId, client);

    const releaseAmount = amount > wallet.reservedBalance ? wallet.reservedBalance : amount;

    const updated = await client.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: releaseAmount },
        reservedBalance: { decrement: releaseAmount },
      },
    });

    await ledgerService.recordEntry(
      {
        walletId: wallet.id,
        referenceId: orderId,
        entryType: "ORDER_RELEASE",
        amount: releaseAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: updated.availableBalance,
        description: `Released reserved funds from order ${orderId}`,
      },
      client
    );

    return updated;
  }

  /**
   * Reserves asset inventory units for a SELL order or auction.
   */
  public async reserveHoldingUnits(
    userId: string,
    assetId: string,
    qty: number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const wallet = await this.getOrCreateWallet(userId, client);

    const holding = await client.walletHolding.findUnique({
      where: {
        walletId_assetId: {
          walletId: wallet.id,
          assetId,
        },
      },
    });

    if (!holding || holding.availableUnits < qty) {
      throw new InsufficientHoldingsError(holding ? holding.availableUnits : 0);
    }

    return client.walletHolding.update({
      where: { id: holding.id },
      data: {
        availableUnits: { decrement: qty },
        reservedUnits: { increment: qty },
      },
    });
  }

  /**
   * Releases reserved asset inventory units back to available.
   */
  public async releaseHoldingUnits(
    userId: string,
    assetId: string,
    qty: number,
    tx?: Prisma.TransactionClient
  ) {
    if (qty <= 0) return;
    const client = tx || prisma;
    const wallet = await this.getOrCreateWallet(userId, client);

    const holding = await client.walletHolding.findUnique({
      where: {
        walletId_assetId: {
          walletId: wallet.id,
          assetId,
        },
      },
    });

    if (!holding) return;

    const releaseQty = qty > holding.reservedUnits ? holding.reservedUnits : qty;

    return client.walletHolding.update({
      where: { id: holding.id },
      data: {
        availableUnits: { increment: releaseQty },
        reservedUnits: { decrement: releaseQty },
      },
    });
  }

  /**
   * Settles trade execution atomically between buyer and seller.
   */
  public async settleTradeExecution(params: {
    buyerId: string;
    sellerId: string;
    assetId: string;
    quantity: number;
    executionPrice: bigint;
    reservedUnitCost: bigint; // Unit cost that was originally reserved
    tradeId: string;
    isSimSeller?: boolean;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params.tx || prisma;
    const totalCost = BigInt(params.quantity) * params.executionPrice;
    const totalReservedForMatch = BigInt(params.quantity) * params.reservedUnitCost;

    // 1. Buyer Settlement
    const buyerWallet = await this.getOrCreateWallet(params.buyerId, client);
    const buyerBalanceBefore = buyerWallet.availableBalance;

    // Reservation release & final cost deduction:
    // Reserved balance decreases by totalReservedForMatch.
    // Total balance decreases by totalCost.
    // If reservedUnitCost > executionPrice, buyer saved money: that difference returns to availableBalance!
    const excessRefund =
      totalReservedForMatch > totalCost ? totalReservedForMatch - totalCost : BigInt(0);

    const updatedBuyerWallet = await client.wallet.update({
      where: { id: buyerWallet.id },
      data: {
        reservedBalance: { decrement: totalReservedForMatch },
        totalBalance: { decrement: totalCost },
        availableBalance: { increment: excessRefund },
      },
    });

    await ledgerService.recordEntry(
      {
        walletId: buyerWallet.id,
        referenceId: params.tradeId,
        entryType: "ORDER_SETTLEMENT",
        amount: -totalCost,
        balanceBefore: buyerBalanceBefore,
        balanceAfter: updatedBuyerWallet.availableBalance,
        description: `Settlement for trade ${params.tradeId} (${params.quantity}x @ ${params.executionPrice})`,
      },
      client
    );

    // Credit buyer holding
    const buyerHolding = await client.walletHolding.findUnique({
      where: {
        walletId_assetId: {
          walletId: buyerWallet.id,
          assetId: params.assetId,
        },
      },
    });

    if (buyerHolding) {
      const prevTotal = BigInt(buyerHolding.totalUnits);
      const newTotal = prevTotal + BigInt(params.quantity);
      const newAvgCost =
        newTotal > BigInt(0)
          ? (prevTotal * buyerHolding.avgCost + totalCost) / newTotal
          : params.executionPrice;

      await client.walletHolding.update({
        where: { id: buyerHolding.id },
        data: {
          availableUnits: { increment: params.quantity },
          totalUnits: { increment: params.quantity },
          avgCost: newAvgCost,
        },
      });
    } else {
      await client.walletHolding.create({
        data: {
          walletId: buyerWallet.id,
          assetId: params.assetId,
          availableUnits: params.quantity,
          reservedUnits: 0,
          totalUnits: params.quantity,
          avgCost: params.executionPrice,
        },
      });
    }

    // 2. Seller Settlement (if real user, not sim)
    if (!params.isSimSeller && params.sellerId !== params.buyerId) {
      const sellerWallet = await this.getOrCreateWallet(params.sellerId, client);
      const sellerBalanceBefore = sellerWallet.availableBalance;

      const updatedSellerWallet = await client.wallet.update({
        where: { id: sellerWallet.id },
        data: {
          availableBalance: { increment: totalCost },
          totalBalance: { increment: totalCost },
        },
      });

      await ledgerService.recordEntry(
        {
          walletId: sellerWallet.id,
          referenceId: params.tradeId,
          entryType: "ORDER_SETTLEMENT",
          amount: totalCost,
          balanceBefore: sellerBalanceBefore,
          balanceAfter: updatedSellerWallet.availableBalance,
          description: `Proceeds from trade ${params.tradeId} (${params.quantity}x @ ${params.executionPrice})`,
        },
        client
      );

      // Deduct reserved units from seller holding
      const sellerHolding = await client.walletHolding.findUnique({
        where: {
          walletId_assetId: {
            walletId: sellerWallet.id,
            assetId: params.assetId,
          },
        },
      });

      if (sellerHolding) {
        await client.walletHolding.update({
          where: { id: sellerHolding.id },
          data: {
            reservedUnits: { decrement: params.quantity },
            totalUnits: { decrement: params.quantity },
          },
        });
      }
    }

    return {
      balanceBefore: Number(buyerBalanceBefore),
      balanceAfter: Number(updatedBuyerWallet.availableBalance),
      totalCost: Number(totalCost),
    };
  }

  /**
   * Settles Dutch Auction acceptance atomically.
   */
  public async executeAuctionSettlement(params: {
    buyerId: string;
    sellerId: string;
    assetId: string;
    quantity: number;
    price: bigint;
    auctionId: string;
    isSimSeller: boolean;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params.tx || prisma;
    const totalCost = BigInt(params.quantity) * params.price;

    // 1. Buyer: Check and deduct available balance
    const buyerWallet = await this.getOrCreateWallet(params.buyerId, client);
    if (buyerWallet.availableBalance < totalCost) {
      throw new InsufficientFundsError(Number(totalCost), Number(buyerWallet.availableBalance));
    }

    const buyerBalanceBefore = buyerWallet.availableBalance;
    const updatedBuyerWallet = await client.wallet.update({
      where: { id: buyerWallet.id },
      data: {
        availableBalance: { decrement: totalCost },
        totalBalance: { decrement: totalCost },
      },
    });

    await ledgerService.recordEntry(
      {
        walletId: buyerWallet.id,
        referenceId: params.auctionId,
        entryType: "AUCTION_PAYMENT",
        amount: -totalCost,
        balanceBefore: buyerBalanceBefore,
        balanceAfter: updatedBuyerWallet.availableBalance,
        description: `Purchased Dutch auction ${params.auctionId} (${params.quantity}x @ ${params.price})`,
      },
      client
    );

    // Credit buyer holding
    const buyerHolding = await client.walletHolding.findUnique({
      where: {
        walletId_assetId: {
          walletId: buyerWallet.id,
          assetId: params.assetId,
        },
      },
    });

    if (buyerHolding) {
      const prevTotal = BigInt(buyerHolding.totalUnits);
      const newTotal = prevTotal + BigInt(params.quantity);
      const newAvgCost =
        newTotal > BigInt(0)
          ? (prevTotal * buyerHolding.avgCost + totalCost) / newTotal
          : params.price;

      await client.walletHolding.update({
        where: { id: buyerHolding.id },
        data: {
          availableUnits: { increment: params.quantity },
          totalUnits: { increment: params.quantity },
          avgCost: newAvgCost,
        },
      });
    } else {
      await client.walletHolding.create({
        data: {
          walletId: buyerWallet.id,
          assetId: params.assetId,
          availableUnits: params.quantity,
          reservedUnits: 0,
          totalUnits: params.quantity,
          avgCost: params.price,
        },
      });
    }

    // 2. Seller: If real user, credit funds and deduct holding
    if (!params.isSimSeller && params.sellerId !== params.buyerId) {
      const sellerWallet = await this.getOrCreateWallet(params.sellerId, client);
      const sellerBalanceBefore = sellerWallet.availableBalance;

      const updatedSellerWallet = await client.wallet.update({
        where: { id: sellerWallet.id },
        data: {
          availableBalance: { increment: totalCost },
          totalBalance: { increment: totalCost },
        },
      });

      await ledgerService.recordEntry(
        {
          walletId: sellerWallet.id,
          referenceId: params.auctionId,
          entryType: "AUCTION_PROCEEDS",
          amount: totalCost,
          balanceBefore: sellerBalanceBefore,
          balanceAfter: updatedSellerWallet.availableBalance,
          description: `Proceeds from Dutch auction ${params.auctionId} (${params.quantity}x @ ${params.price})`,
        },
        client
      );

      const sellerHolding = await client.walletHolding.findUnique({
        where: {
          walletId_assetId: {
            walletId: sellerWallet.id,
            assetId: params.assetId,
          },
        },
      });

      if (sellerHolding) {
        await client.walletHolding.update({
          where: { id: sellerHolding.id },
          data: {
            reservedUnits: { decrement: params.quantity },
            totalUnits: { decrement: params.quantity },
          },
        });
      }
    }

    return {
      balanceBefore: Number(buyerBalanceBefore),
      balanceAfter: Number(updatedBuyerWallet.availableBalance),
      totalCost: Number(totalCost),
    };
  }
}

export const walletsService = new WalletsService();
