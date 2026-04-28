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
  const user = await tx.user.findUnique({
    where: { id: opts.userId },
    select: { walletCreditCents: true },
  });
  if (!user) throw new Error("User not found");
  const newBalance = user.walletCreditCents + opts.amountCents;
  if (newBalance < 0) throw new Error("Insufficient wallet balance");

  await tx.user.update({
    where: { id: opts.userId },
    data: { walletCreditCents: newBalance },
  });
  return tx.walletEntry.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      amountCents: opts.amountCents,
      balanceAfterCents: newBalance,
      orderId: opts.orderId ?? null,
      description: opts.description,
      metadata: opts.metadata,
    },
  });
}
