import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, timeAgo } from "@/lib/utils";
import { OrderStatusPill } from "@/components/order-status-pill";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Admin · ProBoost.gg",
};

export default async function AdminDashboardPage() {
  const orders = await prisma.order.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      _count: { select: { bids: true } },
      customer: { select: { name: true, email: true } },
      pro: { select: { name: true, email: true } },
    },
  });

  const stats = {
    open: orders.filter((o) => o.status === "OPEN").length,
    assigned: orders.filter((o) => o.status === "ASSIGNED").length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-[color:var(--accent)]" />
        <h1 className="text-2xl font-semibold tracking-tight">Admin Marketplace</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Open Orders" value={stats.open} accent />
        <Stat label="Assigned" value={stats.assigned} />
        <Stat label="Completed" value={stats.completed} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
          All orders
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted)]">
            No orders yet.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/admin/orders/${o.id}`}
                  className="grid items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_auto_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {o.title}
                    </div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {o.customer.name ?? o.customer.email} · {timeAgo(o.createdAt)}
                      {o.pro ? ` · Pro: ${o.pro.name ?? o.pro.email}` : ""}
                    </div>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-[#0a0d15] px-2 py-0.5 text-[11px] text-[color:var(--muted)]">
                    {o._count.bids} bid{o._count.bids === 1 ? "" : "s"}
                  </span>
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
