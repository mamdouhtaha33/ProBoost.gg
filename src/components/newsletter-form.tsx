"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";

const initial: NewsletterState = { ok: false };

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="source" value={source} />
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "..." : "Subscribe"}
      </button>
      {state.message && (
        <p className={`mt-1 w-full text-xs ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
