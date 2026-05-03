import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rankMeta } from "@/lib/pro-rank";
import { Star, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Pros · ProBoost.gg",
  description: "Browse verified Pro players on ProBoost.gg.",
};

export const dynamic = "force-dynamic";

export default async function ProsIndexPage() {
  const pros = await prisma.user.findMany({
    where: {
      role: "PRO",
      proApplicationStatus: "APPROVED",
      handle: { not: null },
    },
    orderBy: [{ proRank: "desc" }, { proCompletedJobs: "desc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      handle: true,
      image: true,
      proHeadline: true,
      proRank: true,
      proCompletedJobs: true,
      proAverageRating: true,
      proCountry: true,
      proLanguages: true,
      proVerified: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Top <span className="text-gradient">Pros</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Vetted competitive players bidding on real orders. Click any Pro to see their
          profile, rank, completed jobs, and reviews.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pros.map((p) => {
          const rank = rankMeta(p.proRank);
          return (
            <Link
              key={p.id}
              href={`/pros/${p.handle}`}
              className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--primary)]/40"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md bg-[#0d1018] text-sm font-semibold">
                  {(p.name ?? p.handle ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate font-semibold">
                    {p.name ?? p.handle}
                    {p.proVerified && (
                      <ShieldCheck className="size-3.5 text-[color:var(--primary)]" />
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: rank.color }}>
                    {rank.label}
                  </div>
                </div>
              </div>
              {p.proHeadline && (
                <p className="mt-3 line-clamp-2 text-sm text-[color:var(--muted)]">
                  {p.proHeadline}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-[color:var(--primary)] text-[color:var(--primary)]" />
                  {p.proAverageRating?.toFixed(2) ?? "—"}
                </span>
                <span>{p.proCompletedJobs} jobs</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
