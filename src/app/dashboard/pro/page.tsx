import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, timeAgo } from "@/lib/utils";
import { BidForm } from "@/components/bid-form";
import {
  BidStatusPill,
  OrderStatusPill,
  PaymentStatusPill,
} from "@/components/order-status-pill";
import { Crosshair, Trophy, Headset, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";

const ICONS = {
  boosting: Trophy,
  coaching: Headset,
  carry: Crosshair,
} as const;

export const metadata = {
  title: "Pro Dashboard · ProBoost.gg",
};

export default async function ProDashboardPage() {
  const session = (await auth())!;
  const proId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  const [me, openOrders, myBids, assignedOrders, completedOrders, earningsAgg] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: proId },
        select: { proApplicationStatus: true, role: true },
      }),
      prisma.order.findMany({
        where: { status: "OPEN", paymentStatus: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          bids: {
            where: { proId },
            select: { id: true, amount: true, message: true },
            take: 1,
          },
          _count: { select: { bids: true } },
        },
      }),
      prisma.bid.findMany({
        where: { proId },
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          order: {
            select: { id: true, title: true, status: true, paymentStatus: true },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          proId,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "DELIVERED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.order.findMany({
        where: { proId, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.order.aggregate({
        where: { proId, status: "COMPLETED", paymentStatus: "PAID" },
        _sum: { finalPrice: true },
        _count: { _all: true },
      }),
    ]);

  const showApplyCta =
    !isAdmin &&
    me?.role !== "PRO" &&
    me?.proApplicationStatus !== "PENDING";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pro Dashboard</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Browse paid open orders and place competitive bids. The admin reviews
          and locks the winning Pro to each order.
        </p>
      </div>

      {showApplyCta && (
        <div className="card flex flex-col items-start justify-between gap-3 border-yellow-400/30 bg-yellow-400/5 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-medium">
              Submit a Pro application to start bidding.
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Admin approval is required before your bids appear to customers.
            </p>
          </div>
          <Link
            href="/dashboard/pro/apply"
            className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Apply now
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active assignments" value={assignedOrders.length} />
        <Stat label="Completed jobs" value={earningsAgg._count._all} />
        <Stat
          label="Earnings (paid)"
          value={formatPrice(earningsAgg._sum.finalPrice ?? 0)}
          mono
          accent
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
          Active assignments ({assignedOrders.length})
        </div>
        {assignedOrders.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--muted)]">
            Nothing assigned to you right now.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {assignedOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/pro/orders/${o.id}`}
                  className="grid items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.title}</div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {o.service} · {timeAgo(o.updatedAt)}
                    </div>
                  </div>
                  <OrderStatusPill status={o.status} />
                  <div className="font-mono text-sm">
                    {formatPrice(o.finalPrice ?? o.basePrice)}
                  </div>
                  <ChevronRight className="size-4 text-[color:var(--muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
          My bids
        </div>
        {myBids.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--muted)]">
            No bids yet — pick an open order below to get started.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {myBids.map((b) => (
              <li
                key={b.id}
                className="grid items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <div className="min-w-0 truncate text-sm">{b.order.title}</div>
                <BidStatusPill status={b.status} />
                <OrderStatusPill status={b.order.status} />
                <div className="font-mono text-sm">{formatPrice(b.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">
          Open paid orders ({openOrders.length})
        </h2>
        {openOrders.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[color:var(--muted)]">
            No open orders right now. Check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {openOrders.map((o) => {
              const opts = (o.options ?? {}) as Prisma.JsonObject;
              const service = (opts["service"] as string | undefined) ?? "boosting";
              const Icon = ICONS[service as keyof typeof ICONS] ?? Crosshair;
              const region = (opts["region"] as string | undefined) ?? "—";
              const platform = (opts["platform"] as string | undefined) ?? "—";
              const existingBid = o.bids[0];
              return (
                <div key={o.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 place-items-center rounded-md bg-gradient-to-br from-[#1c2030] to-[#11141d]">
                        <Icon className="size-4 text-[color:var(--primary)]" />
                      </div>
                      <div>
                        <div className="font-semibold">{o.title}</div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {service} · {region} · {platform} ·{" "}
                          {timeAgo(o.createdAt)} · {o._count.bids} bid
                          {o._count.bids === 1 ? "" : "s"}
                        </div>
                        {o.description && (
                          <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
                            {o.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
                        Suggested
                      </div>
                      <div className="font-mono text-lg">
                        {formatPrice(o.basePrice)}
                      </div>
                      <div className="mt-1">
                        <PaymentStatusPill status={o.paymentStatus} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <BidForm
                      orderId={o.id}
                      suggested={o.basePrice}
                      existingBid={existingBid}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {completedOrders.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
            Recent completed jobs
          </div>
          <ul className="divide-y divide-[color:var(--border)]">
            {completedOrders.map((o) => (
              <li
                key={o.id}
                className="grid items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <div className="min-w-0 truncate text-sm">{o.title}</div>
                <OrderStatusPill status={o.status} />
                <div className="font-mono text-sm">
                  {formatPrice(o.finalPrice ?? o.basePrice)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: number | string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      <div
        className={
          "mt-1 text-3xl font-semibold " +
          (accent ? "text-gradient" : "text-white") +
          (mono ? " font-mono" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
