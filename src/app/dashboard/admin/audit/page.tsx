import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditLogPage(props: {
  searchParams?: Promise<{ page?: string; action?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const sp = (await props.searchParams) ?? {};
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = 50;
  const where = sp.action ? { action: { contains: sp.action } } : {};

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Every admin-side action is logged here, including before/after diffs.
      </p>

      <form className="card mt-4 flex gap-2 p-3 text-sm" action="/dashboard/admin/audit">
        <input
          type="text"
          name="action"
          placeholder="Filter by action (e.g. dispute.status)"
          defaultValue={sp.action ?? ""}
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary rounded-md px-4 text-xs font-semibold">
          Apply
        </button>
      </form>

      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1018] text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Target</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  No events.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-[color:var(--border)] align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[color:var(--muted)]">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.actor?.name ?? e.actor?.email ?? <span className="text-[color:var(--muted)]">system</span>}
                    {e.actor?.role && (
                      <div className="text-[10px] text-[color:var(--muted)]">{e.actor.role}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{e.targetType}</div>
                    <div className="font-mono text-[10px] text-[color:var(--muted)]">
                      {e.targetId.slice(0, 12)}…
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
        <div>
          Page {page} · {total} events
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              className="btn-ghost rounded-md px-3 py-1.5"
              href={`/dashboard/admin/audit?page=${page - 1}${sp.action ? `&action=${encodeURIComponent(sp.action)}` : ""}`}
            >
              Previous
            </a>
          )}
          {page * pageSize < total && (
            <a
              className="btn-ghost rounded-md px-3 py-1.5"
              href={`/dashboard/admin/audit?page=${page + 1}${sp.action ? `&action=${encodeURIComponent(sp.action)}` : ""}`}
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
