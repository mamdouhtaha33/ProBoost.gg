import { prisma } from "@/lib/prisma";
import type { CashbackCategory } from "@prisma/client";

export const DEFAULT_TIERS: Record<CashbackCategory, Array<{ name: string; thresholdCents: number; percentBasis100: number }>> = {
  BOOSTING: [
    { name: "Bronze", thresholdCents: 0, percentBasis100: 500 },
    { name: "Silver", thresholdCents: 50_000, percentBasis100: 800 },
    { name: "Gold", thresholdCents: 200_000, percentBasis100: 1200 },
    { name: "Platinum", thresholdCents: 500_000, percentBasis100: 1700 },
    { name: "Diamond", thresholdCents: 1_000_000, percentBasis100: 2000 },
  ],
  CURRENCY_ACCOUNT: [
    { name: "Bronze", thresholdCents: 0, percentBasis100: 100 },
    { name: "Silver", thresholdCents: 50_000, percentBasis100: 200 },
    { name: "Gold", thresholdCents: 200_000, percentBasis100: 300 },
    { name: "Platinum", thresholdCents: 1_000_000, percentBasis100: 400 },
  ],
};

export async function getCashbackTiersFor(category: CashbackCategory) {
  const tiers = await prisma.cashbackTier.findMany({
    where: { category, active: true },
    orderBy: { thresholdCents: "asc" },
  });
  if (tiers.length > 0) return tiers;
  return DEFAULT_TIERS[category].map((t, i) => ({
    id: `default-${category}-${i}`,
    category,
    name: t.name,
    thresholdCents: t.thresholdCents,
    percentBasis100: t.percentBasis100,
    active: true,
    displayOrder: i * 100,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}

export async function computeCashbackFor(opts: {
  userTotalSpentCents: number;
  category: CashbackCategory;
  amountCents: number;
}): Promise<{ percentBasis100: number; cashbackCents: number; tierName: string }> {
  const tiers = await getCashbackTiersFor(opts.category);
  const sorted = [...tiers].sort((a, b) => a.thresholdCents - b.thresholdCents);
  let chosen = sorted[0];
  for (const t of sorted) {
    if (opts.userTotalSpentCents >= t.thresholdCents) chosen = t;
  }
  const cashbackCents = Math.floor((opts.amountCents * chosen.percentBasis100) / 10_000);
  return { percentBasis100: chosen.percentBasis100, cashbackCents, tierName: chosen.name };
}
