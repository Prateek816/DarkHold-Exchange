import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { engineClient } from "./engineClient";
import { walletsService } from "@/modules/wallets/wallets.service";

export class OrderResolver {
  private isRunning: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private isResolving: boolean = false;
  private staleMs: number;

  constructor(options?: { staleMs?: number }) {
    this.staleMs = options?.staleMs || env.RESOLVER_STALE_MS;
  }

  public start(intervalMs: number = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.loopInterval = setInterval(async () => {
      if (!this.isResolving && this.isRunning) {
        await this.resolvePendingOrders();
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

  public async resolvePendingOrders(): Promise<number> {
    this.isResolving = true;
    try {
      const staleCutoff = new Date(Date.now() - this.staleMs);

      const staleOrders = await prisma.order.findMany({
        where: {
          status: "PENDING_SUBMIT",
          createdAt: { lt: staleCutoff },
        },
        include: { asset: true },
        take: 50,
      });

      if (staleOrders.length === 0) return 0;

      let resolvedCount = 0;

      for (const order of staleOrders) {
        try {
          // 1. Check if engine already has an outcome for this order
          try {
            const outcome = await engineClient.getOrder(order.id);
            if (outcome) {
              if (outcome.status === "OPEN" || outcome.status === "PARTIALLY_FILLED" || outcome.status === "FILLED") {
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    status: outcome.status,
                    matchedQuantity: outcome.filled_qty,
                    remainingQuantity: outcome.remaining_qty,
                  },
                });
                resolvedCount++;
                continue;
              } else if (outcome.status === "REJECTED") {
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    status: "REJECTED",
                    rejectCode: outcome.reject_code,
                  },
                });
                if (order.side === "BUY") {
                  await walletsService.releaseOrderFunds(order.userId, order.id, order.reservedAmount);
                } else {
                  await walletsService.releaseHoldingUnits(order.userId, order.assetId, order.reservedUnits);
                }
                resolvedCount++;
                continue;
              }
            }
          } catch (err: any) {
            // If 404, order was not recorded by engine; proceed to resubmit
          }

          // 2. Resubmit with identical payload and order ID
          const reply = await engineClient.sendCommand({
            type: "SubmitOrder",
            order_id: order.id,
            asset: order.asset.symbol,
            user_id: order.userId,
            side: order.side,
            order_type: order.type,
            tif: order.type === "MARKET" ? "IOC" : "GTC",
            qty: order.originalQuantity,
            price: Number(order.price),
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              submitAttempts: { increment: 1 },
              submittedAt: new Date(),
              engineSeq: reply.seq ? BigInt(reply.seq) : undefined,
              engineEpoch: reply.engine_epoch,
            },
          });

          if (reply.status === "REJECTED") {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "REJECTED",
                rejectCode: reply.code,
              },
            });
            if (order.side === "BUY") {
              await walletsService.releaseOrderFunds(order.userId, order.id, order.reservedAmount);
            } else {
              await walletsService.releaseHoldingUnits(order.userId, order.assetId, order.reservedUnits);
            }
          }

          resolvedCount++;
        } catch (err: any) {
          console.warn(`[OrderResolver] Could not resolve order ${order.id}:`, err.message);
        }
      }

      return resolvedCount;
    } finally {
      this.isResolving = false;
    }
  }
}

export const orderResolver = new OrderResolver();
