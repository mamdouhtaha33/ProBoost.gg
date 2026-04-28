import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

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

export function getActiveProvider(): PaymentProvider {
  return STRIPE_ENABLED ? "STRIPE" : "MANUAL";
}

/**
 * Create a checkout session for an order. The MANUAL provider returns an
 * internal confirmation URL so the customer can simulate paying in development.
 * The STRIPE provider is a placeholder that requires STRIPE_SECRET_KEY +
 * STRIPE_WEBHOOK_SECRET; until configured we fall back to MANUAL.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const provider = getActiveProvider();
  const currency = input.currency ?? "USD";

  if (provider === "STRIPE") {
    return createStripeCheckout(input, currency);
  }
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

/**
 * Mark a payment as PAID. Used both by the manual confirm action and by
 * webhook handlers. Idempotent — safe to call multiple times.
 */
export async function markPaymentPaid(orderId: string, providerRef?: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { orderId } });
    if (!existing) throw new Error("Payment not found");

    if (existing.status === "PAID") {
      return { alreadyPaid: true, payment: existing };
    }

    const payment = await tx.payment.update({
      where: { orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        providerRef: providerRef ?? existing.providerRef,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID" },
    });

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

    return { alreadyPaid: false, payment };
  });
}

export async function markPaymentFailed(
  orderId: string,
  errorMessage: string,
) {
  await prisma.payment.update({
    where: { orderId },
    data: {
      status: "FAILED" satisfies PaymentStatus,
      lastError: errorMessage,
    },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "FAILED" },
  });
  await logActivity(prisma, {
    orderId,
    type: "STATUS_CHANGED",
    message: `Payment failed: ${errorMessage}`,
    visibleToPro: false,
  });
}
