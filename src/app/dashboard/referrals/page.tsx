import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ensureReferralCode,
  inviteByEmail,
} from "@/app/actions/referrals";
import { REFERRAL_REWARD_CENTS } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const code = await ensureReferralCode();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { walletCreditCents: true },
  });

  const sent = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const totalEarned = sent
    .filter((r) => r.status === "REWARD_GRANTED")
    .reduce((s, r) => s + r.rewardCents, 0);

  const link =
    typeof process.env.NEXTAUTH_URL === "string"
      ? `${process.env.NEXTAUTH_URL}/?ref=${code}`
      : `/?ref=${code}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Refer friends, earn credit</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        For every friend who places their first paid order, we credit your wallet with
        ${(REFERRAL_REWARD_CENTS / 100).toFixed(2)}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Your code" value={code} />
        <Stat label="Earned" value={`$${(totalEarned / 100).toFixed(2)}`} />
        <Stat
          label="Wallet balance"
          value={`$${((user?.walletCreditCents ?? 0) / 100).toFixed(2)}`}
        />
      </div>

      <div className="card mt-6 p-5">
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          Share link
        </div>
        <div className="mt-2 break-all font-mono text-sm">{link}</div>
      </div>

      <form action={inviteByEmail} className="card mt-4 flex gap-2 p-4">
        <input
          name="email"
          type="email"
          placeholder="friend@example.com"
          required
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm font-semibold">
          Invite
        </button>
      </form>

      <section className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1018] text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Reward</th>
              <th className="px-4 py-3 text-left">Sent</th>
            </tr>
          </thead>
          <tbody>
            {sent.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  No invites sent yet.
                </td>
              </tr>
            ) : (
              sent.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3 text-xs">{r.referredEmail}</td>
                  <td className="px-4 py-3 text-xs">{r.status}</td>
                  <td className="px-4 py-3 text-xs">
                    ${(r.rewardCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted)]">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 break-all font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
