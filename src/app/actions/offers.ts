"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivityNow } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";
import { computeOrderPricing } from "@/lib/order-pricing";
import { recordCouponRedemption } from "@/lib/coupons";
import { appendWalletEntry } from "@/lib/wallet";
import { effectivePriceCents } from "@/lib/offers";
import type { CashbackCategory, ProductType } from "@prisma/client";

export type BuyOfferState = {
  ok: boolean;
  error?: string;
  orderId?: string;
};

function categoryFor(productType: ProductType): CashbackCategory {
  return productType === "BOOSTING" ? "BOOSTING" : "CURRENCY_ACCOUNT";
}

export async function buyOffer(_prev: BuyOfferState | undefined, formData: FormData): Promise<BuyOfferState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in." };

  const offerId = String(formData.get("offerId") ?? "");
  if (!offerId) return { ok: false, error: "Missing offer." };

  const rl = await rateLimit(`buyOffer:${session.user.id}`, 10, 60);
  if (!rl.allowed) return { ok: false, error: "Too many orders — slow down." };

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "PUBLISHED") return { ok: false, error: "Offer unavailable." };

  const deliveryMode = (formData.get("deliveryMode") || offer.deliveryMode) as
    | "PILOTED"
    | "SELF_PLAY"
    | "BOTH";
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const walletApplyCents = Math.max(0, Number.parseInt(String(formData.get("walletApplyCents") ?? "0"), 10) || 0);

  const subtotal = effectivePriceCents(offer);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletCreditCents: true, totalSpentCents: true },
  });
  if (!user) return { ok: false, error: "User not found." };

  const pricing = await computeOrderPricing({
    subtotalCents: subtotal,
    gameSlug: offer.gameSlug,
    offerId: offer.id,
    couponCode: couponCode || undefined,
    walletApplyCents,
    walletBalanceCents: user.walletCreditCents,
    userId: session.user.id,
    userTotalSpentCents: user.totalSpentCents,
    cashbackCategory: categoryFor(offer.productType),
  });

  if (couponCode && pricing.couponError) {
    return { ok: false, error: pricing.couponError };
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: session.user!.id!,
        title: offer.title,
        description: offer.summary ?? offer.title,
        service: offer.service,
        game: offer.gameSlug,
        gameSlug: offer.gameSlug,
        productType: offer.productType,
        offerId: offer.id,
        deliveryMode,
        options: { offerSlug: offer.slug, deliveryMode },
        basePrice: subtotal,
        finalPrice: pricing.totalCents,
        couponCode: pricing.couponCode,
        couponDiscountCents: pricing.couponDiscountCents,
        walletAppliedCents: pricing.walletAppliedCents,
        cashbackEarnedCents: pricing.cashbackEarnedCents,
        paymentStatus: pricing.totalCents === 0 ? "PAID" : "PENDING",
        status: "OPEN",
      },
    });
    await tx.conversation.create({ data: { orderId: created.id } });
    await tx.offer.update({
      where: { id: offer.id },
      data: { ordersCount: { increment: 1 } },
    });

    if (pricing.walletAppliedCents > 0) {
      await appendWalletEntry(tx, {
        userId: session.user!.id!,
        kind: "CASHBACK_USED",
        amountCents: -pricing.walletAppliedCents,
        orderId: created.id,
        description: `Applied wallet credit to order ${created.id}`,
      });
    }

    if (pricing.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: pricing.couponCode } });
      if (coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: session.user!.id!,
            orderId: created.id,
            amountAppliedCents: pricing.couponDiscountCents,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usesCount: { increment: 1 } },
        });
      }
    }
    return created;
  });

  await logActivityNow({
    orderId: order.id,
    actorUserId: session.user.id,
    type: "CREATED",
    message: `Order placed from offer "${offer.title}"`,
  });

  redirect(`/checkout/${order.id}`);
}

void recordCouponRedemption;
