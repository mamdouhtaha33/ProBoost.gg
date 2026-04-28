import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { replyToDispute } from "@/app/actions/disputes";

type Params = { id: string };
export const dynamic = "force-dynamic";

export default async function MyDisputePage(props: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { select: { id: true, name: true } },
          pro: { select: { id: true, name: true } },
        },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
  if (!dispute) return notFound();
  const allowed =
    dispute.openerId === session.user.id ||
    dispute.order.customerId === session.user.id ||
    dispute.order.proId === session.user.id ||
    session.user.role === "ADMIN";
  if (!allowed) return notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-xs text-[color:var(--muted)]">
        Dispute · {dispute.order.title}
      </div>
      <h1 className="text-2xl font-semibold">{dispute.reason.replace(/_/g, " ")}</h1>
      <div className="mt-2 text-sm text-[color:var(--muted)]">Status: {dispute.status}</div>
      {dispute.resolution && (
        <div className="card mt-4 p-4 text-sm">
          <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Resolution
          </div>
          <p className="mt-1">{dispute.resolution}</p>
        </div>
      )}

      <section className="card mt-6 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Summary
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{dispute.summary}</p>
      </section>

      <section className="mt-6 space-y-3">
        {dispute.messages.length === 0 && (
          <div className="card p-4 text-sm text-[color:var(--muted)]">
            No messages yet.
          </div>
        )}
        {dispute.messages.map((m) => (
          <article key={m.id} className="card p-4">
            <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
              <span>
                {m.author.name ?? "—"} ({m.author.role})
              </span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
          </article>
        ))}

        <form action={replyToDispute} className="card space-y-3 p-4">
          <input type="hidden" name="disputeId" value={dispute.id} />
          <textarea
            name="body"
            rows={3}
            placeholder="Reply…"
            className="input-base resize-none"
            required
          />
          <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm font-semibold">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
