import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { rankMeta } from "@/lib/pro-rank";
import { ShieldCheck, Star, MapPin, Languages } from "lucide-react";

type Params = { handle: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await props.params;
  const pro = await prisma.user.findUnique({
    where: { handle },
    select: { name: true, handle: true, proHeadline: true },
  });
  if (!pro) return { title: "Pro not found · ProBoost.gg" };
  return {
    title: `${pro.name ?? pro.handle} · ProBoost.gg`,
    description: pro.proHeadline ?? undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function ProProfilePage(props: { params: Promise<Params> }) {
  const { handle } = await props.params;
  const pro = await prisma.user.findUnique({
    where: { handle },
    include: {
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          author: { select: { name: true } },
          order: { select: { game: true, title: true } },
        },
      },
    },
  });
  if (!pro || pro.role !== "PRO") return notFound();

  const rank = rankMeta(pro.proRank);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-lg bg-[#0d1018] text-xl font-semibold">
            {(pro.name ?? pro.handle ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{pro.name ?? pro.handle}</h1>
              {pro.proVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 px-2 py-0.5 text-[11px] text-[color:var(--primary)]">
                  <ShieldCheck className="size-3" /> Verified
                </span>
              )}
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ background: `${rank.color}22`, color: rank.color }}
              >
                {rank.label}
              </span>
            </div>
            {pro.proHeadline && (
              <p className="mt-1 text-sm text-[color:var(--muted)]">{pro.proHeadline}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[color:var(--muted)]">
              {pro.proCountry && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {pro.proCountry}
                </span>
              )}
              {pro.proLanguages.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Languages className="size-3" /> {pro.proLanguages.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-3">
          <Stat label="Jobs" value={pro.proCompletedJobs.toString()} />
          <Stat
            label="Rating"
            value={pro.proAverageRating?.toFixed(2) ?? "—"}
            icon={
              <Star className="size-3 fill-[color:var(--primary)] text-[color:var(--primary)]" />
            }
          />
          <Stat label="Reviews" value={pro.reviewsReceived.length.toString()} />
        </div>
      </header>

      {pro.proBio && (
        <section className="card mt-6 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            About
          </h2>
          <p className="mt-2 text-sm leading-6">{pro.proBio}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Latest reviews
        </h2>
        {pro.reviewsReceived.length === 0 ? (
          <div className="card mt-3 p-6 text-sm text-[color:var(--muted)]">
            No public reviews yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {pro.reviewsReceived.map((r) => (
              <article key={r.id} className="card p-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${
                        i < r.rating
                          ? "fill-[color:var(--primary)] text-[color:var(--primary)]"
                          : "text-[color:var(--border)]"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-[color:var(--text)]">&ldquo;{r.body}&rdquo;</p>
                <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>{r.author.name ?? "Customer"}</span>
                  <span>{r.order.game ?? "Order"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-xl font-semibold">
        {icon}
        {value}
      </div>
    </div>
  );
}
