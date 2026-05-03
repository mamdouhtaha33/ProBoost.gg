import { prisma } from "@/lib/prisma";

export const COUNTER_KEYS = {
  prosOnline: "prosOnline",
  completedOrders: "completedOrders",
  happyCustomers: "happyCustomers",
} as const;

export type CounterKey = (typeof COUNTER_KEYS)[keyof typeof COUNTER_KEYS];

const DEFAULTS: Record<CounterKey, number> = {
  prosOnline: 12,
  completedOrders: 1842,
  happyCustomers: 743,
};

export async function getCounters(): Promise<Record<CounterKey, number>> {
  const rows = await prisma.siteCounter.findMany();
  const map: Record<string, number> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    prosOnline: map.prosOnline ?? DEFAULTS.prosOnline,
    completedOrders: map.completedOrders ?? DEFAULTS.completedOrders,
    happyCustomers: map.happyCustomers ?? DEFAULTS.happyCustomers,
  };
}

export async function setCounter(key: CounterKey, value: number) {
  await prisma.siteCounter.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function bumpCounter(key: CounterKey, delta = 1) {
  await prisma.siteCounter.upsert({
    where: { key },
    create: { key, value: DEFAULTS[key] + delta },
    update: { value: { increment: delta } },
  });
}
