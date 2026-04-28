"use client";

import { useActionState, useState } from "react";
import { tipPro, type TipState } from "@/app/actions/tips";

const initial: TipState = { ok: false };

const PRESETS = [
  { label: "$2", cents: 200 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
  { label: "$20", cents: 2000 },
];

export function TipForm({ orderId, alreadyTipped }: { orderId: string; alreadyTipped: boolean }) {
  const [state, action, pending] = useActionState(tipPro, initial);
  const [amount, setAmount] = useState(500);

  if (alreadyTipped || state.ok) {
    return (
      <div className="card p-4 text-sm text-emerald-300">
        Tip sent. Thanks for supporting your Pro!
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="amountCents" value={amount} />
      <div className="text-sm font-semibold">Leave a tip</div>
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
      <button
        type="submit"
        disabled={pending}
        className="btn-primary inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Sending..." : `Send $${(amount / 100).toFixed(2)} tip`}
      </button>
      {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
    </form>
  );
}
