import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmManualPayment } from "@/app/actions/payments";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Confirm payment · ProBoost.gg",
};

export default async function ManualCheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/checkout/${orderId}/manual`);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return notFound();
  if (order.customerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const amount = order.finalPrice ?? order.basePrice;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          Manual payment (sandbox)
        </div>
        <h1 className="mt-2 text-2xl font-semibold">
          Confirm {formatPrice(amount)}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Stripe is not configured in this environment. Click below to simulate
          a successful payment for the sandbox flow. In production this page is
          replaced by the real Stripe checkout.
        </p>
        <form action={confirmManualPayment} className="mt-6">
          <input type="hidden" name="orderId" value={order.id} />
          <button
            type="submit"
            className="btn-primary w-full rounded-md px-4 py-2.5 text-sm font-semibold"
          >
            Mark as paid
          </button>
        </form>
      </div>
    </div>
  );
}
