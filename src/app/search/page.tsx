import { searchOffers } from "@/lib/offers";
import { OfferCard } from "@/components/offer-card";

export const metadata = { title: "Search · ProBoost.gg" };

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function SearchPage(props: { searchParams: Promise<SearchParams> }) {
  const { q = "" } = await props.searchParams;
  const results = q ? await searchOffers(q, 60) : [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Search <span className="text-gradient">offers</span>
      </h1>
      <form className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search games, services, ranks..."
          className="w-full rounded-md border border-[color:var(--border)] bg-[#0d1018] px-4 py-3 text-sm"
        />
        <button className="btn-primary rounded-md px-5 text-sm font-semibold">Search</button>
      </form>
      <p className="mt-3 text-xs text-[color:var(--muted)]">
        {q ? `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"` : "Type a query to search."}
      </p>
      {results.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
