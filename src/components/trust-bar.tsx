import { ShieldCheck, Star, Users, Package } from "lucide-react";
import { getCounters } from "@/lib/site-counters";

export async function TrustBar() {
  const counters = await getCounters();
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="card grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-emerald-500/10">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          </div>
          <div>
            <div className="text-base font-semibold">{counters.prosOnline.toLocaleString()}</div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">Pros online now</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-sky-500/10">
            <Package className="size-4 text-sky-400" />
          </div>
          <div>
            <div className="text-base font-semibold">{counters.completedOrders.toLocaleString()}+</div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">Orders completed</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-amber-500/10">
            <Star className="size-4 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="text-base font-semibold">4.8 / 5</div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">Trustpilot rating</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-violet-500/10">
            <Users className="size-4 text-violet-400" />
          </div>
          <div>
            <div className="text-base font-semibold">{counters.happyCustomers.toLocaleString()}+</div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">Happy customers</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
        <ShieldCheck className="size-3.5 text-emerald-400" />
        Lifetime warranty · 24/7 support · 100% safe transfers · Verified Pros only
      </div>
    </section>
  );
}
