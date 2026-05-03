import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getGameBySlug, GAMES } from "@/lib/games";
import { listCategoriesByGame, listPublishedOffers } from "@/lib/offers";
import { OfferCard } from "@/components/offer-card";
import { Crosshair, ArrowRight } from "lucide-react";

type Params = { slug: string };
type SearchParams = { category?: string };

export function generateStaticParams(): Params[] {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await props.params;
  const game = getGameBySlug(slug);
  if (!game) return { title: "Game not found · ProBoost.gg" };
  return {
    title: `${game.name} Boosting & Offers · ProBoost.gg`,
    description: `Browse ${game.name} boosting, currency, and account offers from verified Pros.`,
  };
}

export default async function GameLandingPage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await props.params;
  const { category } = await props.searchParams;
  const game = getGameBySlug(slug);
  if (!game) return notFound();

  const [cats, offers] = await Promise.all([
    listCategoriesByGame(slug),
    listPublishedOffers({ gameSlug: slug, limit: 60 }),
  ]);

  const filtered = category
    ? offers.filter((o) => o.category?.slug === category)
    : offers;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[#0d1018] px-3 py-1 text-xs text-[color:var(--muted)]"
            style={{ color: game.accent }}
          >
            <Crosshair className="size-3.5" />
            {game.name}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-gradient">{game.name}</span> offers
          </h1>
          <p className="mt-3 max-w-2xl text-[color:var(--muted)]">{game.description}</p>
        </div>
        <Link
          href={`/services/${game.slug}`}
          className="btn-ghost inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
        >
          Configure custom order <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {cats.length > 0 && (
        <nav className="sticky top-14 z-20 mt-8 -mx-4 overflow-x-auto border-y border-[color:var(--border)] bg-[var(--bg)]/95 backdrop-blur">
          <ul className="flex min-w-full gap-1 px-4 py-2 text-sm">
            <li>
              <Link
                href={`/games/${slug}`}
                className={`inline-block rounded-md px-3 py-1.5 ${
                  !category ? "bg-[#0d1018] text-white" : "text-[color:var(--muted)] hover:text-white"
                }`}
              >
                All
              </Link>
            </li>
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/games/${slug}?category=${c.slug}`}
                  className={`inline-block rounded-md px-3 py-1.5 whitespace-nowrap ${
                    category === c.slug ? "bg-[#0d1018] text-white" : "text-[color:var(--muted)] hover:text-white"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {filtered.length === 0 ? (
        <div className="card mt-10 p-8 text-center text-[color:var(--muted)]">
          No offers in this category yet. <Link href={`/games/${slug}`} className="text-[color:var(--primary)]">View all</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
