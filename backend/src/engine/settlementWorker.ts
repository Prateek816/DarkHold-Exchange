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
      if (trade.buyOrderId) {
        const buyOrder = await tx.order.findUnique({ where: { id: trade.buyOrderId } });
        if (buyOrder && (buyOrder.matchedQuantity >= buyOrder.originalQuantity || buyOrder.remainingQuantity <= 0)) {
          await tx.order.update({
            where: { id: buyOrder.id },
            data: { settlementStatus: "COMPLETED", status: "FILLED" },
          });
        }
      }

      if (trade.sellOrderId) {
        const sellOrder = await tx.order.findUnique({ where: { id: trade.sellOrderId } });
        if (sellOrder && (sellOrder.matchedQuantity >= sellOrder.originalQuantity || sellOrder.remainingQuantity <= 0)) {
          await tx.order.update({
            where: { id: sellOrder.id },
            data: { settlementStatus: "COMPLETED", status: "FILLED" },
          });
        }
      }
    }, { maxWait: 15000, timeout: 30000 });

    // Notify users over wsGateway about settlement completion
    try {
      const settledTrade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });
      if (settledTrade) {
        const { wsGateway } = await import("@/market/wsGateway");
        const ledgerTxId = `LTX-${settledTrade.id.replace("TRD-", "")}`;

        if (settledTrade.buyOrderId && !settledTrade.buyerId.startsWith("sim_")) {
          wsGateway.notifyUser(settledTrade.buyerId, {
            type: "SettlementCompleted",
            channel: `user:${settledTrade.buyerId}`,
            data: {
              order_id: settledTrade.buyOrderId,
              trade_id: settledTrade.id,
              settlement_status: "COMPLETED",
              status: "FILLED",
              ledger_tx_id: ledgerTxId,
            },
            ts: Date.now(),
          });
        }

        if (settledTrade.sellOrderId && !settledTrade.sellerId.startsWith("sim_")) {
          wsGateway.notifyUser(settledTrade.sellerId, {
            type: "SettlementCompleted",
            channel: `user:${settledTrade.sellerId}`,
            data: {
              order_id: settledTrade.sellOrderId,
              trade_id: settledTrade.id,
              settlement_status: "COMPLETED",
              status: "FILLED",
              ledger_tx_id: ledgerTxId,
            },
            ts: Date.now(),
          });
        }
      }
    } catch (wsErr) {
      // Non-fatal broadcast error
    }
  }
}

export const settlementWorker = new SettlementWorker();
