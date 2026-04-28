import Link from "next/link";
import { Flame, Star } from "lucide-react";
import type { Offer } from "@prisma/client";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OfferCard({ offer }: { offer: Pick<Offer, "slug" | "title" | "summary" | "features" | "basePriceCents" | "salePriceCents" | "badge" | "hot" | "rating" | "reviewsCount" | "gameSlug"> }) {
  const sale = offer.salePriceCents != null && offer.salePriceCents < offer.basePriceCents;
  const off = sale
    ? Math.round(((offer.basePriceCents - offer.salePriceCents!) / offer.basePriceCents) * 100)
    : 0;
  return (
    <Link
      href={`/offers/${offer.slug}`}
      className="card group relative flex h-full flex-col p-5 transition-colors hover:border-[color:var(--primary)]/40"
    >
      {sale && (
        <span className="absolute right-3 top-3 rounded-md bg-rose-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
          {off}% off
        </span>
      )}
      {offer.badge === "HOT" && !sale && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-orange-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-300">
          <Flame className="size-3" /> Hot
        </span>
      )}
      <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
        {offer.gameSlug.replaceAll("-", " ")}
      </div>
      <div className="mt-1 font-semibold">{offer.title}</div>
      {offer.summary && (
        <p className="mt-1 text-sm text-[color:var(--muted)] line-clamp-2">{offer.summary}</p>
      )}
      <ul className="mt-3 flex-1 space-y-1 text-xs text-[color:var(--muted)]">
        {offer.features.slice(0, 3).map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-[color:var(--primary)]" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-end justify-between">
        <div>
          {sale ? (
            <>
              <div className="text-xs text-[color:var(--muted)] line-through">
                {fmt(offer.basePriceCents)}
              </div>
              <div className="text-lg font-semibold text-rose-300">
                {fmt(offer.salePriceCents!)}
              </div>
            </>
          ) : (
            <div className="text-lg font-semibold">{fmt(offer.basePriceCents)}</div>
          )}
        </div>
        {offer.rating != null && (
          <div className="flex items-center gap-1 text-xs text-amber-300">
            <Star className="size-3.5 fill-amber-300" />
            {offer.rating.toFixed(1)}
            <span className="text-[color:var(--muted)]">({offer.reviewsCount})</span>
          </div>
        )}
      </div>
      <div className="mt-3 text-xs text-[color:var(--primary)]">View offer →</div>
    </Link>
  );
}
