"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const requestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(5, "Tell us briefly why.").max(2000),
});

export async function requestCancellation(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = requestSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request");
  }
  const { orderId, reason } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Not allowed");
  }
  if (["COMPLETED", "REFUNDED", "CANCELLED"].includes(order.status)) {
    throw new Error("Order is already finalized.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        refundRequestStatus: "REQUESTED",
        cancellationReason: reason,
        customerRequestedAt: new Date(),
        status: order.status === "OPEN" ? "CANCELLED" : "REFUND_REVIEW",
      },
    });
    if (order.paymentStatus === "PAID") {
      await tx.payment.update({
        where: { orderId },
        data: { status: "REFUND_REQUESTED" },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "REFUND_REQUESTED" },
      });
    }
    await logActivity(tx, {
      orderId,
      type: order.status === "OPEN" ? "CANCELLATION_REQUESTED" : "REFUND_REQUESTED",
      message:
        order.status === "OPEN"
          ? "Customer cancelled the order before assignment."
          : "Customer requested a cancellation/refund.",
      actorUserId: session.user.id,
      metadata: { reason },
    });
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
}

const decisionSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(2000).optional().default(""),
});

export async function decideRefund(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = decisionSchema.safeParse({
    orderId: formData.get("orderId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid decision");
  }
  const { orderId, decision, note } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.refundRequestStatus !== "REQUESTED") {
    throw new Error("No pending refund request.");
  }

  await prisma.$transaction(async (tx) => {
    if (decision === "APPROVE") {
      await tx.order.update({
        where: { id: orderId },
        data: {
          refundRequestStatus: "APPROVED",
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
          refundedAt: new Date(),
        },
      });
      if (order.payment) {
        await tx.payment.update({
          where: { orderId },
          data: { status: "REFUNDED" },
        });
        await tx.transaction.create({
          data: {
            orderId,
            paymentId: order.payment.id,
            kind: "REFUND",
            status: "SUCCEEDED",
            amount: order.payment.amount,
            currency: order.payment.currency,
            description: note || "Refund approved by admin.",
          },
        });
      }
      await logActivity(tx, {
        orderId,
        type: "REFUND_APPROVED",
        message: "Admin approved the refund request.",
        actorUserId: admin.id,
        metadata: { note },
      });
    } else {
      await tx.order.update({
        where: { id: orderId },
        data: {
          refundRequestStatus: "REJECTED",
          status: order.proId ? "IN_PROGRESS" : "OPEN",
          paymentStatus:
            order.paymentStatus === "REFUND_REQUESTED" ? "PAID" : order.paymentStatus,
        },
      });
      if (order.payment && order.payment.status === "REFUND_REQUESTED") {
        await tx.payment.update({
          where: { orderId },
          data: { status: "PAID" },
        });
      }
      await logActivity(tx, {
        orderId,
        type: "REFUND_REJECTED",
        message: "Admin rejected the refund request.",
        actorUserId: admin.id,
        metadata: { note },
      });
    }
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin");
}
