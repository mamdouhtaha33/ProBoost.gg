import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, timeAgo } from "@/lib/utils";
import { BidForm } from "@/components/bid-form";
import { BidStatusPill, OrderStatusPill } from "@/components/order-status-pill";
import { Crosshair, Trophy, Headset } from "lucide-react";
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

  const [openOrders, myBids] = await Promise.all([
    prisma.order.findMany({
      where: { status: "OPEN" },
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
      where: { proId, status: { in: ["PENDING", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        order: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pro Dashboard</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Browse open orders and place competitive bids. The admin reviews and
          locks the winning Pro to each order.
        </p>
      </div>

      {/* Active bids summary */}
      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
          My active bids
        </div>
        {myBids.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--muted)]">
            No active bids yet — pick an open order below to get started.
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

      {/* Open orders */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Open orders ({openOrders.length})</h2>
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
                          {service} · {region} · {platform} · {timeAgo(o.createdAt)} · {o._count.bids} bid
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
                      <div className="font-mono text-lg">{formatPrice(o.basePrice)}</div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[color:var(--border)] pt-4">
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
    </div>
  );
}
