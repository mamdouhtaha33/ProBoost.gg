import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { markPaymentPaid, markPaymentFailed } from "@/lib/payments";

export const runtime = "nodejs";

// Paymob HMAC verification: concatenate specific transaction fields and HMAC-SHA512
// using PAYMOB_HMAC_SECRET. https://docs.paymob.com/reference/hmac-calculation
function verifyPaymobHmac(payload: Record<string, unknown>, hmacHeader: string | null): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !hmacHeader) return false;
  const obj = (payload.obj ?? {}) as Record<string, unknown>;
  const fields = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    (obj.order as { id?: unknown } | undefined)?.id,
    obj.owner,
    obj.pending,
    (obj.source_data as { pan?: unknown } | undefined)?.pan,
    (obj.source_data as { sub_type?: unknown } | undefined)?.sub_type,
    (obj.source_data as { type?: unknown } | undefined)?.type,
    obj.success,
  ]
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join("");
  const computed = crypto.createHmac("sha512", secret).update(fields).digest("hex");
  return (
    computed.length === hmacHeader.length &&
    crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader))
  );
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const hmacHeader = url.searchParams.get("hmac") ?? req.headers.get("x-paymob-hmac");
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!process.env.PAYMOB_HMAC_SECRET) {
    return NextResponse.json(
      { ok: false, error: "paymob webhook misconfigured" },
      { status: 500 },
    );
  }
  if (!verifyPaymobHmac(body, hmacHeader)) {
    return NextResponse.json({ ok: false, error: "bad hmac" }, { status: 400 });
  }

  const obj = (body.obj ?? {}) as Record<string, unknown>;
  const paymobOrderId = String((obj.order as { id?: unknown } | undefined)?.id ?? "");
  if (!paymobOrderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { provider: "PAYMOB", providerRef: paymobOrderId },
  });
  if (!payment) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (obj.success === true && obj.error_occured !== true) {
    await markPaymentPaid(payment.orderId, paymobOrderId);
  } else if (obj.error_occured === true || obj.success === false) {
    await markPaymentFailed(payment.orderId, "Paymob transaction failed.");
  }

  return NextResponse.json({ ok: true });
}
