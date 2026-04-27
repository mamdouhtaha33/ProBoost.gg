import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { markPaymentFailed, markPaymentPaid } from "@/lib/payments";
import crypto from "node:crypto";

export const runtime = "nodejs";

function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const ts = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!ts || sigs.length === 0) return false;
  const signed = `${ts}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signed)
    .digest("hex");
  return sigs.some(
    (s) =>
      s.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)),
  );
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const sigHeader = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret) {
    if (!verifyStripeSignature(text, sigHeader, secret)) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 400 });
    }
  }

  let evt: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    evt = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const obj = (evt.data?.object ?? {}) as Record<string, unknown>;
  const orderId =
    (obj.client_reference_id as string | undefined) ??
    ((obj.metadata as { orderId?: string } | undefined)?.orderId);
  const providerRef = (obj.id as string | undefined) ?? undefined;

  if (!orderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const exists = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  switch (evt.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
      await markPaymentPaid(orderId, providerRef);
      break;
    case "checkout.session.expired":
    case "payment_intent.payment_failed":
      await markPaymentFailed(orderId, "Payment failed at provider.");
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
