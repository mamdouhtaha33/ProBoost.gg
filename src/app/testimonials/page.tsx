import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { rankMeta } from "@/lib/pro-rank";

export const metadata = {
  title: "Reviews · ProBoost.gg",
  description: "Real reviews from real customers across the ProBoost.gg marketplace.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const reviews = await prisma.review.findMany({
    where: { rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      author: { select: { name: true, image: true } },
      recipient: { select: { name: true, handle: true, proRank: true } },
      order: { select: { title: true, game: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What players are <span className="text-gradient">saying</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Reviews are written by real customers after every completed order.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="card mt-10 p-8 text-center text-sm text-[color:var(--muted)]">
          No public reviews yet. Be the first to complete an order and leave one!
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const rank = rankMeta(r.recipient.proRank);
            return (
              <article key={r.id} className="card flex flex-col p-5">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < r.rating
                          ? "fill-[color:var(--primary)] text-[color:var(--primary)]"
                          : "text-[color:var(--border)]"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 flex-1 text-sm text-[color:var(--text)]">
                  &ldquo;{r.body}&rdquo;
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <div>
                    <div className="text-[color:var(--text)]">
                      {r.author.name ?? "Customer"}
                    </div>
                    <div className="mt-0.5">{r.order.game ?? "Order"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[color:var(--text)]">
                      {r.recipient.handle ? `@${r.recipient.handle}` : r.recipient.name}
                    </div>
                    <div style={{ color: rank.color }}>{rank.label}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
