"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const updateStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
});

export async function updateOrderStatus(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = updateStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid status");
  }
  const { orderId, status } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status },
    });
    await logActivity(tx, {
      orderId,
      type: "STATUS_CHANGED",
      message: `Status changed: ${order.status} → ${status}.`,
      actorUserId: admin.id,
      metadata: { from: order.status, to: status },
    });
  });

  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pro");
}

const assignSchema = z.object({
  orderId: z.string().min(1),
  proId: z.string().min(1),
  finalPrice: z.coerce.number().int().min(0).optional(),
});

export async function manuallyAssignPro(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = assignSchema.safeParse({
    orderId: formData.get("orderId"),
    proId: formData.get("proId"),
    finalPrice: formData.get("finalPrice") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid assignment");
  }
  const { orderId, proId, finalPrice } = parsed.data;

  const [order, pro] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.user.findUnique({ where: { id: proId } }),
  ]);
  if (!order) throw new Error("Order not found");
  if (!pro || (pro.role !== "PRO" && pro.role !== "ADMIN")) {
    throw new Error("Pro not found or not eligible");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        proId,
        status: "ASSIGNED",
        finalPrice: finalPrice ?? order.finalPrice ?? order.basePrice,
      },
    });
    await logActivity(tx, {
      orderId,
      type: "ASSIGNED",
      message: `Admin manually assigned ${pro.name ?? pro.email}.`,
      actorUserId: admin.id,
      metadata: { proId, finalPrice: finalPrice ?? null },
    });
  });

  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/pro");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

const noteSchema = z.object({
  orderId: z.string().min(1),
  note: z.string().trim().max(4000),
});

export async function setInternalNotes(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = noteSchema.safeParse({
    orderId: formData.get("orderId"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid note");
  }
  const { orderId, note } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { internalNotes: note || null },
    });
    await logActivity(tx, {
      orderId,
      type: "INTERNAL_NOTE_ADDED",
      message: "Admin updated internal notes.",
      actorUserId: admin.id,
      visibleToPro: false,
      visibleToUser: false,
    });
  });

  revalidatePath(`/dashboard/admin/orders/${orderId}`);
}

const applicationDecisionSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(2000).optional().default(""),
});

export async function decideProApplication(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = applicationDecisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid decision");
  }
  const { applicationId, decision, note } = parsed.data;

  const application = await prisma.proApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!application) throw new Error("Application not found");
  if (application.status !== "PENDING") {
    throw new Error("Application already reviewed.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.proApplication.update({
      where: { id: applicationId },
      data: {
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        adminNotes: note || null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: application.userId },
      data: {
        proApplicationStatus: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        ...(decision === "APPROVE" && application.user.role === "USER"
          ? {
              role: "PRO",
              proHeadline: application.headline,
              proBio: application.bio,
            }
          : {}),
      },
    });
  });

  revalidatePath("/dashboard/admin/applications");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard");
}
