import Link from "next/link";
import { listAccountListings } from "@/lib/listings";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Accounts Marketplace · ProBoost.gg",
  description: "Buy verified gaming accounts. 100% safe transfer.",
};

export const dynamic = "force-dynamic";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AccountsMarketplacePage() {
  const listings = await listAccountListings({ limit: 60 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-gradient">Accounts</span> marketplace
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Verified sellers. 100% safe transfer. Top accounts, fair prices.
        </p>
      </div>
      {listings.length === 0 ? (
        <div className="card mt-10 p-8 text-center text-[color:var(--muted)]">
          No listings yet. Check back soon.
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const sale = l.salePriceCents != null && l.salePriceCents < l.priceCents;
            return (
              <Link
                key={l.id}
                href={`/accounts/${l.id}`}
                className="card group flex h-full flex-col p-5 transition-colors hover:border-[color:var(--primary)]/40"
              >
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                  {l.gameSlug.replaceAll("-", " ")}
                </div>
                <div className="mt-1 font-semibold">{l.title}</div>
                {l.description && (
                  <p className="mt-2 text-xs text-[color:var(--muted)] line-clamp-3">{l.description}</p>
                )}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    {sale ? (
                      <>
                        <div className="text-xs text-[color:var(--muted)] line-through">{fmt(l.priceCents)}</div>
                        <div className="text-lg font-semibold text-rose-300">{fmt(l.salePriceCents!)}</div>
                      </>
                    ) : (
                      <div className="text-lg font-semibold">{fmt(l.priceCents)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <ShieldCheck className="size-3.5" /> Verified
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
