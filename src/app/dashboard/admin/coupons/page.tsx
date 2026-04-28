import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCoupon, setCouponStatus } from "@/app/actions/admin-catalog";

export const metadata = { title: "Coupons · Admin · ProBoost.gg" };

export const dynamic = "force-dynamic";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminCouponsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Create promo codes for global, game, or per-user discounts.
        </p>
      </div>

      <details className="card p-6">
        <summary className="cursor-pointer text-sm font-semibold">+ Create new coupon</summary>
        <form action={createCoupon} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="code" placeholder="CODE (uppercase)" required className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm uppercase" />
          <select name="type" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="PERCENT">% off</option>
            <option value="FIXED">$ off (fixed)</option>
          </select>
          <input name="valuePercent" type="number" min={0} max={100} placeholder="If %: e.g. 10" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="valueCents" type="number" min={0} placeholder="If fixed: cents (e.g. 500)" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <select name="scope" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="GLOBAL">Global</option>
            <option value="GAME">Per game (set scopeRefId = game slug)</option>
            <option value="OFFER">Per offer (scopeRefId = offer ID)</option>
            <option value="USER">Per user (scopeRefId = user ID)</option>
          </select>
          <input name="scopeRefId" placeholder="scopeRefId (optional)" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="minOrderCents" type="number" min={0} placeholder="Min order (cents)" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="perUserLimit" type="number" min={0} defaultValue={1} placeholder="Per-user limit" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="expiresAt" type="datetime-local" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <button type="submit" className="btn-primary sm:col-span-2 rounded-md px-5 py-2 text-sm font-semibold">Create coupon</button>
        </form>
      </details>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-right">Used</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-2">
                  {c.type === "PERCENT" ? `${c.valuePercent}%` : c.valueCents != null ? fmt(c.valueCents) : "—"}
                </td>
                <td className="px-4 py-2 text-xs">{c.scope}{c.scopeRefId ? ` · ${c.scopeRefId}` : ""}</td>
                <td className="px-4 py-2 text-right">{c.usesCount}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    c.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" :
                    c.status === "PAUSED" ? "bg-amber-500/15 text-amber-300" :
                    "bg-zinc-500/15 text-zinc-400"
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  {c.status === "ACTIVE" ? (
                    <form action={setCouponStatus} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="PAUSED" />
                      <button className="btn-ghost rounded-md px-3 py-1 text-xs">Pause</button>
                    </form>
                  ) : (
                    <form action={setCouponStatus} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <button className="btn-ghost rounded-md px-3 py-1 text-xs">Activate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
