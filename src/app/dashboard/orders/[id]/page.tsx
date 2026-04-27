import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, timeAgo } from "@/lib/utils";
import {
  OrderStatusPill,
  PaymentStatusPill,
  BidStatusPill,
} from "@/components/order-status-pill";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderChat } from "@/components/order-chat";
import { RefundForm } from "@/components/refund-form";
import { ReviewForm } from "@/components/review-form";
import { ArrowLeft, Star } from "lucide-react";

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/dashboard/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      pro: { select: { id: true, name: true, email: true, image: true, proHeadline: true } },
      bids: {
        orderBy: [{ status: "asc" }, { amount: "asc" }],
        include: { pro: { select: { name: true, email: true, image: true } } },
      },
      payment: true,
      review: true,
      conversation: {
        include: {
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { name: true, email: true, image: true, role: true } },
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        where: { visibleToUser: true },
        include: { actor: { select: { name: true, email: true, image: true } } },
      },
    },
  });

  if (!order) return notFound();
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const opts = (order.options ?? {}) as Prisma.JsonObject;
  const amount = order.finalPrice ?? order.basePrice;
  const refundRequested = order.refundRequestStatus === "REQUESTED";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[color:var(--muted)] hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
              {order.service}
              <OrderStatusPill status={order.status} />
              <PaymentStatusPill status={order.paymentStatus} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{order.title}</h1>
            <div className="mt-1 text-sm text-[color:var(--muted)]">
              Placed {formatDate(order.createdAt)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Total
            </div>
            <div className="font-mono text-2xl">{formatPrice(amount)}</div>
            {order.paymentStatus !== "PAID" && (
              <Link
                href={`/checkout/${order.id}`}
                className="btn-primary mt-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
              >
                Continue checkout
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Object.entries(opts).map(([k, v]) => (
            <div
              key={k}
              className="rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                {k}
              </div>
              <div className="truncate text-sm text-white">
                {Array.isArray(v) ? v.join(", ") || "—" : String(v) || "—"}
              </div>
            </div>
          ))}
        </div>

        {order.pro && (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 p-3">
            <div className="grid size-10 place-items-center rounded-md bg-gradient-to-br from-[#1c2030] to-[#11141d] text-sm font-semibold text-white">
              {(order.pro.name ?? order.pro.email ?? "P")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">
                Pro: {order.pro.name ?? order.pro.email}
              </div>
              {order.pro.proHeadline && (
                <div className="truncate text-xs text-[color:var(--muted)]">
                  {order.pro.proHeadline}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5">
          <RefundForm
            orderId={order.id}
            paid={order.paymentStatus === "PAID"}
            alreadyRequested={refundRequested}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
            Bids ({order.bids.length})
          </div>
          {order.bids.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[color:var(--muted)]">
              No bids yet — Pros will be notified.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {order.bids.map((b) => (
                <li
                  key={b.id}
                  className="grid items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      {b.pro.name ?? b.pro.email}
                    </div>
                    <div className="text-[11px] text-[color:var(--muted)]">
                      {timeAgo(b.createdAt)}
                      {b.message ? ` · "${b.message}"` : ""}
                    </div>
                  </div>
                  <BidStatusPill status={b.status} />
                  <div className="font-mono text-sm">
                    {formatPrice(b.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
            Activity
          </div>
          <OrderTimeline activities={order.activities} />
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-3 font-medium">Messages</div>
        <OrderChat
          orderId={order.id}
          messages={order.conversation?.messages ?? []}
        />
      </section>

      {order.status === "COMPLETED" && order.proId && (
        <section className="card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Star className="size-4 text-yellow-400" />
            Review your Pro
          </div>
          {order.review ? (
            <div className="mt-3 rounded-md border border-[color:var(--border)] bg-[#0a0d15] p-3 text-sm">
              <div className="text-xs text-[color:var(--muted)]">
                Your review · {order.review.rating}/5 ·{" "}
                {timeAgo(order.review.createdAt)}
              </div>
              {order.review.title && (
                <div className="mt-1 font-medium">{order.review.title}</div>
              )}
              {order.review.body && <div className="mt-1">{order.review.body}</div>}
            </div>
          ) : (
            <div className="mt-3">
              <ReviewForm orderId={order.id} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
