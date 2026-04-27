import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Payment received · ProBoost.gg",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <div className="card flex flex-col items-center p-10 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Payment confirmed
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          We&apos;ve notified Pros and unlocked bidding. You&apos;ll get
          updates on your dashboard as the order progresses.
        </p>
        <div className="mt-6 flex gap-2">
          {orderId && (
            <Link
              href={`/dashboard/orders/${orderId}`}
              className="btn-primary rounded-md px-4 py-2 text-sm font-medium"
            >
              View order
            </Link>
          )}
          <Link
            href="/dashboard"
            className="btn-ghost rounded-md px-4 py-2 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
