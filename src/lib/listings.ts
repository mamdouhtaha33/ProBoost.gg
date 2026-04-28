import { prisma } from "@/lib/prisma";

export async function listAccountListings(opts?: { gameSlug?: string; sellerId?: string; limit?: number }) {
  return prisma.accountListing.findMany({
    where: {
      status: "AVAILABLE",
      ...(opts?.gameSlug ? { gameSlug: opts.gameSlug } : {}),
      ...(opts?.sellerId ? { sellerId: opts.sellerId } : {}),
    },
    include: { seller: { select: { handle: true, name: true, proRank: true, proVerified: true } } },
    orderBy: [{ createdAt: "desc" }],
    take: opts?.limit,
  });
}

export async function getAccountListing(id: string) {
  return prisma.accountListing.findUnique({
    where: { id },
    include: { seller: { select: { handle: true, name: true, proRank: true, proVerified: true } } },
  });
}

export async function listCurrencyListings(opts?: { gameSlug?: string; sellerId?: string; limit?: number }) {
  return prisma.currencyListing.findMany({
    where: {
      status: "AVAILABLE",
      ...(opts?.gameSlug ? { gameSlug: opts.gameSlug } : {}),
      ...(opts?.sellerId ? { sellerId: opts.sellerId } : {}),
    },
    include: { seller: { select: { handle: true, name: true, proRank: true, proVerified: true } } },
    orderBy: [{ pricePerUnitCents: "asc" }],
    take: opts?.limit,
  });
}

export async function getCurrencyListing(id: string) {
  return prisma.currencyListing.findUnique({
    where: { id },
    include: { seller: { select: { handle: true, name: true, proRank: true, proVerified: true } } },
  });
}
