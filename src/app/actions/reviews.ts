"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { sendEmail, renderHtml } from "@/lib/email";
import { recomputeProStats } from "@/lib/pro-rank";

const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(""),
  body: z.string().trim().max(4000).optional().default(""),
});

export async function leaveReview(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = reviewSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review");
  }
  const { orderId, rating, title, body } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { review: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.customerId !== session.user.id) {
    throw new Error("Only the customer can review this order.");
  }
  if (order.status !== "COMPLETED") {
    throw new Error("Only completed orders can be reviewed.");
  }
  if (!order.proId) {
    throw new Error("Order has no assigned Pro.");
  }
  if (order.review) {
    throw new Error("This order has already been reviewed.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        orderId,
        authorId: session.user.id,
        recipientId: order.proId!,
        rating,
        title: title || null,
        body: body || null,
      },
    });
    await logActivity(tx, {
      orderId,
      type: "REVIEW_LEFT",
      message: `Customer left a ${rating}★ review.`,
      actorUserId: session.user.id,
      metadata: { rating },
    });
  });

  await recomputeProStats(order.proId);

  const pro = await prisma.user.findUnique({
    where: { id: order.proId },
    select: { email: true, id: true },
  });
  if (pro) {
    await notify(prisma, {
      userId: pro.id,
      type: "REVIEW_RECEIVED",
      title: `New ${rating}★ review`,
      body: title || `You received a ${rating}-star review.`,
      link: `/dashboard/pro/orders/${orderId}`,
    });
    if (pro.email) {
      await sendEmail({
        to: pro.email,
        template: "review.received",
        subject: `You got a ${rating}★ review on ProBoost.gg`,
        html: renderHtml({
          title: `New ${rating}★ review`,
          bodyHtml: `<p>${body || "Great work — the customer left you a positive review."}</p>`,
          ctaUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/pro/orders/${orderId}`,
          ctaLabel: "View order",
        }),
      });
    }
  }

  revalidatePath(`/dashboard/orders/${orderId}`);
}
