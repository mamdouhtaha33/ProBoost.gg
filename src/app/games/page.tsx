import Link from "next/link";
import { ArrowRight, Crosshair, Lock } from "lucide-react";

export const metadata = {
  title: "Games · ProBoost.gg",
  description: "Browse all games supported on ProBoost.gg.",
};

type GameCard = {
  slug: string;
  title: string;
  tagline: string;
  status: "live" | "coming";
  href?: string;
};

const GAMES: GameCard[] = [
  {
    slug: "arc-raiders",
    title: "ARC Raiders",
    tagline: "Boosting · Coaching · Full carry by verified Pros.",
    status: "live",
    href: "/services/arc-raiders",
  },
  {
    slug: "valorant",
    title: "Valorant",
    tagline: "Coming soon — competitive rank boosting and IGL coaching.",
    status: "coming",
  },
  {
    slug: "league",
    title: "League of Legends",
    tagline: "Coming soon — solo/duo boosting, coaching, and clash carries.",
    status: "coming",
  },
  {
    slug: "destiny2",
    title: "Destiny 2",
    tagline: "Coming soon — raid sherpas, dungeon carries, weekly pinnacles.",
    status: "coming",
  },
];

export default function GamesIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          All <span className="text-gradient">games</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          We&apos;re starting with ARC Raiders. New games launch as soon as our
          Pros are vetted and ready to bid.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => {
          const Card = (
            <div className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--primary)]/40">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md bg-gradient-to-br from-[#1c2030] to-[#11141d]">
                  {g.status === "live" ? (
                    <Crosshair className="size-4 text-[color:var(--primary)]" />
                  ) : (
                    <Lock className="size-4 text-[color:var(--muted)]" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                    {g.status === "live" ? "Live" : "Coming soon"}
                  </div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-[color:var(--muted)]">
                {g.tagline}
              </p>
              {g.status === "live" ? (
                <div className="mt-4 inline-flex items-center gap-1 text-sm text-[color:var(--primary)]">
                  Browse services <ArrowRight className="size-3.5" />
                </div>
              ) : (
                <div className="mt-4 text-xs text-[color:var(--muted)]">
                  Pro applications opening soon.
                </div>
              )}
            </div>
          );
          return g.href ? (
            <Link key={g.slug} href={g.href} className="group">
              {Card}
            </Link>
          ) : (
            <div key={g.slug}>{Card}</div>
          );
        })}
      </div>
    </div>
  );
}
