"use client";

import { useState, useTransition } from "react";
import { placeBid, withdrawBid } from "@/app/actions/orders";
import { formatPrice } from "@/lib/utils";

export function BidForm({
  orderId,
  suggested,
  existingBid,
}: {
  orderId: string;
  suggested: number;
  existingBid?: { id: string; amount: number; message: string | null };
}) {
  const [amountDollars, setAmountDollars] = useState<string>(
    existingBid ? (existingBid.amount / 100).toFixed(2) : (suggested / 100).toFixed(2),
  );
  const [message, setMessage] = useState<string>(existingBid?.message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        const cents = Math.round(Number(amountDollars) * 100);
        if (!Number.isFinite(cents) || cents < 100) {
          setError("Bid must be at least $1.00");
          return;
        }
        fd.set("orderId", orderId);
        fd.set("amount", String(cents));
        fd.set("message", message);
        start(async () => {
          try {
            await placeBid(fd);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to submit bid");
          }
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Your bid
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--muted)]">
              $
            </span>
            <input
              inputMode="decimal"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              className="input-base pl-6 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--muted)]">
            Message to admin (optional)
          </label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ETA, availability, why pick me..."
            className="input-base"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-[color:var(--muted)]">
          Suggested: <span className="font-mono">{formatPrice(suggested)}</span>
        </div>
        <div className="flex gap-2">
          {existingBid && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  try {
                    const fd = new FormData();
                    fd.set("bidId", existingBid.id);
                    await withdrawBid(fd);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed");
                  }
                });
              }}
              className="btn-ghost rounded-md px-3 py-1.5 text-sm"
            >
              Withdraw
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {pending
              ? "Submitting..."
              : existingBid
                ? "Update bid"
                : "Place bid"}
          </button>
        </div>
      </div>
    </form>
  );
}
