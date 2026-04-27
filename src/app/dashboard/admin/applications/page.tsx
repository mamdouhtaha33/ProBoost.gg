import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decideProApplication } from "@/app/actions/admin";
import { timeAgo } from "@/lib/utils";

export const metadata = {
  title: "Pro applications · ProBoost.gg admin",
};

export default async function ProApplicationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/admin/applications");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const apps = await prisma.proApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { name: true, email: true, image: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pro applications</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Review and approve players who want to bid on orders.
        </p>
      </div>

      <div className="card overflow-hidden">
        {apps.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[color:var(--muted)]">
            No applications yet.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--border)]">
            {apps.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {a.user.name ?? a.user.email}
                    </div>
                    <div className="truncate text-xs text-[color:var(--muted)]">
                      {a.headline} · submitted {timeAgo(a.createdAt)}
                    </div>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wider " +
                      (a.status === "PENDING"
                        ? "bg-yellow-400/15 text-yellow-300"
                        : a.status === "APPROVED"
                          ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                          : a.status === "REJECTED"
                            ? "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"
                            : "bg-zinc-500/15 text-zinc-300")
                    }
                  >
                    {a.status}
                  </span>
                </div>
                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-[color:var(--muted)]">
                  {a.bio}
                </p>
                {a.experience && (
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-xs text-[color:var(--muted)]">
                    Experience: {a.experience}
                  </p>
                )}
                {a.availability && (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    Availability: {a.availability}
                  </p>
                )}
                {a.status === "PENDING" && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <form action={decideProApplication} className="space-y-2">
                      <input type="hidden" name="applicationId" value={a.id} />
                      <input type="hidden" name="decision" value="APPROVE" />
                      <input
                        name="note"
                        placeholder="Note (optional)"
                        className="input-base"
                      />
                      <button className="btn-primary w-full rounded-md px-3 py-1.5 text-sm font-medium">
                        Approve
                      </button>
                    </form>
                    <form action={decideProApplication} className="space-y-2">
                      <input type="hidden" name="applicationId" value={a.id} />
                      <input type="hidden" name="decision" value="REJECT" />
                      <input
                        name="note"
                        placeholder="Reason (optional)"
                        className="input-base"
                      />
                      <button className="btn-ghost w-full rounded-md px-3 py-1.5 text-sm">
                        Reject
                      </button>
                    </form>
                  </div>
                )}
                {a.adminNotes && a.status !== "PENDING" && (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Admin note: {a.adminNotes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
