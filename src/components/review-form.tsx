"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { leaveReview } from "@/app/actions/reviews";

export function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        fd.set("orderId", orderId);
        fd.set("rating", String(rating));
        fd.set("title", title);
        fd.set("body", body);
        start(async () => {
          try {
            await leaveReview(fd);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover ?? rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              className="p-0.5"
            >
              <Star
                className={
                  "size-6 " +
                  (active ? "fill-yellow-400 text-yellow-400" : "text-[color:var(--muted)]")
                }
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-[color:var(--muted)]">{rating}/5</span>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Headline (optional)"
        className="input-base w-full"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Tell other customers about your experience…"
        className="input-base w-full"
      />
      {error && (
        <div className="text-xs text-[color:var(--danger)]">{error}</div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
