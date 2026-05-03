import Link from "next/link";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice, timeAgo } from "@/lib/utils";
import {
  OrderStatusPill,
  PaymentStatusPill,
} from "@/components/order-status-pill";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Admin · ProBoost.gg",
};

const STATUS_FILTERS: ("ALL" | OrderStatus)[] = [
  "ALL",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "REFUND_REVIEW",
  "REFUNDED",
  "CANCELLED",
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const statusFilter = (sp.status as OrderStatus | "ALL" | undefined) ?? "ALL";
  const sort = sp.sort ?? "newest";

  const where: Prisma.OrderWhereInput = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { id: { equals: q } },
    ];
  }

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "price_asc"
        ? { basePrice: "asc" }
        : sort === "price_desc"
          ? { basePrice: "desc" }
          : { createdAt: "desc" };

  const [orders, stats, pendingApps] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      take: 100,
      include: {
        _count: { select: { bids: true } },
        customer: { select: { name: true, email: true } },
        pro: { select: { name: true, email: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.proApplication.count({ where: { status: "PENDING" } }),
  ]);

  const statCount = (s: OrderStatus) =>
    stats.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[color:var(--accent)]" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin Marketplace
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/applications"
            className="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
          >
            Pro applications
            {pendingApps > 0 && (
              <span className="rounded-full bg-[color:var(--accent)]/20 px-2 py-0.5 text-[10px] text-[color:var(--accent)]">
                {pendingApps}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/admin/disputes"
            className="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
          >
            Disputes
          </Link>
          <Link
            href="/dashboard/admin/analytics"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Analytics
          </Link>
          <Link
            href="/dashboard/admin/auto-assignment"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Auto-assign
          </Link>
          <Link
            href="/dashboard/admin/blog"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Blog
          </Link>
          <Link
            href="/dashboard/admin/audit"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Audit
          </Link>
          <Link
            href="/dashboard/admin/emails"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Emails
          </Link>
          <Link
            href="/dashboard/admin/offers"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Offers
          </Link>
          <Link
            href="/dashboard/admin/coupons"
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Coupons
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Open" value={statCount("OPEN")} accent />
        <Stat label="Assigned" value={statCount("ASSIGNED")} />
        <Stat label="In progress" value={statCount("IN_PROGRESS")} />
        <Stat label="Completed" value={statCount("COMPLETED")} />
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, customer, or order id…"
          className="input-base min-w-[260px] flex-1"
        />
        <select name="status" defaultValue={statusFilter} className="input-base">
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="input-base">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_desc">Price ↓</option>
          <option value="price_asc">Price ↑</option>
        </select>
        <button className="btn-primary rounded-md px-3 py-1.5 text-sm">Filter</button>
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
          Orders ({orders.length})
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted)]">
            No matching orders.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/admin/orders/${o.id}`}
                  className="grid items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.title}</div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {o.customer.name ?? o.customer.email} · {timeAgo(o.createdAt)}
                      {o.pro ? ` · Pro: ${o.pro.name ?? o.pro.email}` : ""}
                    </div>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[#0a0d15] px-2 py-0.5 text-[11px] text-[color:var(--muted)]">
                    {o._count.bids} bid{o._count.bids === 1 ? "" : "s"}
                  </span>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
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
          (accent ? "text-gradient" : "text-white")
        }
      >
        {value}
      </div>
    </div>
  );
}
