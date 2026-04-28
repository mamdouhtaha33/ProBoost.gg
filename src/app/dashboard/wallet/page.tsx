import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWalletBalance, listWalletEntries } from "@/lib/wallet";
import { getCashbackTiersFor } from "@/lib/cashback";
import { Wallet } from "lucide-react";

export const metadata = {
  title: "Wallet · ProBoost.gg",
};

export const dynamic = "force-dynamic";

function fmt(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

const KIND_LABEL: Record<string, string> = {
  CASHBACK_EARNED: "Cashback earned",
  CASHBACK_USED: "Wallet applied",
  REFERRAL_REWARD: "Referral reward",
  PROMO_CREDIT: "Promo credit",
  REFUND_CREDIT: "Refund credit",
  TIP_RECEIVED: "Tip received",
  TIP_SENT: "Tip sent",
  ADJUSTMENT: "Adjustment",
};

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [balance, entries, boosting, currencyAccount] = await Promise.all([
    getWalletBalance(session.user.id!),
    listWalletEntries(session.user.id!, 100),
    getCashbackTiersFor("BOOSTING"),
    getCashbackTiersFor("CURRENCY_ACCOUNT"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Use your balance on any future order at checkout. Cashback is added automatically when an order is paid.
        </p>
      </div>

      <div className="card flex items-center gap-5 p-6">
        <div className="grid size-12 place-items-center rounded-md bg-[color:var(--primary)]/10">
          <Wallet className="size-5 text-[color:var(--primary)]" />
        </div>
        <div>
          <div className="text-xs text-[color:var(--muted)]">Available balance</div>
          <div className="text-3xl font-semibold">{fmt(balance)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="font-semibold">Boosting cashback tiers</div>
          <ul className="mt-3 space-y-2 text-sm">
            {boosting.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-b border-[color:var(--border)] pb-2 last:border-0">
                <span>{t.name}</span>
                <span className="text-[color:var(--muted)]">spend {fmt(t.thresholdCents)} → <span className="text-emerald-300">{(t.percentBasis100 / 100).toFixed(1)}%</span></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <div className="font-semibold">Currency / Accounts cashback tiers</div>
          <ul className="mt-3 space-y-2 text-sm">
            {currencyAccount.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-b border-[color:var(--border)] pb-2 last:border-0">
                <span>{t.name}</span>
                <span className="text-[color:var(--muted)]">spend {fmt(t.thresholdCents)} → <span className="text-emerald-300">{(t.percentBasis100 / 100).toFixed(1)}%</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <div className="mb-3 font-semibold">Recent activity</div>
        <div className="card overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-[color:var(--muted)]">No wallet activity yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-[color:var(--border)]">
                    <td className="px-4 py-2 text-[color:var(--muted)]">{e.createdAt.toLocaleDateString()}</td>
                    <td className="px-4 py-2">{KIND_LABEL[e.kind] ?? e.kind}</td>
                    <td className={`px-4 py-2 text-right ${e.amountCents < 0 ? "text-rose-300" : "text-emerald-300"}`}>{fmt(e.amountCents)}</td>
                    <td className="px-4 py-2 text-right">{fmt(e.balanceAfterCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
