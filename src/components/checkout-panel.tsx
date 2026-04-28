"use client";

import { useActionState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { startCheckout, type CheckoutState } from "@/app/actions/payments";
import { formatPrice } from "@/lib/utils";

export function CheckoutPanel({
  orderId,
  amount,
  currency,
  paid,
}: {
  orderId: string;
  amount: number;
  currency: string;
  paid: boolean;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    startCheckout,
    { ok: false },
  );

  if (paid) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 px-4 py-3 text-sm text-[color:var(--success)]">
        <ShieldCheck className="size-4" />
        Payment confirmed — Pros are bidding on your order.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex items-center justify-between rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="size-4 text-[color:var(--primary)]" />
          Pay securely
        </div>
        <div className="font-mono text-sm">
          {formatPrice(amount)} {currency}
        </div>
      </div>
      {state?.error && (
        <div className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Redirecting…" : `Pay ${formatPrice(amount)}`}
      </button>
    </form>
  );
}
