import { listPublishedOffers } from "@/lib/offers";
import { OfferCard } from "@/components/offer-card";
import { Flame } from "lucide-react";

export const metadata = {
  title: "All Offers · ProBoost.gg",
  description: "Browse all boosting, coaching, currency, and account offers.",
};

export const dynamic = "force-dynamic";

export default async function OffersIndexPage() {
  const [hot, popular, all] = await Promise.all([
    listPublishedOffers({ hot: true, limit: 4 }),
    listPublishedOffers({ popular: true, limit: 8 }),
    listPublishedOffers({ limit: 60 }),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-gradient">All offers</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Browse every offer across our catalog. Hot, popular, and discounted services from verified Pros.
        </p>
      </div>

      {hot.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-orange-400" /> Hot right now
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hot.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 text-sm font-semibold">Popular offers</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-4 text-sm font-semibold">All offers</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {all.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      </section>
    </div>
  );
}
