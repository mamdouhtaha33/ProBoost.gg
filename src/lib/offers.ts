import { prisma } from "@/lib/prisma";
import type { Offer, OfferCategory, ProductType } from "@prisma/client";

export type OfferWithCategory = Offer & { category: OfferCategory | null };

export function effectivePriceCents(offer: Pick<Offer, "basePriceCents" | "salePriceCents">) {
  if (offer.salePriceCents != null && offer.salePriceCents < offer.basePriceCents) {
    return offer.salePriceCents;
  }
  return offer.basePriceCents;
}

export function discountPercent(offer: Pick<Offer, "basePriceCents" | "salePriceCents">) {
  if (offer.salePriceCents == null || offer.salePriceCents >= offer.basePriceCents) return 0;
  return Math.max(0, Math.round(((offer.basePriceCents - offer.salePriceCents) / offer.basePriceCents) * 100));
}

export async function listPublishedOffers(opts?: {
  gameSlug?: string;
  categoryId?: string;
  productType?: ProductType;
  hot?: boolean;
  popular?: boolean;
  limit?: number;
}) {
  return prisma.offer.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts?.gameSlug ? { gameSlug: opts.gameSlug } : {}),
      ...(opts?.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts?.productType ? { productType: opts.productType } : {}),
      ...(opts?.hot ? { hot: true } : {}),
      ...(opts?.popular ? { popular: true } : {}),
    },
    include: { category: true },
    orderBy: [{ popular: "desc" }, { hot: "desc" }, { ordersCount: "desc" }, { createdAt: "desc" }],
    take: opts?.limit,
  });
}

export async function getOfferBySlug(slug: string) {
  return prisma.offer.findUnique({
    where: { slug },
    include: { category: true },
  });
}

export async function listCategoriesByGame(gameSlug: string) {
  return prisma.offerCategory.findMany({
    where: { gameSlug },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}

export async function searchOffers(q: string, limit = 20) {
  if (!q.trim()) return [];
  return prisma.offer.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { gameSlug: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: [{ popular: "desc" }, { hot: "desc" }],
  });
}
