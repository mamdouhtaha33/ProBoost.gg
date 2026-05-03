"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, requireRole, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import {
  computeBasePriceFor,
  defaultOrderTitle,
  getGameBySlug,
  orderOptionsSchema,
  validateOrderOptionsForGame,
} from "@/lib/games";
import { sendEmail, renderHtml, escapeHtml } from "@/lib/email";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { recomputeProStats } from "@/lib/pro-rank";
import { postDiscord, colorFor } from "@/lib/discord";

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

  const gameSlug = String(formData.get("gameSlug") ?? "arc-raiders");
  const game = getGameBySlug(gameSlug);
  if (!game) return { ok: false, error: "Unknown game." };

  const rl = await rateLimit(`createOrder:${session.user.id}`, 10, 60);
  if (!rl.allowed) {
    return { ok: false, error: "Too many orders — slow down a moment." };
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

  const optsErr = validateOrderOptionsForGame(game, opts);
  if (optsErr) {
    return { ok: false, error: optsErr };
  }

  if (opts.service === "boosting") {
    if (!opts.currentRank || !opts.targetRank) {
      return { ok: false, error: "Pick both your current and target rank." };
    }
  }

  const basePrice = computeBasePriceFor(game, opts);
  if (basePrice <= 0) {
    return { ok: false, error: "Configure your order — the price is $0." };
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        customerId: session.user.id,
        service: opts.service,
        title: defaultOrderTitle(game, opts),
        description: typeof opts.notes === "string" ? opts.notes : "",
        options: { ...opts, gameSlug } as object,
        basePrice,
        status: "OPEN",
        paymentStatus: "PENDING",
        game: game.name,
        gameSlug: game.slug,
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
    await logAudit(tx, {
      actorUserId: session.user.id,
      action: "order.create",
      targetType: "ORDER",
      targetId: o.id,
      after: { title: o.title, basePrice, gameSlug: game.slug },
    });
    return o;
  });

  // Out-of-band notifications
  await notify(prisma, {
    userId: session.user.id,
    type: "ORDER_CREATED",
    title: "Order placed",
    body: `${order.title} is live. Pros are placing bids.`,
    link: `/dashboard/orders/${order.id}`,
  });
  if (session.user.email) {
    await sendEmail({
      to: session.user.email,
      template: "order.created",
      subject: `Your ProBoost.gg order is live — ${order.title}`,
      html: renderHtml({
        title: "Order placed",
        bodyHtml: `<p>We received your order: <strong>${escapeHtml(order.title)}</strong>.</p><p>Pros are bidding now. You'll get an email when one is selected.</p>`,
        ctaUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/orders/${order.id}`,
        ctaLabel: "Track order",
      }),
    });
  }
  await postDiscord(`📦 New order placed`, [
    {
      title: order.title,
      color: colorFor("info"),
      fields: [
        { name: "Game", value: game.name, inline: true },
        { name: "Base price (cents)", value: String(basePrice), inline: true },
      ],
    },
  ]);

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

  const rl = await rateLimit(`placeBid:${user.id}`, 30, 60);
  if (!rl.allowed) throw new Error("Slow down — too many bids in a minute.");

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
    select: {
      id: true,
      status: true,
      basePrice: true,
      gameSlug: true,
      service: true,
      customerId: true,
      title: true,
    },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "OPEN") throw new Error("Order is no longer open for bids");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.bid.findUnique({
      where: { orderId_proId: { orderId, proId: user.id } },
    });
    const bid = await tx.bid.upsert({
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
      metadata: { amount, bidId: bid.id },
      visibleToUser: true,
    });
    await logAudit(tx, {
      actorUserId: user.id,
      action: existing ? "bid.update" : "bid.create",
      targetType: "BID",
      targetId: bid.id,
      after: { amount },
    });
  });

  // Notify customer
  await notify(prisma, {
    userId: order.customerId,
    type: "BID_PLACED",
    title: "New bid received",
    body: `A Pro bid ${formatCents(amount)} on "${order.title}".`,
    link: `/dashboard/orders/${orderId}`,
  });

  // Try auto-assignment
  await tryAutoAssign(orderId);

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

  await acceptBidById(bidId, admin.id, "manual");

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/pro");
  revalidatePath("/dashboard");
}

async function acceptBidById(
  bidId: string,
  actorUserId: string | null,
  source: "manual" | "auto",
) {
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
        autoAssignedFromBidId: source === "auto" ? bid.id : null,
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
      message:
        source === "auto"
          ? `Auto-assigned to ${bid.pro.name ?? bid.pro.email} at ${formatCents(bid.amount)}.`
          : `Admin accepted ${bid.pro.name ?? bid.pro.email} at ${formatCents(bid.amount)}.`,
      actorUserId: actorUserId,
      metadata: {
        bidId: bid.id,
        amount: bid.amount,
        proId: bid.proId,
        source,
      },
    });
    await logAudit(tx, {
      actorUserId,
      action: source === "auto" ? "bid.auto_accept" : "bid.accept",
      targetType: "BID",
      targetId: bid.id,
      after: { proId: bid.proId, amount: bid.amount, orderId: bid.orderId },
    });
  });

  // Notify pro + customer; email pro
  const fullBid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      pro: true,
      order: { select: { id: true, title: true, customerId: true } },
    },
  });
  if (fullBid) {
    await notify(prisma, {
      userId: fullBid.proId,
      type: "BID_ACCEPTED",
      title: "Bid accepted!",
      body: `Your bid on "${fullBid.order.title}" was accepted.`,
      link: `/dashboard/pro/orders/${fullBid.order.id}`,
    });
    await notify(prisma, {
      userId: fullBid.order.customerId,
      type: "BID_ACCEPTED",
      title: "Pro assigned",
      body: `Your order "${fullBid.order.title}" is now in progress with a Pro.`,
      link: `/dashboard/orders/${fullBid.order.id}`,
    });
    if (fullBid.pro.email) {
      await sendEmail({
        to: fullBid.pro.email,
        template: "bid.accepted",
        subject: "Your bid was accepted",
        html: renderHtml({
          title: "Bid accepted!",
          bodyHtml: `<p>Your bid on <strong>${escapeHtml(fullBid.order.title)}</strong> was accepted. Open the order to start working.</p>`,
          ctaUrl: `${process.env.NEXTAUTH_URL ?? ""}/dashboard/pro/orders/${fullBid.order.id}`,
          ctaLabel: "Open order",
        }),
      });
    }
  }
}

async function tryAutoAssign(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      bids: { where: { status: "PENDING" }, include: { pro: true }, orderBy: { amount: "asc" } },
    },
  });
  if (!order || order.status !== "OPEN") return;
  if (order.bids.length === 0) return;

  const rules = await prisma.autoAssignmentRule.findMany({
    where: {
      enabled: true,
      OR: [{ gameSlug: null }, { gameSlug: order.gameSlug }],
      AND: [{ OR: [{ service: null }, { service: order.service }] }],
    },
    orderBy: [{ priority: "desc" }],
  });

  for (const rule of rules) {
    const minMatch = rankAtLeast(rule.minProRank);
    for (const bid of order.bids) {
      const pct = Math.round((bid.amount / order.basePrice) * 100);
      if (pct < rule.minBidPercent) continue;
      if (pct > rule.maxBidPercent) continue;
      if (rule.requireProVerified && !bid.pro.proVerified) continue;
      if (!minMatch(bid.pro.proRank)) continue;
      try {
        await acceptBidById(bid.id, null, "auto");
        return;
      } catch {
        // race with another rule firing — skip
        return;
      }
    }
  }
}

const RANK_ORDER = ["UNRANKED", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;
type RankLevel = (typeof RANK_ORDER)[number];

function rankAtLeast(min: RankLevel) {
  const minIdx = RANK_ORDER.indexOf(min);
  return (rank: RankLevel) => RANK_ORDER.indexOf(rank) >= minIdx;
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
  await prisma.user.update({
    where: { id: user.id },
    data: { proApplicationStatus: "NOT_APPLIED" },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard/pro/apply");
}

export async function markCompletedAndRecompute(orderId: string) {
  await requireRole("ADMIN");
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: "COMPLETED" },
  });
  if (order.proId) await recomputeProStats(order.proId);
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
