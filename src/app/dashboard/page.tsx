import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, timeAgo } from "@/lib/utils";
import {
  OrderStatusPill,
  PaymentStatusPill,
} from "@/components/order-status-pill";
import { BecomeProButton } from "@/components/become-pro-button";
import { ArrowRight, ChevronRight, Crosshair } from "lucide-react";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; applied?: string }>;
}) {
  const session = (await auth())!;
  const { orderId, applied } = await searchParams;

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      _count: { select: { bids: true } },
      pro: { select: { name: true, email: true, image: true } },
    },
  });

  const justPlaced = orderId ? orders.find((o) => o.id === orderId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Dashboard</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Track your orders, see incoming bids, and manage your services.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/dashboard/disputes" className="btn-ghost rounded-md px-3 py-1.5">
            Disputes
          </Link>
          <Link href="/dashboard/referrals" className="btn-ghost rounded-md px-3 py-1.5">
            Referrals
          </Link>
          <Link href="/settings/two-factor" className="btn-ghost rounded-md px-3 py-1.5">
            Security
          </Link>
        </div>
      </div>

      {applied === "1" && (
        <div className="card border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4 text-sm">
          Pro application submitted — we&apos;ll notify you when it&apos;s
          reviewed.
        </div>
      )}

      {justPlaced && (
        <div className="card flex items-start gap-3 border-[color:var(--success)]/40 p-4">
          <div className="mt-0.5 size-2 rounded-full bg-[color:var(--success)] shadow-[0_0_8px_var(--success)]" />
          <div>
            <div className="text-sm font-medium">
              Order placed: {justPlaced.title}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              Pros are being notified. Check back here to see incoming bids.
            </div>
          </div>
        </div>
      )}

      {session.user.role === "USER" && (
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="font-medium">
              Are you a top-tier ARC Raiders player?
            </div>
            <p className="text-sm text-[color:var(--muted)]">
              Apply for a Pro account to bid on open orders.
            </p>
          </div>
          <BecomeProButton />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="font-medium">Your orders</div>
          <Link
            href="/services/arc-raiders"
            className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
          >
            <Crosshair className="size-3.5" /> New order
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#0a0d15]">
              <Crosshair className="size-5 text-[color:var(--muted)]" />
            </div>
            <div className="mt-3 font-medium">No orders yet</div>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Configure an ARC Raiders service and Pros will start bidding.
            </p>
            <Link
              href="/services/arc-raiders"
              className="btn-primary mt-5 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
            >
              Browse services <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="grid items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.title}</div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {timeAgo(o.createdAt)} · {o._count.bids} bid
                      {o._count.bids === 1 ? "" : "s"}
                      {o.pro
                        ? ` · Assigned to ${o.pro.name ?? o.pro.email}`
                        : ""}
                    </div>
                  </div>
                  <PaymentStatusPill status={o.paymentStatus} />
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
    </div>
  );
}
