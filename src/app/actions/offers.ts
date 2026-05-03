"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivityNow } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateCoupon } from "@/lib/coupons";
import { computeCashbackFor } from "@/lib/cashback";
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
  const userId = session.user.id!;
  const cashbackCategory = categoryFor(offer.productType);

  let couponError: string | undefined;
  let createdId: string | undefined;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: userId },
        select: { walletCreditCents: true, totalSpentCents: true },
      });
      if (!dbUser) throw new Error("USER_NOT_FOUND");

      let couponDiscountCents = 0;
      let couponPersistedCode: string | undefined;
      let couponIdForRedemption: string | undefined;
      if (couponCode) {
        const evalResult = await evaluateCoupon(
          {
            code: couponCode,
            userId,
            orderSubtotalCents: subtotal,
            gameSlug: offer.gameSlug,
            offerId: offer.id,
          },
          tx,
        );
        if (!evalResult.ok) {
          throw new Error(`COUPON:${evalResult.reason}`);
        }
        couponDiscountCents = evalResult.discountCents;
        couponPersistedCode = evalResult.coupon.code;
        couponIdForRedemption = evalResult.coupon.id;
      }

      const afterCoupon = Math.max(0, subtotal - couponDiscountCents);
      const walletApplied = Math.min(
        Math.max(0, dbUser.walletCreditCents),
        Math.max(0, walletApplyCents),
        afterCoupon,
      );
      const totalCents = Math.max(0, afterCoupon - walletApplied);

      const cashback = await computeCashbackFor({
        userTotalSpentCents: dbUser.totalSpentCents,
        category: cashbackCategory,
        amountCents: totalCents,
      });

      const created = await tx.order.create({
        data: {
          customerId: userId,
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
          finalPrice: totalCents,
          couponCode: couponPersistedCode,
          couponDiscountCents,
          walletAppliedCents: walletApplied,
          cashbackEarnedCents: cashback.cashbackCents,
          paymentStatus: totalCents === 0 ? "PAID" : "PENDING",
          status: "OPEN",
        },
      });
      await tx.conversation.create({ data: { orderId: created.id } });
      await tx.offer.update({
        where: { id: offer.id },
        data: { ordersCount: { increment: 1 } },
      });

      if (walletApplied > 0) {
        await appendWalletEntry(tx, {
          userId,
          kind: "CASHBACK_USED",
          amountCents: -walletApplied,
          orderId: created.id,
          description: `Applied wallet credit to order ${created.id}`,
        });
      }

      if (couponIdForRedemption && couponPersistedCode) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponIdForRedemption,
            userId,
            orderId: created.id,
            amountAppliedCents: couponDiscountCents,
          },
        });
        await tx.coupon.update({
          where: { id: couponIdForRedemption },
          data: { usesCount: { increment: 1 } },
        });
      }

      // Cashback is credited at payment time (markPaymentPaid). Free orders
      // (totalCents === 0) are auto-PAID above, so credit immediately.
      if (totalCents === 0 && cashback.cashbackCents > 0) {
        await appendWalletEntry(tx, {
          userId,
          kind: "CASHBACK_EARNED",
          amountCents: cashback.cashbackCents,
          orderId: created.id,
          description: `Cashback earned on order ${created.id}`,
        });
      }

      return { id: created.id, wasFree: totalCents === 0 };
    });
    createdId = result.id;
    if (result.wasFree) {
      try {
        const { maybeAttributeFirstOrder } = await import("@/app/actions/referrals");
        await maybeAttributeFirstOrder(userId, result.id);
      } catch (referralErr) {
        console.error("[buyOffer] referral attribution failed", referralErr);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("COUPON:")) {
      couponError = msg.slice("COUPON:".length);
    } else if (msg === "USER_NOT_FOUND") {
      return { ok: false, error: "User not found." };
    } else {
      throw err;
    }
  }

  if (couponError) {
    return { ok: false, error: couponError };
  }

  if (!createdId) return { ok: false, error: "Could not create order." };

  await logActivityNow({
    orderId: createdId,
    actorUserId: userId,
    type: "CREATED",
    message: `Order placed from offer "${offer.title}"`,
  });

  // Free orders are already PAID; skip the checkout flow entirely so we don't
  // create a stray Payment row for an order that needs no payment.
  const created = await prisma.order.findUnique({
    where: { id: createdId },
    select: { paymentStatus: true },
  });
  if (created?.paymentStatus === "PAID") {
    redirect(`/dashboard/orders/${createdId}`);
  }
  redirect(`/checkout/${createdId}`);
}
