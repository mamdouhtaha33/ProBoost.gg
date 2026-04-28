import type { OrderActivity, User } from "@prisma/client";
import { timeAgo } from "@/lib/utils";

type ActivityWithActor = OrderActivity & {
  actor: Pick<User, "name" | "email" | "image"> | null;
};

export function OrderTimeline({
  activities,
  showInternal = false,
}: {
  activities: ActivityWithActor[];
  showInternal?: boolean;
}) {
  const visible = showInternal
    ? activities
    : activities.filter((a) => a.type !== "INTERNAL_NOTE_ADDED");

  if (visible.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-[color:var(--muted)]">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 px-5 py-5">
      <span className="absolute left-[26px] top-3 bottom-3 w-px bg-[color:var(--border)]" />
      {visible.map((a) => (
        <li key={a.id} className="relative flex gap-3">
          <span className="relative z-10 mt-1 grid size-3.5 shrink-0 place-items-center rounded-full border border-[color:var(--border)] bg-[#0a0d15]">
            <span className="size-1.5 rounded-full bg-[color:var(--primary)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm">{a.message}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
              {a.type.replace(/_/g, " ").toLowerCase()} ·{" "}
              {a.actor?.name ?? a.actor?.email ?? "system"} · {timeAgo(a.createdAt)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
