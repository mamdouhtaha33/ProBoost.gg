"use client";

import { useState, useTransition } from "react";
import { requestCancellation } from "@/app/actions/refunds";

export function RefundForm({
  orderId,
  paid,
  alreadyRequested,
}: {
  orderId: string;
  paid: boolean;
  alreadyRequested: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (alreadyRequested) {
    return (
      <div className="rounded-md border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-xs text-orange-300">
        Refund/cancellation request is under review.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost rounded-md px-3 py-1.5 text-xs"
      >
        {paid ? "Request refund" : "Cancel order"}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        fd.set("orderId", orderId);
        fd.set("reason", reason);
        start(async () => {
          try {
            await requestCancellation(fd);
            setOpen(false);
            setReason("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-2 rounded-md border border-[color:var(--border)] bg-[#0a0d15] p-3"
    >
      <div className="text-xs font-medium">
        {paid ? "Reason for refund" : "Reason for cancellation"}
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="input-base w-full"
        placeholder="Briefly explain why…"
      />
      {error && (
        <div className="text-xs text-[color:var(--danger)]">{error}</div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || reason.trim().length < 5}
          className="btn-primary rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost rounded-md px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
