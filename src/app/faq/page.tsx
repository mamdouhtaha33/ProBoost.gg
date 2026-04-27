import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "FAQ · ProBoost.gg",
  description:
    "Frequently asked questions about ProBoost.gg — pricing, payments, refunds, and Pro applications.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does the bidding marketplace work?",
    a: "After paying for your order, verified Pros place bids. Our admin reviews each bid and locks the order to the best Pro. You can chat with your Pro directly from your dashboard.",
  },
  {
    q: "When is my payment captured?",
    a: "Payments are captured immediately so Pros know you're committed. Refunds remain available until your Pro starts working — submit a request from the order page and admin will review.",
  },
  {
    q: "Which payment providers do you support?",
    a: "We integrate with Stripe in production. The local sandbox uses a 'manual' provider that lets you simulate payments to test the flow end-to-end without real cards.",
  },
  {
    q: "How are Pros verified?",
    a: "Pros submit an application with their experience, achievements, and availability. Admins review each one before approving. Customers only see bids from approved Pros.",
  },
  {
    q: "Can I message my Pro?",
    a: "Yes — every order has a private conversation thread between the customer, Pro, and admin. Admins can post internal notes that aren't visible to customers or Pros.",
  },
  {
    q: "What happens if I'm not happy with the result?",
    a: "Open a refund request from the order page with a brief explanation. Admin reviews and either issues a refund or rejects with a note. The full activity timeline is logged on every order.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Frequently asked <span className="text-gradient">questions</span>
      </h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Everything you need to know about pricing, payments, and how Pros
        deliver.
      </p>

      <div className="mt-10 space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="card group p-5 transition-colors hover:border-[color:var(--primary)]/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {item.q}
              <span className="ml-4 text-xs text-[color:var(--muted)] group-open:hidden">
                +
              </span>
              <span className="ml-4 hidden text-xs text-[color:var(--muted)] group-open:inline">
                −
              </span>
            </summary>
            <p className="mt-3 text-sm text-[color:var(--muted)]">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <Link
          href="/services/arc-raiders"
          className="btn-primary inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
        >
          Place your first order <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
