import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyDisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const disputes = await prisma.dispute.findMany({
    where: {
      OR: [
        { openerId: session.user.id },
        { order: { customerId: session.user.id } },
        { order: { proId: session.user.id } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { id: true, title: true, game: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">My disputes</h1>
      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1018] text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  No disputes.
                </td>
              </tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/disputes/${d.id}`}
                      className="text-[color:var(--primary)] hover:underline"
                    >
                      {d.order.title}
                    </Link>
                  </td>
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
