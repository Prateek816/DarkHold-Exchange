import { prisma } from "@/config/db";
import { walletsService } from "@/modules/wallets/wallets.service";

export class SettlementWorker {
  private isRunning: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private batchSize: number = 50;

  constructor(options?: { batchSize?: number }) {
    if (options?.batchSize) this.batchSize = options.batchSize;
  }

  public start(intervalMs: number = 25): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.loopInterval = setInterval(async () => {
      if (!this.isProcessing && this.isRunning) {
        await this.processPendingTrades();
      }
    }, intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  public async processPendingTrades(): Promise<number> {
    this.isProcessing = true;
    try {
      const pendingTrades = await prisma.trade.findMany({
        where: { state: "PENDING_SETTLEMENT" },
        orderBy: { matchedAt: "asc" },
        take: this.batchSize,
      });

      if (pendingTrades.length === 0) {
        return 0;
      }

      let settledCount = 0;

      // Process each trade individually to isolate potential poison trades
      for (const trade of pendingTrades) {
        try {
          await this.settleSingleTrade(trade.id);
          settledCount++;
        } catch (err: any) {
          console.error(`[SettlementWorker] Failed to settle trade ${trade.id}:`, err.message);
          const attempts = (trade.settleAttempts || 0) + 1;
          const newState = attempts >= 5 ? "SETTLEMENT_FAILED" : "PENDING_SETTLEMENT";

          await prisma.trade.update({
            where: { id: trade.id },
            data: {
              settleAttempts: attempts,
              lastError: err.message,
              state: newState,
            },
          });
        }
      }

      return settledCount;
    } finally {
      this.isProcessing = false;
    }
  }

  public async settleSingleTrade(tradeId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({
        where: { id: tradeId },
        include: {
          buyOrder: true,
          sellOrder: true,
        },
      });

      if (!trade || trade.state === "SETTLED") {
        return;
      }

      const executionPrice = trade.executionPrice;
      const quantity = trade.quantity;
      const totalCost = BigInt(quantity) * executionPrice;

      // Buyer reservation price
      const reservedUnitCost = trade.buyOrder ? trade.buyOrder.price : executionPrice;

      // Settle trade using atomic ledger and wallet balances
      await walletsService.settleTradeExecution({
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        assetId: trade.assetId,
        quantity,
        executionPrice,
        reservedUnitCost,
        tradeId: trade.id,
        isSimSeller: trade.sellerId.startsWith("sim_") || trade.isSim,
        tx,
      });

      // Update trade state
      await tx.trade.update({
        where: { id: trade.id },
        data: {
          state: "SETTLED",
          settledAt: new Date(),
        },
      });

      // Update order settlement statuses if completely filled
      if (trade.buyOrder && trade.buyOrder.matchedQuantity >= trade.buyOrder.originalQuantity) {
        await tx.order.update({
          where: { id: trade.buyOrder.id },
          data: { settlementStatus: "COMPLETED" },
        });
      }

      if (trade.sellOrder && trade.sellOrder.matchedQuantity >= trade.sellOrder.originalQuantity) {
        await tx.order.update({
          where: { id: trade.sellOrder.id },
          data: { settlementStatus: "COMPLETED" },
        });
      }
    });
  }
}

export const settlementWorker = new SettlementWorker();
