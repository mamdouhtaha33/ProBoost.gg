import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy · ProBoost.gg",
};

export default function RefundsPage() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1>Refund Policy</h1>
      <p className="text-[color:var(--muted)]">Last updated: April 2026</p>

      <h2>Full refund</h2>
      <p>
        You qualify for a full refund if your order has not been started — i.e. no Pro
        has been accepted, or the assigned Pro has not made any progress.
      </p>

      <h2>Partial refund</h2>
      <p>
        For orders that are partially complete, we will pro-rate the refund based on
        the verified work completed by the Pro. Disputes are reviewed within 48 hours.
      </p>

      <h2>Non-refundable</h2>
      <ul>
        <li>Orders where you provided false account credentials.</li>
        <li>Orders cancelled by you after the Pro reaches the agreed milestone.</li>
        <li>Coaching hours that were attended.</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Open your order &gt; <strong>Request refund</strong>. Provide a reason. Our
        team reviews requests within 48 hours and may contact you for clarifying
        details.
      </p>
    </article>
  );
}
