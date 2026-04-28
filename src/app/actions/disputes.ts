"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { sendEmail, renderHtml } from "@/lib/email";

const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.enum([
    "NOT_DELIVERED",
    "PARTIAL_DELIVERY",
    "QUALITY_ISSUE",
    "COMMUNICATION",
    "PAYMENT_ISSUE",
    "OTHER",
  ]),
  summary: z.string().min(20).max(4000),
  amountClaim: z.coerce.number().int().nonnegative().optional(),
});

export async function openDispute(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Sign in required");

  const parsed = openDisputeSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
    summary: formData.get("summary"),
    amountClaim: formData.get("amountClaim") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid dispute");
  }
  const { orderId, reason, summary, amountClaim } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, pro: true },
  });
  if (!order) throw new Error("Order not found");

  const isParticipant =
    order.customerId === session.user.id ||
    order.proId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isParticipant) throw new Error("Not authorized");

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        orderId,
        openerId: session.user.id,
        reason,
        summary,
        amountClaim: amountClaim ?? null,
        status: "OPEN",
      },
    });
    await logActivity(tx, {
      orderId,
      type: "STATUS_CHANGED",
      message: `Dispute opened (${reason}).`,
      actorUserId: session.user.id,
      metadata: { disputeId: d.id, reason },
    });
    await logAudit(tx, {
      actorUserId: session.user.id,
      action: "dispute.open",
      targetType: "DISPUTE",
      targetId: d.id,
      after: { orderId, reason },
    });
    return d;
  });

  // notify the other parties + admins
  const recipients = new Set<string>();
  if (order.customerId !== session.user.id) recipients.add(order.customerId);
  if (order.proId && order.proId !== session.user.id) recipients.add(order.proId);
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  admins.forEach((a) => recipients.add(a.id));

  for (const userId of recipients) {
    await notify(prisma, {
      userId,
      type: "DISPUTE_OPENED",
      title: "Dispute opened",
      body: `Dispute opened on order "${order.title}": ${reason}`,
      link: `/dashboard/disputes/${dispute.id}`,
    });
  }

  if (order.customer.email && order.customerId !== session.user.id) {
    await sendEmail({
      to: order.customer.email,
      template: "dispute.opened",
      subject: `Dispute opened on order ${order.title}`,
      html: renderHtml({
        title: "A dispute was opened",
        bodyHtml: `<p>A dispute (${reason}) was opened on order <strong>${order.title}</strong>.</p>`,
        ctaUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/disputes/${dispute.id}`,
        ctaLabel: "View dispute",
      }),
    });
  }

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin/disputes");
}

const replyDisputeSchema = z.object({
  disputeId: z.string().min(1),
  body: z.string().min(1).max(4000),
  isInternal: z.coerce.boolean().optional().default(false),
});

export async function replyToDispute(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Sign in required");

  const parsed = replyDisputeSchema.safeParse({
    disputeId: formData.get("disputeId"),
    body: formData.get("body"),
    isInternal: formData.get("isInternal") === "on" || formData.get("isInternal") === "true",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reply");
  }
  const { disputeId, body, isInternal } = parsed.data;

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { order: true },
  });
  if (!dispute) throw new Error("Dispute not found");

  const isParticipant =
    dispute.openerId === session.user.id ||
    dispute.order.customerId === session.user.id ||
    dispute.order.proId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isParticipant) throw new Error("Not authorized");

  if (isInternal && session.user.role !== "ADMIN") {
    throw new Error("Only admins can post internal notes");
  }

  await prisma.disputeMessage.create({
    data: {
      disputeId,
      authorId: session.user.id,
      body,
      isInternal,
    },
  });
  await prisma.dispute.update({
    where: { id: disputeId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/dashboard/disputes/${disputeId}`);
  revalidatePath(`/dashboard/admin/disputes/${disputeId}`);
}

const updateDisputeStatusSchema = z.object({
  disputeId: z.string().min(1),
  status: z.enum([
    "OPEN",
    "UNDER_REVIEW",
    "AWAITING_USER",
    "AWAITING_PRO",
    "RESOLVED_FOR_USER",
    "RESOLVED_FOR_PRO",
    "CLOSED",
  ]),
  resolution: z.string().max(4000).optional(),
});

export async function updateDisputeStatus(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = updateDisputeStatusSchema.safeParse({
    disputeId: formData.get("disputeId"),
    status: formData.get("status"),
    resolution: formData.get("resolution") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid status update");
  const { disputeId, status, resolution } = parsed.data;

  const closing =
    status === "RESOLVED_FOR_USER" ||
    status === "RESOLVED_FOR_PRO" ||
    status === "CLOSED";

  const before = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!before) throw new Error("Dispute not found");

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status,
        resolution: resolution ?? null,
        assigneeId: admin.id,
        closedAt: closing ? new Date() : null,
      },
    });
    await logAudit(tx, {
      actorUserId: admin.id,
      action: "dispute.status",
      targetType: "DISPUTE",
      targetId: disputeId,
      before: { status: before.status },
      after: { status, resolution },
    });
  });

  revalidatePath(`/dashboard/admin/disputes/${disputeId}`);
  revalidatePath(`/dashboard/disputes/${disputeId}`);
  revalidatePath("/dashboard/admin/disputes");
}
