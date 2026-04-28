import { prisma } from "@/lib/prisma";
import type { Coupon, Prisma } from "@prisma/client";

export type CouponEvalResult =
  | { ok: true; coupon: Coupon; discountCents: number }
  | { ok: false; reason: string };

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function evaluateCoupon(
  opts: {
    code: string;
    userId?: string | null;
    orderSubtotalCents: number;
    gameSlug?: string;
    offerId?: string;
  },
  client: DbClient = prisma,
): Promise<CouponEvalResult> {
  const code = opts.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a code." };
  const coupon = await client.coupon.findUnique({ where: { code } });
  if (!coupon) return { ok: false, reason: "Coupon not found." };
  const now = new Date();
  if (coupon.status !== "ACTIVE") return { ok: false, reason: "Coupon is not active." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: "Coupon not started yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: "Coupon expired." };
  if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses)
    return { ok: false, reason: "Coupon usage limit reached." };
  if (opts.orderSubtotalCents < coupon.minOrderCents)
    return { ok: false, reason: `Order subtotal must be at least $${(coupon.minOrderCents / 100).toFixed(2)}.` };
  if (coupon.scope === "GAME" && coupon.scopeRefId && opts.gameSlug && coupon.scopeRefId !== opts.gameSlug) {
    return { ok: false, reason: "Coupon not valid for this game." };
  }
  if (coupon.scope === "OFFER" && coupon.scopeRefId && opts.offerId && coupon.scopeRefId !== opts.offerId) {
    return { ok: false, reason: "Coupon not valid for this offer." };
  }
  if (coupon.scope === "USER" && coupon.scopeRefId && opts.userId && coupon.scopeRefId !== opts.userId) {
    return { ok: false, reason: "Coupon not valid for your account." };
  }
  if (opts.userId && coupon.perUserLimit > 0) {
    const used = await client.couponRedemption.count({
      where: { couponId: coupon.id, userId: opts.userId },
    });
    if (used >= coupon.perUserLimit) {
      return { ok: false, reason: "You've already used this coupon." };
    }
  }
  let discount = 0;
  if (coupon.type === "PERCENT" && coupon.valuePercent) {
    discount = Math.floor((opts.orderSubtotalCents * coupon.valuePercent) / 100);
  } else if (coupon.type === "FIXED" && coupon.valueCents) {
    discount = coupon.valueCents;
  }
  discount = Math.min(discount, opts.orderSubtotalCents);
  if (discount <= 0) return { ok: false, reason: "Coupon does not apply." };
  return { ok: true, coupon, discountCents: discount };
}

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function recordCouponRedemption(opts: {
  couponId: string;
  userId: string;
  orderId: string;
  amountAppliedCents: number;
}) {
  await prisma.$transaction([
    prisma.couponRedemption.create({ data: opts }),
    prisma.coupon.update({
      where: { id: opts.couponId },
      data: { usesCount: { increment: 1 } },
    }),
  ]);
}
