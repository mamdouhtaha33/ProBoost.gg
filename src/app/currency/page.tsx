import Link from "next/link";
import { listCurrencyListings } from "@/lib/listings";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "In-game Currency · ProBoost.gg",
  description: "Buy in-game currency: gold, coins, blueprints, and more.",
};

export const dynamic = "force-dynamic";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CurrencyMarketplacePage() {
  const listings = await listCurrencyListings({ limit: 60 });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-gradient">In-game currency</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Verified sellers. Fast delivery. Cheapest gold, coins, blueprints across our supported games.
        </p>
      </div>
      {listings.length === 0 ? (
        <div className="card mt-10 p-8 text-center text-[color:var(--muted)]">
          No listings yet. Check back soon.
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/currency/${l.id}`}
              className="card group flex h-full flex-col p-5 transition-colors hover:border-[color:var(--primary)]/40"
            >
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                {l.gameSlug.replaceAll("-", " ")}
              </div>
              <div className="mt-1 font-semibold">{l.currencyName}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">per {l.unit}</div>
              {l.description && (
                <p className="mt-2 text-xs text-[color:var(--muted)] line-clamp-2">{l.description}</p>
              )}
              <div className="mt-4 flex items-end justify-between">
                <div className="text-lg font-semibold">{fmt(l.pricePerUnitCents)}</div>
                <div className="text-xs text-[color:var(--muted)]">{l.deliveryHours}h delivery</div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
                <ShieldCheck className="size-3.5" /> Verified seller
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
