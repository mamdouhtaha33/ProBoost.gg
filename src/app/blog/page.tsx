import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Blog · ProBoost.gg",
  description: "Guides, meta updates, and stories from the ProBoost.gg Pros.",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          ProBoost.gg <span className="text-gradient">blog</span>
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          Guides, meta updates, and stories from our top-ranked Pros.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card mt-10 p-8 text-center text-sm text-[color:var(--muted)]">
          No posts published yet — check back soon.
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="card flex flex-col gap-2 p-6 transition-colors hover:border-[color:var(--primary)]/40"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                <span>
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString()
                    : "Draft"}
                </span>
                <span>·</span>
                <span>{p.author.name ?? "Editorial"}</span>
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[color:var(--border)] px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-semibold">{p.title}</h2>
              {p.excerpt && (
                <p className="text-sm text-[color:var(--muted)]">{p.excerpt}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
