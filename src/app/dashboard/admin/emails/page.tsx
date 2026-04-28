import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const emails = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.emailLog.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Email log</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Outgoing emails are logged here. Status &quot;SKIPPED&quot; means RESEND_API_KEY
        was not configured at send time.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.status} className="card p-4">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              {c.status}
            </div>
            <div className="mt-1 text-2xl font-semibold">{c._count._all}</div>
          </div>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1018] text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">Template</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  No emails logged yet.
                </td>
              </tr>
            )}
            {emails.map((e) => (
              <tr key={e.id} className="border-t border-[color:var(--border)]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[color:var(--muted)]">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">{e.toEmail}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.templateName}</td>
                <td className="px-4 py-3 text-xs">{e.subject}</td>
                <td className="px-4 py-3 text-xs">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
