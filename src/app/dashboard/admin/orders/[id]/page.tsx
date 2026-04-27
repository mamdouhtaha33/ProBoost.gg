import { notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { acceptBid } from "@/app/actions/orders";
import {
  decideRefund,
} from "@/app/actions/refunds";
import {
  manuallyAssignPro,
  setInternalNotes,
  updateOrderStatus,
} from "@/app/actions/admin";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils";
import {
  OrderStatusPill,
  BidStatusPill,
  PaymentStatusPill,
} from "@/components/order-status-pill";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderChat } from "@/components/order-chat";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

const ALL_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUND_REVIEW",
  "REFUNDED",
] as const;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      pro: true,
      payment: true,
      bids: {
        orderBy: [{ status: "asc" }, { amount: "asc" }],
        include: { pro: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, email: true, image: true } } },
      },
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { name: true, email: true, image: true, role: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return notFound();

  const pros = await prisma.user.findMany({
    where: { OR: [{ role: "PRO" }, { role: "ADMIN" }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true },
    take: 200,
  });

  const opts = (order.options ?? {}) as Prisma.JsonObject;
  const isOpen = order.status === "OPEN";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1 text-sm text-[color:var(--muted)] hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back to admin
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
              By {order.customer.name ?? order.customer.email} · placed{" "}
              {formatDate(order.createdAt)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Suggested
            </div>
            <div className="font-mono text-2xl">{formatPrice(order.basePrice)}</div>
            {order.finalPrice != null && (
              <div className="mt-1 text-xs">
                Final: <span className="font-mono">{formatPrice(order.finalPrice)}</span>
              </div>
            )}
          </div>
        </div>

        {order.description && (
          <p className="mt-4 max-w-3xl text-sm text-[color:var(--muted)]">
            {order.description}
          </p>
        )}

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
          <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3 py-1.5 text-sm text-[color:var(--accent)]">
            <ShieldCheck className="size-4" />
            Locked to {order.pro.name ?? order.pro.email}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <div className="font-medium">Status</div>
          <form action={updateOrderStatus} className="mt-3 flex gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <select name="status" defaultValue={order.status} className="input-base">
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
              Update
            </button>
          </form>
        </div>

        <div className="card p-5">
          <div className="font-medium">Manual assignment</div>
          <form action={manuallyAssignPro} className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <input type="hidden" name="orderId" value={order.id} />
            <select name="proId" className="input-base" defaultValue={order.proId ?? ""}>
              <option value="">Select Pro…</option>
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.email}
                </option>
              ))}
            </select>
            <input
              name="finalPrice"
              type="number"
              min={0}
              defaultValue={(order.finalPrice ?? order.basePrice) || 0}
              className="input-base font-mono"
              placeholder="Final (cents)"
            />
            <button className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
              Assign
            </button>
          </form>
        </div>
      </div>

      {order.refundRequestStatus === "REQUESTED" && (
        <div className="card border-orange-400/30 bg-orange-400/5 p-5">
          <div className="font-medium">Refund / cancellation request</div>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Customer reason: {order.cancellationReason ?? "—"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <form action={decideRefund} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="decision" value="APPROVE" />
              <input
                name="note"
                placeholder="Note for customer (optional)"
                className="input-base"
              />
              <button className="btn-primary w-full rounded-md px-3 py-1.5 text-sm font-medium">
                Approve refund
              </button>
            </form>
            <form action={decideRefund} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="decision" value="REJECT" />
              <input
                name="note"
                placeholder="Reason (optional)"
                className="input-base"
              />
              <button className="btn-ghost w-full rounded-md px-3 py-1.5 text-sm">
                Reject
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="font-medium">Bids ({order.bids.length})</div>
          {!isOpen && (
            <div className="text-xs text-[color:var(--muted)]">
              Bidding closed — order is {order.status.toLowerCase().replace(/_/g, " ")}.
            </div>
          )}
        </div>
        {order.bids.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--muted)]">
            No bids yet. Pros will be notified.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {order.bids.map((b) => (
              <li
                key={b.id}
                className="grid items-center gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {b.pro.name ?? b.pro.email}
                  </div>
                  <div className="truncate text-xs text-[color:var(--muted)]">
                    {timeAgo(b.createdAt)}
                    {b.message ? ` · "${b.message}"` : ""}
                  </div>
                </div>
                <BidStatusPill status={b.status} />
                <div className="font-mono text-sm">{formatPrice(b.amount)}</div>
                {isOpen && b.status === "PENDING" ? (
                  <form action={acceptBid}>
                    <input type="hidden" name="bidId" value={b.id} />
                    <button className="btn-primary inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium">
                      <Check className="size-4" /> Accept
                    </button>
                  </form>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 font-medium">Internal notes</div>
          <form action={setInternalNotes} className="space-y-2">
            <input type="hidden" name="orderId" value={order.id} />
            <textarea
              name="note"
              rows={4}
              defaultValue={order.internalNotes ?? ""}
              className="input-base w-full"
              placeholder="Visible to admins only…"
            />
            <button className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
              Save notes
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
            Activity
          </div>
          <OrderTimeline activities={order.activities} showInternal />
        </div>
      </div>

      <section className="card p-5">
        <div className="mb-3 font-medium">Messages</div>
        <OrderChat
          orderId={order.id}
          messages={order.conversation?.messages ?? []}
          canPostInternal
        />
      </section>
    </div>
  );
}
