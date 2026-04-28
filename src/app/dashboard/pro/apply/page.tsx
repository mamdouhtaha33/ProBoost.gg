import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { submitProApplication } from "@/app/actions/pro-applications";

export const metadata = {
  title: "Apply to be a Pro · ProBoost.gg",
};

export default async function ProApplicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/pro/apply");

  const application = await prisma.proApplication.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Apply to be a Pro
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Tell us about your skills and availability. Approved Pros can bid on
          open orders.
        </p>
      </div>

      {application?.status === "PENDING" && (
        <div className="card border-yellow-400/30 bg-yellow-400/5 p-5 text-sm">
          Your application is under review. We&apos;ll email you when it&apos;s
          decided.
        </div>
      )}
      {application?.status === "APPROVED" && (
        <div className="card border-[color:var(--success)]/30 bg-[color:var(--success)]/5 p-5 text-sm">
          You&apos;re an approved Pro. Head to the Pro dashboard to start
          bidding.
        </div>
      )}
      {application?.status === "REJECTED" && (
        <div className="card border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 p-5 text-sm">
          Your previous application was rejected
          {application.adminNotes ? `: ${application.adminNotes}` : "."} You may
          submit a new one.
        </div>
      )}

      <form action={submitProApplication} className="card space-y-4 p-6">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Headline
          </label>
          <input
            name="headline"
            defaultValue={application?.headline ?? ""}
            required
            maxLength={120}
            className="input-base w-full"
            placeholder="Top 0.1% NA-East ARC Raiders coach"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Bio
          </label>
          <textarea
            name="bio"
            rows={4}
            required
            defaultValue={application?.bio ?? ""}
            className="input-base w-full"
            placeholder="Years of experience, ranks achieved, signature playstyle…"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Past experience (optional)
          </label>
          <textarea
            name="experience"
            rows={3}
            defaultValue={application?.experience ?? ""}
            className="input-base w-full"
            placeholder="Tournaments, achievements, links to streams or VODs."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Availability
            </label>
            <input
              name="availability"
              defaultValue={application?.availability ?? ""}
              className="input-base w-full"
              placeholder="Weekends · 18-24h NA-East"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Payout email (optional)
            </label>
            <input
              type="email"
              name="payoutEmail"
              className="input-base w-full"
              placeholder="paypal@example.com"
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn-primary rounded-md px-4 py-2 text-sm font-semibold"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
