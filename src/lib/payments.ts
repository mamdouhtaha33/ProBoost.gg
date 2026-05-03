import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { appendWalletEntry } from "@/lib/wallet";

export type CreateCheckoutInput = {
  orderId: string;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  paymentId: string;
  checkoutUrl: string;
  provider: PaymentProvider;
};

const STRIPE_ENABLED =
  !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

const PAYMOB_ENABLED =
  !!process.env.PAYMOB_API_KEY &&
  !!process.env.PAYMOB_INTEGRATION_ID &&
  !!process.env.PAYMOB_HMAC_SECRET;

export function listAvailableProviders(): PaymentProvider[] {
  const list: PaymentProvider[] = ["MANUAL"];
  if (STRIPE_ENABLED) list.push("STRIPE");
  if (PAYMOB_ENABLED) list.push("PAYMOB");
  return list;
}

export function getActiveProvider(): PaymentProvider {
  if (STRIPE_ENABLED) return "STRIPE";
  if (PAYMOB_ENABLED) return "PAYMOB";
  return "MANUAL";
}

/**
 * Create a checkout session for an order.
 * MANUAL returns an internal confirmation URL for dev.
 * STRIPE requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET.
 * PAYMOB requires PAYMOB_API_KEY + PAYMOB_INTEGRATION_ID.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput & { provider?: PaymentProvider },
): Promise<CreateCheckoutResult> {
  const provider = input.provider ?? getActiveProvider();
  const currency = input.currency ?? "USD";

  if (provider === "STRIPE" && STRIPE_ENABLED) return createStripeCheckout(input, currency);
  if (provider === "PAYMOB" && PAYMOB_ENABLED) return createPaymobCheckout(input, currency);
  return createManualCheckout(input, currency);
}

async function createManualCheckout(
  input: CreateCheckoutInput,
  currency: string,
): Promise<CreateCheckoutResult> {
  const checkoutUrl = `/checkout/${input.orderId}/manual`;

  const payment = await prisma.payment.upsert({
    where: { orderId: input.orderId },
    update: {
      provider: "MANUAL",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      checkoutUrl,
      providerRef: null,
      lastError: null,
    },
    create: {
      orderId: input.orderId,
      provider: "MANUAL",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      checkoutUrl,
    },
  });

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      paymentProvider: "MANUAL",
      paymentStatus: "REQUIRES_ACTION",
    },
  });

  await logActivity(prisma, {
    orderId: input.orderId,
    type: "PAYMENT_LINK_CREATED",
    message: "Checkout session created (MANUAL provider).",
    metadata: { provider: "MANUAL", amount: input.amount, currency },
    visibleToPro: false,
  });

  return { paymentId: payment.id, checkoutUrl, provider: "MANUAL" };
}

async function createStripeCheckout(
  input: CreateCheckoutInput,
  currency: string,
): Promise<CreateCheckoutResult> {
  const secret = process.env.STRIPE_SECRET_KEY!;
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", input.successUrl);
  params.append("cancel_url", input.cancelUrl);
  params.append("client_reference_id", input.orderId);
  params.append("payment_method_types[0]", "card");
  params.append("line_items[0][price_data][currency]", currency.toLowerCase());
  params.append(
    "line_items[0][price_data][product_data][name]",
    `ProBoost.gg Order ${input.orderId.slice(0, 8)}`,
  );
  params.append(
    "line_items[0][price_data][unit_amount]",
    String(input.amount),
  );
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[orderId]", input.orderId);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const json = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id || !json.url) {
    throw new Error(
      `Stripe checkout creation failed: ${json.error?.message ?? res.statusText}`,
    );
  }

  const payment = await prisma.payment.upsert({
    where: { orderId: input.orderId },
    update: {
      provider: "STRIPE",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      providerRef: json.id,
      checkoutUrl: json.url,
      lastError: null,
    },
    create: {
      orderId: input.orderId,
      provider: "STRIPE",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      providerRef: json.id,
      checkoutUrl: json.url,
    },
  });

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      paymentProvider: "STRIPE",
      paymentStatus: "REQUIRES_ACTION",
    },
  });

  await logActivity(prisma, {
    orderId: input.orderId,
    type: "PAYMENT_LINK_CREATED",
    message: "Stripe checkout session created.",
    metadata: { provider: "STRIPE", amount: input.amount, currency },
    visibleToPro: false,
  });

  return {
    paymentId: payment.id,
    checkoutUrl: json.url,
    provider: "STRIPE",
  };
}

function splitName(full: string | null | undefined): { first: string; last: string } {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return { first: "ProBoost", last: "Customer" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

async function createPaymobCheckout(
  input: CreateCheckoutInput,
  currency: string,
): Promise<CreateCheckoutResult> {
  // Paymob production flow:
  //   1. POST /api/auth/tokens with PAYMOB_API_KEY -> auth token
  //   2. POST /api/ecommerce/orders -> paymob order id
  //   3. POST /api/acceptance/payment_keys -> payment key
  //   4. Build iframe URL: https://accept.paymob.com/api/acceptance/iframes/<id>?payment_token=<key>
  // We scaffold this so the server compiles; if any step fails or env is
  // missing we surface the error to the caller.
  const apiKey = process.env.PAYMOB_API_KEY!;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID!;
  const iframeId = process.env.PAYMOB_IFRAME_ID;

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { customer: { select: { name: true, email: true } } },
  });
  const customer = order?.customer;
  const { first, last } = splitName(customer?.name);
  const email = customer?.email && customer.email.includes("@") ? customer.email : "user@proboost.gg";

  let authToken: string;
  try {
    const r = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const j = (await r.json()) as { token?: string };
    if (!j.token) throw new Error("paymob auth token missing");
    authToken = j.token;
  } catch (err) {
    throw new Error(
      `Paymob auth failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const paymobOrderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: input.amount,
      currency,
      items: [{ name: `ProBoost.gg Order ${input.orderId.slice(0, 8)}`, amount_cents: input.amount, quantity: 1 }],
    }),
  });
  const paymobOrder = (await paymobOrderRes.json()) as { id?: number };
  if (!paymobOrder.id) throw new Error("paymob order creation failed");

  const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: input.amount,
      expiration: 3600,
      order_id: paymobOrder.id,
      billing_data: {
        email,
        first_name: first,
        last_name: last,
        phone_number: "+10000000000",
        country: "EG",
        city: "NA",
        street: "NA",
        building: "NA",
        floor: "NA",
        apartment: "NA",
      },
      currency,
      integration_id: Number(integrationId),
    }),
  });
  const keyJson = (await keyRes.json()) as { token?: string };
  if (!keyJson.token) throw new Error("paymob payment key missing");

  const checkoutUrl = iframeId
    ? `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyJson.token}`
    : `https://accept.paymob.com/api/acceptance/post_pay?payment_token=${keyJson.token}`;

  const payment = await prisma.payment.upsert({
    where: { orderId: input.orderId },
    update: {
      provider: "PAYMOB",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      providerRef: String(paymobOrder.id),
      checkoutUrl,
      lastError: null,
    },
    create: {
      orderId: input.orderId,
      provider: "PAYMOB",
      amount: input.amount,
      currency,
      status: "REQUIRES_ACTION",
      providerRef: String(paymobOrder.id),
      checkoutUrl,
    },
  });

  await prisma.order.update({
    where: { id: input.orderId },
    data: { paymentProvider: "PAYMOB", paymentStatus: "REQUIRES_ACTION" },
  });

  await logActivity(prisma, {
    orderId: input.orderId,
    type: "PAYMENT_LINK_CREATED",
    message: "Paymob checkout session created.",
    metadata: { provider: "PAYMOB", amount: input.amount, currency },
    visibleToPro: false,
  });

  return { paymentId: payment.id, checkoutUrl, provider: "PAYMOB" };
}

/**
 * Mark a payment as PAID. Used both by the manual confirm action and by
 * webhook handlers. Idempotent — safe to call multiple times.
 */
export async function markPaymentPaid(orderId: string, providerRef?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { orderId } });
    if (!existing) throw new Error("Payment not found");

    if (existing.status === "PAID") {
      return { alreadyPaid: true, payment: existing, customerId: null as string | null };
    }

    const payment = await tx.payment.update({
      where: { orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        providerRef: providerRef ?? existing.providerRef,
      },
    });

    const order = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID" },
    });

    await tx.user.update({
      where: { id: order.customerId },
      data: { totalSpentCents: { increment: payment.amount } },
    });

    // Apply the deferred wallet debit recorded at order creation time.
    // buyOffer no longer debits the wallet up front so an abandoned
    // checkout doesn't permanently consume customer credit; we replay it
    // here once the payment is actually confirmed. Idempotent via the
    // CASHBACK_USED ledger entry: re-runs find an existing entry and skip.
    if (order.walletAppliedCents > 0) {
      const alreadyDebited = await tx.walletEntry.findFirst({
        where: { orderId, kind: "CASHBACK_USED" },
        select: { id: true },
      });
      if (!alreadyDebited) {
        try {
          await appendWalletEntry(tx, {
            userId: order.customerId,
            kind: "CASHBACK_USED",
            amountCents: -order.walletAppliedCents,
            orderId: order.id,
            description: `Applied wallet credit to order ${order.id}`,
          });
        } catch (err) {
          // The wallet may have been spent on another order between order
          // creation and payment confirmation. The customer already paid
          // the discounted amount via the provider, so we can't roll the
          // payment back here. Log so an admin can reconcile manually.
          console.error(
            `[markPaymentPaid] wallet debit failed for order ${order.id}:`,
            err,
          );
        }
      }
    }

    // Apply the deferred coupon redemption. The CouponRedemption row has
    // a unique([couponId, orderId]) constraint, so a P2002 means it was
    // already redeemed (idempotent on retry / replay).
    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: order.couponCode },
      });
      if (coupon) {
        try {
          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId: order.customerId,
              orderId: order.id,
              amountAppliedCents: order.couponDiscountCents,
            },
          });
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usesCount: { increment: 1 } },
          });
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code !== "P2002") throw err;
          // Already redeemed for this order — idempotent no-op.
        }
      }
    }

    if (order.cashbackEarnedCents > 0) {
      const alreadyCredited = await tx.walletEntry.findFirst({
        where: { orderId, kind: "CASHBACK_EARNED" },
        select: { id: true },
      });
      if (!alreadyCredited) {
        await appendWalletEntry(tx, {
          userId: order.customerId,
          kind: "CASHBACK_EARNED",
          amountCents: order.cashbackEarnedCents,
          orderId: order.id,
          description: `Cashback earned on order ${order.id}`,
        });
      }
    }

    await tx.transaction.create({
      data: {
        orderId,
        paymentId: payment.id,
        kind: "CHARGE",
        status: "SUCCEEDED",
        amount: payment.amount,
        currency: payment.currency,
        providerRef: payment.providerRef,
        description: "Order charge succeeded.",
      },
    });

    await logActivity(tx, {
      orderId,
      type: "PAYMENT_CONFIRMED",
      message: "Payment confirmed.",
      metadata: { provider: payment.provider, amount: payment.amount },
    });

    return { alreadyPaid: false, payment, customerId: order.customerId };
  });

  if (!result.alreadyPaid && result.customerId) {
    try {
      const { maybeAttributeFirstOrder } = await import("@/app/actions/referrals");
      await maybeAttributeFirstOrder(result.customerId, orderId);
    } catch (referralErr) {
      console.error("[markPaymentPaid] referral attribution failed", referralErr);
    }
  }

  return { alreadyPaid: result.alreadyPaid, payment: result.payment };
}

export async function markPaymentFailed(
  orderId: string,
  errorMessage: string,
) {
  // Atomic idempotency guard: never downgrade a PAID payment back to
  // FAILED. A read-then-write pattern would race with markPaymentPaid
  // (e.g. two Paymob webhooks arriving near-simultaneously, one success
  // and one delayed failure retry) and could overwrite the PAID row
  // *after* the financial side effects (totalSpentCents, cashback,
  // coupon redemption) have already committed. The conditional
  // updateMany below refuses to flip a row whose status is PAID.
  const flip = await prisma.payment.updateMany({
    where: { orderId, status: { not: "PAID" } },
    data: {
      status: "FAILED" satisfies PaymentStatus,
      lastError: errorMessage,
    },
  });
  if (flip.count === 0) {
    const existing = await prisma.payment.findUnique({
      where: { orderId },
      select: { status: true },
    });
    if (!existing) return { skipped: true as const, reason: "no-payment" };
    return { skipped: true as const, reason: "already-paid" };
  }

  // Mirror the conditional guard on the Order so we never flip a PAID
  // order's payment status to FAILED either.
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "FAILED" },
  });
  await logActivity(prisma, {
    orderId,
    type: "STATUS_CHANGED",
    message: `Payment failed: ${errorMessage}`,
    visibleToPro: false,
  });
  return { skipped: false as const };
}
