import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
import { OrderStatusPill, PaymentStatusPill } from "@/components/order-status-pill";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderChat } from "@/components/order-chat";
import { ArrowLeft } from "lucide-react";

export default async function ProOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/dashboard/pro/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, image: true } },
      conversation: {
        include: {
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { name: true, email: true, image: true, role: true } },
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        where: { visibleToPro: true },
        include: { actor: { select: { name: true, email: true, image: true } } },
      },
    },
  });
  if (!order) return notFound();

  const isAssignedPro = order.proId === session.user.id;
  if (!isAssignedPro && session.user.role !== "ADMIN") {
    redirect("/dashboard/pro");
  }

  const opts = (order.options ?? {}) as Prisma.JsonObject;
  const amount = order.finalPrice ?? order.basePrice;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/pro"
        className="inline-flex items-center gap-1 text-sm text-[color:var(--muted)] hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back to pro
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
              {order.service}
              <OrderStatusPill status={order.status} />
              <PaymentStatusPill status={order.paymentStatus} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{order.title}</h1>
            <div className="mt-1 text-sm text-[color:var(--muted)]">
              Customer: {order.customer.name ?? order.customer.email} ·{" "}
              {formatDate(order.createdAt)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Earnings
            </div>
            <div className="font-mono text-2xl">{formatPrice(amount)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Object.entries(opts).map(([k, v]) => (
            <div
              key={k}
              className="rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                {k}
              </div>
              <div className="truncate text-sm text-white">
                {Array.isArray(v) ? v.join(", ") || "—" : String(v) || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 font-medium">Customer messages</div>
          <OrderChat
            orderId={order.id}
            messages={order.conversation?.messages ?? []}
          />
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 font-medium">
            Activity
          </div>
          <OrderTimeline activities={order.activities} />
        </section>
      </div>
    </div>
  );
}
