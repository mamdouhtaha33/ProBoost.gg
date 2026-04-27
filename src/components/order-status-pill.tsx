import type { OrderStatus, BidStatus, PaymentStatus } from "@prisma/client";

const ORDER_STYLES: Record<OrderStatus, string> = {
  OPEN: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  ASSIGNED: "bg-[color:var(--accent)]/15 text-[color:var(--accent)]",
  IN_PROGRESS: "bg-yellow-400/15 text-yellow-300",
  DELIVERED: "bg-purple-400/15 text-purple-300",
  COMPLETED: "bg-zinc-500/15 text-zinc-300",
  CANCELLED: "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
  REFUND_REVIEW: "bg-orange-400/15 text-orange-300",
  REFUNDED: "bg-zinc-700/30 text-zinc-300",
};

const BID_STYLES: Record<BidStatus, string> = {
  PENDING: "bg-[color:var(--muted)]/15 text-[color:var(--muted)]",
  ACCEPTED: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  REJECTED: "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
  WITHDRAWN: "bg-zinc-500/15 text-zinc-300",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-zinc-500/15 text-zinc-300",
  REQUIRES_ACTION: "bg-yellow-400/15 text-yellow-300",
  PROCESSING: "bg-blue-400/15 text-blue-300",
  PAID: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  FAILED: "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
  REFUND_REQUESTED: "bg-orange-400/15 text-orange-300",
  REFUNDED: "bg-zinc-700/30 text-zinc-300",
  CANCELLED: "bg-zinc-500/15 text-zinc-300",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider " +
        ORDER_STYLES[status]
      }
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function BidStatusPill({ status }: { status: BidStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider " +
        BID_STYLES[status]
      }
    >
      {status}
    </span>
  );
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider " +
        PAYMENT_STYLES[status]
      }
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
