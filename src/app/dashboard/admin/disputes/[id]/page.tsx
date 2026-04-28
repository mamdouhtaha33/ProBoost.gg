import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { replyToDispute, updateDisputeStatus } from "@/app/actions/disputes";

type Params = { id: string };
export const dynamic = "force-dynamic";

const STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_USER",
  "AWAITING_PRO",
  "RESOLVED_FOR_USER",
  "RESOLVED_FOR_PRO",
  "CLOSED",
] as const;

export default async function AdminDisputePage(props: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await props.params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          pro: { select: { id: true, name: true, email: true } },
        },
      },
      opener: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
  if (!dispute) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-xs text-[color:var(--muted)]">
        Dispute · {dispute.order.title}
      </div>
      <h1 className="text-2xl font-semibold">{dispute.reason.replace(/_/g, " ")}</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Opened by {dispute.opener.name ?? dispute.opener.email}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Field label="Customer">{dispute.order.customer.name ?? dispute.order.customer.email}</Field>
        <Field label="Pro">
          {dispute.order.pro?.name ?? dispute.order.pro?.email ?? "—"}
        </Field>
        <Field label="Amount claim">
          {dispute.amountClaim ? `$${(dispute.amountClaim / 100).toFixed(2)}` : "—"}
        </Field>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Summary
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{dispute.summary}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Conversation
        </h2>
        <div className="mt-3 space-y-3">
          {dispute.messages.length === 0 && (
            <div className="card p-4 text-sm text-[color:var(--muted)]">No messages yet.</div>
          )}
          {dispute.messages.map((m) => (
            <article key={m.id} className="card p-4">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>
                  {m.author.name ?? "—"} ({m.author.role}){" "}
                  {m.isInternal && (
                    <span className="ml-2 rounded-full bg-[color:var(--primary)]/15 px-2 py-0.5 text-[10px] text-[color:var(--primary)]">
                      Internal
                    </span>
                  )}
                </span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
            </article>
          ))}
        </div>

        <form action={replyToDispute} className="card mt-3 space-y-3 p-4">
          <input type="hidden" name="disputeId" value={dispute.id} />
          <textarea
            name="body"
            rows={3}
            placeholder="Reply…"
            className="input-base resize-none"
            required
          />
          <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <input type="checkbox" name="isInternal" /> Internal note (admins only)
          </label>
          <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm font-semibold">
            Send
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Resolution
        </h2>
        <form action={updateDisputeStatus} className="card mt-3 space-y-3 p-4">
          <input type="hidden" name="disputeId" value={dispute.id} />
          <label className="block text-xs">
            Status
            <select
              name="status"
              defaultValue={dispute.status}
              className="input-base mt-1"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Resolution note
            <textarea
              name="resolution"
              rows={2}
              defaultValue={dispute.resolution ?? ""}
              className="input-base mt-1 resize-none"
            />
          </label>
          <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm font-semibold">
            Save status
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
