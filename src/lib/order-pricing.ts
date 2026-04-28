import type { CashbackCategory } from "@prisma/client";
import { evaluateCoupon } from "@/lib/coupons";
import { computeCashbackFor } from "@/lib/cashback";

export type OrderPricingInput = {
  subtotalCents: number;
  gameSlug?: string;
  offerId?: string;
  couponCode?: string;
  walletApplyCents?: number;
  walletBalanceCents?: number;
  userId?: string | null;
  userTotalSpentCents?: number;
  cashbackCategory?: CashbackCategory;
};

export type OrderPricingResult = {
  subtotalCents: number;
  couponDiscountCents: number;
  couponCode?: string;
  couponError?: string;
  walletAppliedCents: number;
  totalCents: number;
  cashbackEarnedCents: number;
  cashbackPercentBasis100: number;
  cashbackTier: string;
};

export async function computeOrderPricing(input: OrderPricingInput): Promise<OrderPricingResult> {
  const subtotal = Math.max(0, Math.floor(input.subtotalCents));
  let couponDiscount = 0;
  let couponCode: string | undefined;
  let couponError: string | undefined;
  if (input.couponCode && input.couponCode.trim()) {
    const result = await evaluateCoupon({
      code: input.couponCode,
      userId: input.userId,
      orderSubtotalCents: subtotal,
      gameSlug: input.gameSlug,
      offerId: input.offerId,
    });
    if (result.ok) {
      couponDiscount = result.discountCents;
      couponCode = result.coupon.code;
    } else {
      couponError = result.reason;
    }
  }
  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  const walletAvailable = Math.max(0, input.walletBalanceCents ?? 0);
  const walletRequested = Math.max(0, Math.floor(input.walletApplyCents ?? 0));
  const walletApplied = Math.min(walletAvailable, walletRequested, afterCoupon);
  const total = Math.max(0, afterCoupon - walletApplied);

  const cashback = await computeCashbackFor({
    userTotalSpentCents: input.userTotalSpentCents ?? 0,
    category: input.cashbackCategory ?? "BOOSTING",
    amountCents: total,
  });

  return {
    subtotalCents: subtotal,
    couponDiscountCents: couponDiscount,
    couponCode,
    couponError,
    walletAppliedCents: walletApplied,
    totalCents: total,
    cashbackEarnedCents: cashback.cashbackCents,
    cashbackPercentBasis100: cashback.percentBasis100,
    cashbackTier: cashback.tierName,
  };
}
