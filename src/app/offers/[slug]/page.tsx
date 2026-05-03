import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, Star } from "lucide-react";
import { getOfferBySlug } from "@/lib/offers";
import { auth } from "@/auth";
import { BuyOfferForm } from "@/components/buy-offer-form";

type Params = { slug: string };

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function generateMetadata(props: { params: Promise<Params> }) {
  const { slug } = await props.params;
  const offer = await getOfferBySlug(slug);
  if (!offer) return { title: "Offer not found · ProBoost.gg" };
  return {
    title: `${offer.title} · ProBoost.gg`,
    description: offer.summary ?? offer.title,
  };
}

export default async function OfferDetailPage(props: { params: Promise<Params> }) {
  const { slug } = await props.params;
  const offer = await getOfferBySlug(slug);
  if (!offer || offer.status !== "PUBLISHED") return notFound();
  const session = await auth();
  const sale = offer.salePriceCents != null && offer.salePriceCents < offer.basePriceCents;
  const off = sale
    ? Math.round(((offer.basePriceCents - offer.salePriceCents!) / offer.basePriceCents) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-[color:var(--muted)]">
        <Link href="/games" className="hover:text-white">Games</Link>
        <span className="mx-2">/</span>
        <Link href={`/games/${offer.gameSlug}`} className="hover:text-white capitalize">{offer.gameSlug.replaceAll("-", " ")}</Link>
        {offer.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/games/${offer.gameSlug}?category=${offer.category.slug}`} className="hover:text-white">
              {offer.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
            {offer.gameSlug.replaceAll("-", " ")} · {offer.category?.name ?? offer.productType}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{offer.title}</h1>
          {offer.summary && (
            <p className="mt-3 text-[color:var(--muted)]">{offer.summary}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[color:var(--muted)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" /> Lifetime warranty
            </div>
            {offer.deliveryHours && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-sky-400" /> {offer.deliveryHours}h delivery
              </div>
            )}
            {offer.rating != null && (
              <div className="flex items-center gap-1.5">
                <Star className="size-4 fill-amber-300 text-amber-300" /> {offer.rating.toFixed(1)} ({offer.reviewsCount})
              </div>
            )}
          </div>

          <ul className="mt-8 space-y-2 text-sm">
            {offer.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 rounded-full bg-[color:var(--primary)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {offer.description && (
            <div className="prose prose-invert mt-10 max-w-none whitespace-pre-line text-sm text-[color:var(--muted)]">
              {offer.description}
            </div>
          )}
        </div>

        <aside className="card sticky top-20 h-fit p-6">
          <div className="flex items-baseline gap-3">
            {sale ? (
              <>
                <div className="text-3xl font-semibold text-rose-300">{fmt(offer.salePriceCents!)}</div>
                <div className="text-sm text-[color:var(--muted)] line-through">{fmt(offer.basePriceCents)}</div>
                <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-300">
                  {off}% off
                </span>
              </>
            ) : (
              <div className="text-3xl font-semibold">{fmt(offer.basePriceCents)}</div>
            )}
          </div>

          {session?.user ? (
            <BuyOfferForm
              offerId={offer.id}
              offerSlug={offer.slug}
              basePriceCents={offer.basePriceCents}
              salePriceCents={offer.salePriceCents}
              gameSlug={offer.gameSlug}
              productType={offer.productType}
              deliveryMode={offer.deliveryMode}
            />
          ) : (
            <Link
              href="/login"
              className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold"
            >
              Sign in to buy <ArrowRight className="size-4" />
            </Link>
          )}

          <p className="mt-4 text-xs text-[color:var(--muted)]">
            Cashback on every order. Secure payments. 24/7 support.
          </p>
        </aside>
      </div>
    </div>
  );
}
