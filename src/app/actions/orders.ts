"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, requireRole, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  // Pull options from the form. addons is a multi-value entry.
  const raw = {
    service:     formData.get("service"),
    region:      formData.get("region"),
    platform:    formData.get("platform"),
    currentRank: formData.get("currentRank") || undefined,
    targetRank:  formData.get("targetRank") || undefined,
    hours:       formData.get("hours") || undefined,
    runs:        formData.get("runs") || undefined,
    addons:      formData.getAll("addons").map(String),
    notes:       formData.get("notes") || "",
  };

  const parsed = orderOptionsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const opts = parsed.data;

  // Cross-field checks
  if (opts.service === "boosting") {
    if (!opts.currentRank || !opts.targetRank) {
      return { ok: false, error: "Pick both your current and target rank." };
    }
  }

  const basePrice = computeBasePrice(opts);
  if (basePrice <= 0) {
    return { ok: false, error: "Configure your order — the price is $0." };
  }

  const order = await prisma.order.create({
    data: {
      customerId: session.user.id,
      service: opts.service,
      title: defaultTitle(opts),
      description: opts.notes || "",
      options: opts as object,
      basePrice,
      status: "OPEN",
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard/admin");
  redirect(`/dashboard?orderId=${order.id}`);
}

// ---------- BIDDING ----------

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

  // Pros can update their existing bid (1 active bid per pro per order)
  await prisma.bid.upsert({
    where: { orderId_proId: { orderId, proId: user.id } },
    update: { amount, message, status: "PENDING" },
    create: { orderId, proId: user.id, amount, message, status: "PENDING" },
  });

  revalidatePath("/dashboard/pro");
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/admin");
}

const acceptBidSchema = z.object({
  bidId: z.string().min(1),
});

export async function acceptBid(formData: FormData) {
  await requireRole("ADMIN");

  const parsed = acceptBidSchema.safeParse({ bidId: formData.get("bidId") });
  if (!parsed.success) throw new Error("Invalid bid");
  const { bidId } = parsed.data;

  // Atomic: lock the order to the winning Pro and reject the others.
  await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({
      where: { id: bidId },
      include: { order: true },
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

  await prisma.bid.update({
    where: { id: bidId },
    data: { status: "WITHDRAWN" },
  });
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard/admin");
}

// Self-service: bootstrap upgrade from USER → PRO (anyone can become a Pro).
// Admin promotion is bootstrapped via ADMIN_EMAILS env var.
export async function becomePro() {
  const user = await requireUser();
  if (user.role === "ADMIN") return;
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "PRO" },
  });
  revalidatePath("/dashboard");
}
