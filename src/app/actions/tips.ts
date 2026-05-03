"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appendWalletEntry } from "@/lib/wallet";
import { logActivityNow } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";

export type TipState = { ok: boolean; error?: string };

export async function tipPro(_prev: TipState | undefined, formData: FormData): Promise<TipState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sign in required." };

  const orderId = String(formData.get("orderId") ?? "");
  const amountCents = Math.max(0, Number.parseInt(String(formData.get("amountCents") ?? "0"), 10) || 0);
  const message = String(formData.get("message") ?? "").slice(0, 500);

  if (!orderId || amountCents < 100) return { ok: false, error: "Minimum tip is $1.00." };

  const rl = await rateLimit(`tip:${session.user.id}`, 20, 60);
  if (!rl.allowed) return { ok: false, error: "Too many requests." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { tip: true } });
  if (!order || order.customerId !== session.user.id)
    return { ok: false, error: "Order not found." };
  if (!order.proId) return { ok: false, error: "Order is not assigned to a Pro." };
  if (order.status !== "COMPLETED") return { ok: false, error: "You can only tip after completion." };
  if (order.tip) return { ok: false, error: "Tip already left for this order." };

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.tip.findUnique({ where: { orderId } });
      if (existing) {
        throw new Error("TIP_EXISTS");
      }
      await tx.tip.create({
        data: {
          orderId,
          fromUserId: session.user!.id!,
          toUserId: order.proId!,
          amountCents,
          message,
          status: "PAID",
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { tipAmountCents: amountCents },
      });
      // Debit customer wallet first so the ledger is balanced; if the
      // customer lacks credit, appendWalletEntry throws and the entire
      // transaction rolls back.
      await appendWalletEntry(tx, {
        userId: session.user!.id!,
        kind: "TIP_SENT",
        amountCents: -amountCents,
        orderId,
        description: `Tip sent to Pro for order ${orderId}`,
      });
      await appendWalletEntry(tx, {
        userId: order.proId!,
        kind: "TIP_RECEIVED",
        amountCents,
        orderId,
        description: `Tip from ${session.user!.name ?? "customer"}`,
      });
    });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "P2002" || e?.message === "TIP_EXISTS") {
      return { ok: false, error: "Tip already left for this order." };
    }
    if (e?.message === "Insufficient wallet balance") {
      return {
        ok: false,
        error: "Insufficient wallet balance. Top up before sending a tip.",
      };
    }
    throw err;
  }

  await logActivityNow({
    orderId,
    actorUserId: session.user.id,
    type: "MESSAGE_SENT",
    message: `Customer left a $${(amountCents / 100).toFixed(2)} tip.`,
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  return { ok: true };
}
