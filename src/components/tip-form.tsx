"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { tipPro, type TipState } from "@/app/actions/tips";

const initial: TipState = { ok: false };

const PRESETS = [
  { label: "$2", cents: 200 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
  { label: "$20", cents: 2000 },
];

export function TipForm({
  orderId,
  alreadyTipped,
  walletBalanceCents,
}: {
  orderId: string;
  alreadyTipped: boolean;
  walletBalanceCents: number;
}) {
  const [state, action, pending] = useActionState(tipPro, initial);
  const [amount, setAmount] = useState(500);

  if (alreadyTipped || state.ok) {
    return (
      <div className="card p-4 text-sm text-emerald-300">
        Tip sent. Thanks for supporting your Pro!
      </div>
    );
  }

  // Tips are paid from the customer's wallet credit (cashback / referrals /
  // refunds). Show the balance up front so the user knows what they can send.
  const balanceUsd = (walletBalanceCents / 100).toFixed(2);
  const insufficient = amount > walletBalanceCents;
  const noBalance = walletBalanceCents <= 0;

  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="amountCents" value={amount} />
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Leave a tip</div>
        <div className="text-xs text-[color:var(--muted)]">
          Wallet balance: <span className="font-semibold text-[color:var(--text)]">${balanceUsd}</span>
        </div>
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        Tips are paid from your ProBoost.gg wallet credit (earned via cashback, referrals, or refunds).
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.cents}
            onClick={() => setAmount(p.cents)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              amount === p.cents
                ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                : "border-[color:var(--border)] text-[color:var(--muted)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={100}
        step={100}
        value={amount}
        onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 0))}
        className="w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
      />
      <textarea
        name="message"
        rows={2}
        placeholder="Optional message"
        className="w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
      />
      {noBalance ? (
        <p className="text-xs text-amber-300">
          You don&apos;t have any wallet credit yet, so tipping isn&apos;t available on this order.{" "}
          <Link href="/dashboard/wallet" className="underline">
            Learn how to earn credit
          </Link>
          .
        </p>
      ) : insufficient ? (
        <p className="text-xs text-amber-300">
          That&apos;s more than your current ${balanceUsd} wallet balance — pick a smaller amount.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || noBalance || insufficient}
        className="btn-primary inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Sending..." : `Send $${(amount / 100).toFixed(2)} tip`}
      </button>
      {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
    </form>
  );
}
