import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [
    totalRevenueAgg,
    last30RevenueAgg,
    paidPaymentsCount,
    completedOrders,
    activeOrders,
    openOrders,
    avgRatingAgg,
    topProsRaw,
    topGames,
    refundedAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID", paidAt: { gte: thirtyDaysAgo() } },
    }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.order.count({ where: { status: "OPEN" } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.order.groupBy({
      by: ["proId"],
      where: { status: "COMPLETED", proId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { proId: "desc" } },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["gameSlug"],
      _count: { _all: true },
      orderBy: { _count: { gameSlug: "desc" } },
      take: 6,
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "REFUNDED" },
    }),
  ]);

  const proIds = topProsRaw.map((t) => t.proId).filter((id): id is string => !!id);
  const proRecords = await prisma.user.findMany({
    where: { id: { in: proIds } },
    select: { id: true, name: true, handle: true, proRank: true },
  });
  const topPros = topProsRaw.map((t) => ({
    pro: proRecords.find((p) => p.id === t.proId),
    jobs: t._count._all,
  }));

  const aov =
    paidPaymentsCount > 0
      ? Math.round((totalRevenueAgg._sum.amount ?? 0) / paidPaymentsCount)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total revenue (PAID)" value={fmt(totalRevenueAgg._sum.amount ?? 0)} />
        <Stat label="Last 30 days" value={fmt(last30RevenueAgg._sum.amount ?? 0)} />
        <Stat label="AOV" value={fmt(aov)} />
        <Stat label="Refunded" value={fmt(refundedAgg._sum.amount ?? 0)} />
        <Stat label="Open orders" value={String(openOrders)} />
        <Stat label="In flight" value={String(activeOrders)} />
        <Stat label="Completed" value={String(completedOrders)} />
        <Stat
          label="Avg rating"
          value={(avgRatingAgg._avg.rating ?? 0).toFixed(2)}
        />
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Top Pros (by completed jobs)
          </h2>
          <div className="mt-3 space-y-2">
            {topPros.length === 0 && (
              <div className="text-sm text-[color:var(--muted)]">No data yet.</div>
            )}
            {topPros.map(({ pro, jobs }, idx) => (
              <div
                key={pro?.id ?? `pro-${idx}`}
                className="flex items-center justify-between rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
              >
                <div>
                  <div>{pro?.name ?? pro?.handle ?? "Unknown"}</div>
                  <div className="text-[11px] text-[color:var(--muted)]">{pro?.proRank}</div>
                </div>
                <div className="font-mono">{jobs}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Orders by game
          </h2>
          <div className="mt-3 space-y-2">
            {topGames.map((g) => (
              <div
                key={g.gameSlug}
                className="flex items-center justify-between rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
              >
                <div>{g.gameSlug ?? "—"}</div>
                <div className="font-mono">{g._count._all}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function thirtyDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}
