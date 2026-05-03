import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { archiveOffer, createOffer, publishOffer } from "@/app/actions/admin-catalog";
import { GAMES } from "@/lib/games";

export const metadata = { title: "Offers · Admin · ProBoost.gg" };

export const dynamic = "force-dynamic";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminOffersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [offers, categories] = await Promise.all([
    prisma.offer.findMany({
      include: { category: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.offerCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Manage published offers per game. Pricing changes take effect immediately.
        </p>
      </div>

      <details className="card p-6">
        <summary className="cursor-pointer text-sm font-semibold">+ Create new offer</summary>
        <form action={createOffer} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="title" placeholder="Title" required className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="slug" placeholder="slug-with-hyphens" required className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <select name="gameSlug" required className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            {GAMES.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
          <select name="categorySlug" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.gameSlug} · {c.name}</option>
            ))}
          </select>
          <select name="productType" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="BOOSTING">Boosting</option>
            <option value="CURRENCY">Currency</option>
            <option value="ACCOUNT">Account</option>
          </select>
          <input name="basePriceCents" type="number" min={0} placeholder="Base price (cents)" required className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="salePriceCents" type="number" min={0} placeholder="Sale price (cents, optional)" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <input name="summary" placeholder="Short summary" className="sm:col-span-2 rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <textarea name="features" rows={3} placeholder="Features (one per line)" className="sm:col-span-2 rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <textarea name="description" rows={3} placeholder="Description (markdown ok)" className="sm:col-span-2 rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hot" /> Hot</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="popular" /> Popular</label>
          <select name="status" className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-3 py-2 text-sm">
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="submit" className="btn-primary rounded-md px-5 py-2 text-sm font-semibold">Create offer</button>
        </form>
      </details>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Game</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-2">
                  <div className="font-semibold">{o.title}</div>
                  <div className="text-xs text-[color:var(--muted)]">{o.slug}</div>
                </td>
                <td className="px-4 py-2 capitalize">{o.gameSlug.replaceAll("-", " ")}</td>
                <td className="px-4 py-2 text-xs uppercase">{o.productType}</td>
                <td className="px-4 py-2 text-right">
                  {o.salePriceCents != null ? (
                    <>
                      <span className="text-rose-300">{fmt(o.salePriceCents)}</span>
                      <span className="ml-2 text-xs text-[color:var(--muted)] line-through">{fmt(o.basePriceCents)}</span>
                    </>
                  ) : (
                    fmt(o.basePriceCents)
                  )}
                </td>
                <td className="px-4 py-2 text-right">{o.ordersCount}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    o.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-300" :
                    o.status === "DRAFT" ? "bg-amber-500/15 text-amber-300" :
                    "bg-zinc-500/15 text-zinc-400"
                  }`}>{o.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  {o.status !== "PUBLISHED" ? (
                    <form action={publishOffer} className="inline">
                      <input type="hidden" name="id" value={o.id} />
                      <button className="btn-ghost rounded-md px-3 py-1 text-xs">Publish</button>
                    </form>
                  ) : (
                    <form action={archiveOffer} className="inline">
                      <input type="hidden" name="id" value={o.id} />
                      <button className="btn-ghost rounded-md px-3 py-1 text-xs">Archive</button>
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
