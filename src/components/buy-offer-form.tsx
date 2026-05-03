"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { buyOffer, type BuyOfferState } from "@/app/actions/offers";

const initial: BuyOfferState = { ok: false };

export function BuyOfferForm(props: {
  offerId: string;
  offerSlug: string;
  basePriceCents: number;
  salePriceCents: number | null;
  gameSlug: string;
  productType: "BOOSTING" | "CURRENCY" | "ACCOUNT";
  deliveryMode: "PILOTED" | "SELF_PLAY" | "BOTH";
}) {
  const [state, formAction, pending] = useActionState(buyOffer, initial);
  return (
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="offerId" value={props.offerId} />

      {props.productType === "BOOSTING" && props.deliveryMode === "BOTH" && (
        <div>
          <label className="text-xs text-[color:var(--muted)]">Delivery method</label>
          <select name="deliveryMode" defaultValue="PILOTED" className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="PILOTED">Piloted (Pro plays on your account)</option>
            <option value="SELF_PLAY">Self-play (you play with a Pro)</option>
          </select>
        </div>
      )}

      <div>
        <label className="text-xs text-[color:var(--muted)]">Promo code (optional)</label>
        <input
          name="couponCode"
          placeholder="e.g. WELCOME10"
          className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm uppercase"
        />
      </div>

      <div>
        <label className="text-xs text-[color:var(--muted)]">Wallet credit to apply ($)</label>
        <input
          name="walletApplyCents"
          type="number"
          min={0}
          step={100}
          placeholder="0"
          className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
        />
        <div className="mt-1 text-[10px] text-[color:var(--muted)]">In cents (e.g. 500 = $5.00)</div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Placing order..." : "Buy now"}
        <ArrowRight className="size-4" />
      </button>

      {state.error && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
    </form>
  );
}
