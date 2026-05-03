import { prisma } from "@/lib/prisma";
import type { Prisma, WalletEntryKind } from "@prisma/client";

export async function getWalletBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { walletCreditCents: true } });
  return u?.walletCreditCents ?? 0;
}

export async function listWalletEntries(userId: string, take = 50) {
  return prisma.walletEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function appendWalletEntry(
  tx: Prisma.TransactionClient,
  opts: {
    userId: string;
    kind: WalletEntryKind;
    amountCents: number;
    orderId?: string | null;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  // Atomic update at the DB level so concurrent transactions cannot lose
  // updates. Debits (amountCents < 0) include a guard that keeps the balance
  // non-negative; if the user lacks funds, updateMany returns count=0 and we
  // throw "Insufficient wallet balance".
  if (opts.amountCents < 0) {
    const required = -opts.amountCents;
    const updated = await tx.user.updateMany({
      where: { id: opts.userId, walletCreditCents: { gte: required } },
      data: { walletCreditCents: { increment: opts.amountCents } },
    });
    if (updated.count === 0) {
      const exists = await tx.user.findUnique({
        where: { id: opts.userId },
        select: { id: true },
      });
      if (!exists) throw new Error("User not found");
      throw new Error("Insufficient wallet balance");
    }
  } else {
    const updated = await tx.user.updateMany({
      where: { id: opts.userId },
      data: { walletCreditCents: { increment: opts.amountCents } },
    });
    if (updated.count === 0) throw new Error("User not found");
  }

  const after = await tx.user.findUnique({
    where: { id: opts.userId },
    select: { walletCreditCents: true },
  });
  const balanceAfterCents = after?.walletCreditCents ?? 0;

  return tx.walletEntry.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      amountCents: opts.amountCents,
      balanceAfterCents,
      orderId: opts.orderId ?? null,
      description: opts.description,
      metadata: opts.metadata,
    },
  });
}
