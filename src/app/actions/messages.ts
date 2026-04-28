"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const sendMessageSchema = z.object({
  orderId: z.string().min(1),
  body: z.string().trim().min(1, "Message cannot be empty.").max(4000),
  isInternal: z.boolean().default(false),
});

export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = sendMessageSchema.safeParse({
    orderId: formData.get("orderId"),
    body: formData.get("body"),
    isInternal: formData.get("isInternal") === "1",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid message");
  }
  const { orderId, body, isInternal } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, proId: true },
  });
  if (!order) throw new Error("Order not found");

  const role = session.user.role;
  const isParticipant =
    order.customerId === session.user.id ||
    order.proId === session.user.id ||
    role === "ADMIN";
  if (!isParticipant) throw new Error("Not allowed");

  if (isInternal && role !== "ADMIN") {
    throw new Error("Only admins can post internal notes.");
  }

  const conversation = await prisma.conversation.upsert({
    where: { orderId },
    update: {},
    create: { orderId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        senderRole: role,
        body,
        isInternal,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    if (!isInternal) {
      await logActivity(tx, {
        orderId,
        type: "MESSAGE_SENT",
        message: `${role.toLowerCase()} sent a message.`,
        actorUserId: session.user.id,
        visibleToPro: true,
        visibleToUser: true,
      });
    } else {
      await logActivity(tx, {
        orderId,
        type: "INTERNAL_NOTE_ADDED",
        message: "Admin added an internal note.",
        actorUserId: session.user.id,
        visibleToPro: false,
        visibleToUser: false,
      });
    }
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath(`/dashboard/pro/orders/${orderId}`);
}
