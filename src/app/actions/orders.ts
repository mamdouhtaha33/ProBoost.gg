"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, requireRole, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import {
  computeBasePrice,
  defaultTitle,
  orderOptionsSchema,
} from "@/lib/arc-pricing";

export type OrderActionState = {
  ok: boolean;
  error?: string;
  orderId?: string;
};

export async function createOrder(
  _prev: OrderActionState | undefined,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to place an order." };
  }

  const raw = {
    service: formData.get("service"),
    region: formData.get("region"),
    platform: formData.get("platform"),
    currentRank: formData.get("currentRank") || undefined,
    targetRank: formData.get("targetRank") || undefined,
    hours: formData.get("hours") || undefined,
    runs: formData.get("runs") || undefined,
    addons: formData.getAll("addons").map(String),
    notes: formData.get("notes") || "",
  };

  const parsed = orderOptionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const opts = parsed.data;

  if (opts.service === "boosting") {
    if (!opts.currentRank || !opts.targetRank) {
      return { ok: false, error: "Pick both your current and target rank." };
    }
  }

  const basePrice = computeBasePrice(opts);
  if (basePrice <= 0) {
    return { ok: false, error: "Configure your order — the price is $0." };
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        customerId: session.user.id,
        service: opts.service,
        title: defaultTitle(opts),
        description: opts.notes || "",
        options: opts as object,
        basePrice,
        status: "OPEN",
        paymentStatus: "PENDING",
      },
      select: { id: true, title: true },
    });
    await tx.conversation.create({ data: { orderId: o.id } });
    await logActivity(tx, {
      orderId: o.id,
      type: "CREATED",
      message: `Order placed: ${o.title}`,
      actorUserId: session.user.id,
    });
    return o;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard/admin");
  redirect(`/checkout/${order.id}`);
}

const placeBidSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().int().min(100, "Minimum bid is $1.00"),
  message: z.string().max(1000).optional().default(""),
});

export async function placeBid(formData: FormData) {
  const user = await requireRole(["PRO", "ADMIN"]);

  const parsed = placeBidSchema.safeParse({
    orderId: formData.get("orderId"),
    amount: formData.get("amount"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid bid");
  }

  const { orderId, amount, message } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "OPEN") throw new Error("Order is no longer open for bids");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.bid.findUnique({
      where: { orderId_proId: { orderId, proId: user.id } },
    });
    await tx.bid.upsert({
      where: { orderId_proId: { orderId, proId: user.id } },
      update: { amount, message, status: "PENDING" },
      create: { orderId, proId: user.id, amount, message, status: "PENDING" },
    });
    await logActivity(tx, {
      orderId,
      type: "BID_PLACED",
      message: existing
        ? `Pro updated their bid to ${formatCents(amount)}.`
        : `Pro placed a bid of ${formatCents(amount)}.`,
      actorUserId: user.id,
      metadata: { amount },
      visibleToUser: true,
    });
  });

  revalidatePath("/dashboard/pro");
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin");
}

const acceptBidSchema = z.object({
  bidId: z.string().min(1),
});

export async function acceptBid(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = acceptBidSchema.safeParse({ bidId: formData.get("bidId") });
  if (!parsed.success) throw new Error("Invalid bid");
  const { bidId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({
      where: { id: bidId },
      include: { order: true, pro: true },
    });
    if (!bid) throw new Error("Bid not found");
    if (bid.order.status !== "OPEN") {
      throw new Error("Order is not open for assignment");
    }

    await tx.order.update({
      where: { id: bid.orderId },
      data: {
        proId: bid.proId,
        acceptedBidId: bid.id,
        finalPrice: bid.amount,
        status: "ASSIGNED",
      },
    });

    await tx.bid.update({
      where: { id: bid.id },
      data: { status: "ACCEPTED" },
    });

    await tx.bid.updateMany({
      where: {
        orderId: bid.orderId,
        id: { not: bid.id },
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    await logActivity(tx, {
      orderId: bid.orderId,
      type: "BID_ACCEPTED",
      message: `Admin accepted ${bid.pro.name ?? bid.pro.email} at ${formatCents(bid.amount)}.`,
      actorUserId: admin.id,
      metadata: { bidId: bid.id, amount: bid.amount, proId: bid.proId },
    });
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard");
}

export async function withdrawBid(formData: FormData) {
  const user = await requireRole(["PRO", "ADMIN"]);
  const bidId = String(formData.get("bidId") ?? "");
  if (!bidId) throw new Error("Missing bid id");

  const bid = await prisma.bid.findUnique({ where: { id: bidId } });
  if (!bid) throw new Error("Bid not found");
  if (bid.proId !== user.id && user.role !== "ADMIN") {
    throw new Error("You can only withdraw your own bids");
  }
  if (bid.status !== "PENDING") {
    throw new Error("Only pending bids can be withdrawn");
  }

  await prisma.$transaction(async (tx) => {
    await tx.bid.update({
      where: { id: bidId },
      data: { status: "WITHDRAWN" },
    });
    await logActivity(tx, {
      orderId: bid.orderId,
      type: "BID_WITHDRAWN",
      message: "Pro withdrew their bid.",
      actorUserId: user.id,
      visibleToUser: false,
    });
  });

  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/orders/${bid.orderId}`);
}

export async function becomePro() {
  const user = await requireUser();
  if (user.role === "ADMIN" || user.role === "PRO") return;
  // Mark as having a draft application so the user is sent through the
  // application flow rather than auto-promoted.
  await prisma.user.update({
    where: { id: user.id },
    data: { proApplicationStatus: "NOT_APPLIED" },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard/pro/apply");
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
