import { Prisma, LedgerEntryType } from "@prisma/client";
import { prisma } from "@/config/db";

export interface CreateLedgerEntryParams {
  walletId: string;
  referenceId: string;
  entryType: LedgerEntryType;
  amount: bigint;
  balanceBefore: bigint;
  balanceAfter: bigint;
  description: string;
}

export class LedgerService {
  public async recordEntry(
    params: CreateLedgerEntryParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return client.ledgerEntry.create({
      data: {
        walletId: params.walletId,
        referenceId: params.referenceId,
        entryType: params.entryType,
        amount: params.amount,
        balanceBefore: params.balanceBefore,
        balanceAfter: params.balanceAfter,
        description: params.description,
      },
    });
  }

  public async getEntriesForWallet(walletId: string, limit: number = 50) {
    return prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const ledgerService = new LedgerService();
