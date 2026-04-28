import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const disputes = await prisma.dispute.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { id: true, title: true, game: true } },
      opener: { select: { name: true, email: true } },
    },
  });

  const counts = {
    open: disputes.filter((d) => d.status === "OPEN").length,
    review: disputes.filter((d) => d.status === "UNDER_REVIEW").length,
    awaiting: disputes.filter((d) =>
      ["AWAITING_USER", "AWAITING_PRO"].includes(d.status),
    ).length,
    closed: disputes.filter((d) =>
      ["RESOLVED_FOR_USER", "RESOLVED_FOR_PRO", "CLOSED"].includes(d.status),
    ).length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Disputes</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={counts.open} />
        <Stat label="Under review" value={counts.review} />
        <Stat label="Awaiting party" value={counts.awaiting} />
        <Stat label="Closed" value={counts.closed} />
      </div>

      <div className="mt-8 card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1018] text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Opener</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  No disputes yet.
                </td>
              </tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/disputes/${d.id}`}
                      className="text-[color:var(--primary)] hover:underline"
                    >
                      {d.order.title}
                    </Link>
                    <div className="text-[11px] text-[color:var(--muted)]">
                      {d.order.game}
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.opener.name ?? d.opener.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.reason}</td>
                  <td className="px-4 py-3">{d.status}</td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted)]">
                    {new Date(d.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
