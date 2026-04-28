import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Params = { slug: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") return { title: "Not found · ProBoost.gg" };
  return {
    title: `${post.title} · ProBoost.gg`,
    description: post.excerpt ?? undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function BlogPostPage(props: { params: Promise<Params> }) {
  const { slug } = await props.params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } },
  });
  if (!post || post.status !== "PUBLISHED") return notFound();

  return (
    <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-xs text-[color:var(--muted)]">
        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""} ·{" "}
        {post.author.name ?? "Editorial"}
      </div>
      <h1>{post.title}</h1>
      {post.excerpt && (
        <p className="text-lg text-[color:var(--muted)]">{post.excerpt}</p>
      )}
      <div className="mt-8 whitespace-pre-wrap leading-7">{post.body}</div>
    </article>
  );
}
