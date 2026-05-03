"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createCheckoutSession,
  markPaymentPaid,
} from "@/lib/payments";

export type CheckoutState = {
  ok: boolean;
  error?: string;
  checkoutUrl?: string;
};

function getSiteOrigin() {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function startCheckout(
  _prev: CheckoutState | undefined,
  formData: FormData,
): Promise<CheckoutState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Sign in to continue." };
  }
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, error: "Missing order." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    return { ok: false, error: "Not allowed." };
  }
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "Order is already paid." };
  }

  const amount = order.finalPrice ?? order.basePrice;
  const origin = getSiteOrigin();
  // Build the checkout session inside try/catch so a provider failure
  // surfaces as a friendly error, but call redirect() OUTSIDE the catch.
  // Next.js implements redirect() by throwing a NEXT_REDIRECT error;
  // catching it would swallow the navigation and show the user a fake
  // "Checkout failed" message instead of sending them to the provider.
  let checkoutUrl: string;
  try {
    const result = await createCheckoutSession({
      orderId,
      amount,
      currency: order.currency,
      successUrl: `${origin}/checkout/success?orderId=${orderId}`,
      cancelUrl: `${origin}/checkout/${orderId}`,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Checkout failed",
    };
  }
  redirect(checkoutUrl);
}

export async function confirmManualPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) throw new Error("Missing order");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Not allowed");
  }
  if (order.paymentProvider !== "MANUAL") {
    throw new Error("This order does not use manual payment.");
  }

  await markPaymentPaid(orderId);

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  redirect(`/checkout/success?orderId=${orderId}`);
}
