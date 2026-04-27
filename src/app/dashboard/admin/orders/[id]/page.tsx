import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { acceptBid } from "@/app/actions/orders";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils";
import { OrderStatusPill, BidStatusPill } from "@/components/order-status-pill";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";

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
      bids: {
        orderBy: [{ status: "asc" }, { amount: "asc" }],
        include: { pro: true },
      },
    },
  });
  if (!order) return notFound();

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
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
              {order.service}
              <OrderStatusPill status={order.status} />
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

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="font-medium">Bids ({order.bids.length})</div>
          {!isOpen && (
            <div className="text-xs text-[color:var(--muted)]">
              Bidding closed — order is {order.status.toLowerCase().replace("_", " ")}.
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
                    <button
                      type="submit"
                      className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
                    >
                      <Check className="size-3.5" /> Accept
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
    </div>
  );
}
