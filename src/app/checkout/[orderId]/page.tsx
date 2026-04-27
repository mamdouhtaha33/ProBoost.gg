import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { OrderStatusPill } from "@/components/order-status-pill";
import { CheckoutPanel } from "@/components/checkout-panel";

export const metadata = {
  title: "Checkout · ProBoost.gg",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/checkout/${orderId}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
  if (!order) return notFound();
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const amount = order.finalPrice ?? order.basePrice;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Complete your <span className="text-gradient">payment</span>
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Pros begin bidding once your order is paid and submitted.
      </p>

      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Order
            </div>
            <div className="mt-1 text-lg font-semibold">{order.title}</div>
            <div className="text-xs text-[color:var(--muted)]">
              Placed {formatDate(order.createdAt)}
            </div>
          </div>
          <OrderStatusPill status={order.status} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Service" value={order.service} />
          <Stat label="Currency" value={order.currency} />
          <Stat label="Amount due" value={formatPrice(amount)} highlight />
        </div>

        <div className="mt-6 rounded-md border border-[color:var(--border)] bg-[#0a0d15] p-4 text-sm text-[color:var(--muted)]">
          {order.description || "No additional notes from the customer."}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <CheckoutPanel
          orderId={order.id}
          amount={amount}
          currency={order.currency}
          paid={order.paymentStatus === "PAID"}
        />
        <div className="mt-4 text-xs text-[color:var(--muted)]">
          By paying, you agree to ProBoost.gg&apos;s service terms. Payments are
          held until your order completes; you can request a refund any time
          before the Pro starts working.
        </div>
        <div className="mt-3 text-xs">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="text-[color:var(--primary)] hover:underline"
          >
            Skip and view order →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      <div
        className={
          "mt-1 truncate text-sm " +
          (highlight ? "font-mono text-base text-white" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
