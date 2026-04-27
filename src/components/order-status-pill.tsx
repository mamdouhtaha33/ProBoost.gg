import type { OrderStatus, BidStatus } from "@prisma/client";

const ORDER_STYLES: Record<OrderStatus, string> = {
  OPEN:        "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  ASSIGNED:    "bg-[color:var(--accent)]/15  text-[color:var(--accent)]",
  IN_PROGRESS: "bg-yellow-400/15 text-yellow-300",
  COMPLETED:   "bg-zinc-500/15 text-zinc-300",
  CANCELLED:   "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
};

const BID_STYLES: Record<BidStatus, string> = {
  PENDING:   "bg-[color:var(--muted)]/15 text-[color:var(--muted)]",
  ACCEPTED:  "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  REJECTED:  "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
  WITHDRAWN: "bg-zinc-500/15 text-zinc-300",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider " +
        ORDER_STYLES[status]
      }
    >
      {status.replace("_", " ")}
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
