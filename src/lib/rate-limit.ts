import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!existing || existing.resetAt.getTime() <= now.getTime()) {
    const resetAt = new Date(now.getTime() + windowMs);
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return {
    allowed: true,
    remaining: Math.max(0, limit - updated.count),
    resetAt: updated.resetAt,
  };
}

export async function purgeExpired(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date() } },
  });
}
