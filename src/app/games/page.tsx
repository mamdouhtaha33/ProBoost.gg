import Link from "next/link";
import { ArrowRight, Crosshair } from "lucide-react";
import { listPublishedGames } from "@/lib/games";

export const metadata = {
  title: "Games · ProBoost.gg",
  description: "Browse all games supported on ProBoost.gg.",
};

export default function GamesIndexPage() {
  const games = listPublishedGames();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          All <span className="text-gradient">games</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Boost, coach, or carry. Verified Pros across every region — pick your game and
          start getting bids in minutes.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/services/${g.slug}`}
            className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--primary)]/40"
          >
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 place-items-center rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${g.accent}33, ${g.accent}11)`,
                }}
              >
                <Crosshair className="size-4" style={{ color: g.accent }} />
              </div>
              <div>
                <div className="font-semibold">{g.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                  {g.publisher}
                </div>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm text-[color:var(--muted)]">{g.tagline}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm text-[color:var(--primary)]">
              Browse services <ArrowRight className="size-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
