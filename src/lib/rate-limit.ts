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
  const newResetAt = new Date(now.getTime() + windowMs);

  const expiredOrIncrementedRows = await prisma.rateLimitBucket.updateMany({
    where: { key, resetAt: { lte: now } },
    data: { count: 1, resetAt: newResetAt },
  });

  if (expiredOrIncrementedRows.count > 0) {
    return { allowed: true, remaining: limit - 1, resetAt: newResetAt };
  }

  const incrementedRows = await prisma.rateLimitBucket.updateMany({
    where: {
      key,
      resetAt: { gt: now },
      count: { lt: limit },
    },
    data: { count: { increment: 1 } },
  });

  if (incrementedRows.count > 0) {
    const updated = await prisma.rateLimitBucket.findUnique({ where: { key } });
    return {
      allowed: true,
      remaining: Math.max(0, limit - (updated?.count ?? limit)),
      resetAt: updated?.resetAt ?? newResetAt,
    };
  }

  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!existing) {
    try {
      await prisma.rateLimitBucket.create({
        data: { key, count: 1, resetAt: newResetAt },
      });
      return { allowed: true, remaining: limit - 1, resetAt: newResetAt };
    } catch {
      const re = await prisma.rateLimitBucket.findUnique({ where: { key } });
      return {
        allowed: re ? re.count < limit : false,
        remaining: re ? Math.max(0, limit - re.count) : 0,
        resetAt: re?.resetAt ?? newResetAt,
      };
    }
  }

  return { allowed: false, remaining: 0, resetAt: existing.resetAt };
}

export async function purgeExpired(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date() } },
  });
}
