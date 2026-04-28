"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Locale } from "@prisma/client";
import { requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const upsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "lowercase, digits, dashes only"),
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(20),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  tags: z.string().optional(),
  locale: z.enum(["EN", "AR", "ES"]).default("EN"),
  coverImage: z.string().url().optional().or(z.literal("")),
});

export async function upsertBlogPost(formData: FormData) {
  const author = await requireRole("ADMIN");

  const parsed = upsertSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || undefined,
    body: formData.get("body"),
    status: formData.get("status") || undefined,
    tags: formData.get("tags") || undefined,
    locale: formData.get("locale") || undefined,
    coverImage: formData.get("coverImage") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid post");
  }

  const data = parsed.data;
  const tags = data.tags
    ? data.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const publishedAt =
    data.status === "PUBLISHED"
      ? new Date()
      : null;

  if (data.id) {
    const before = await prisma.blogPost.findUnique({ where: { id: data.id } });
    const after = await prisma.blogPost.update({
      where: { id: data.id },
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt ?? null,
        body: data.body,
        status: data.status,
        tags,
        locale: data.locale as Locale,
        coverImage: data.coverImage || null,
        publishedAt: publishedAt ?? before?.publishedAt ?? null,
      },
    });
    await logAudit(prisma, {
      actorUserId: author.id,
      action: "blog.update",
      targetType: "BLOG_POST",
      targetId: after.id,
      before: { status: before?.status, slug: before?.slug },
      after: { status: after.status, slug: after.slug },
    });
  } else {
    const created = await prisma.blogPost.create({
      data: {
        authorId: author.id,
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt ?? null,
        body: data.body,
        status: data.status,
        tags,
        locale: data.locale as Locale,
        coverImage: data.coverImage || null,
        publishedAt,
      },
    });
    await logAudit(prisma, {
      actorUserId: author.id,
      action: "blog.create",
      targetType: "BLOG_POST",
      targetId: created.id,
      after: { slug: created.slug, status: created.status },
    });
  }

  revalidatePath("/blog");
  revalidatePath("/dashboard/admin/blog");
}

export async function deleteBlogPost(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  await prisma.blogPost.delete({ where: { id } });
  await logAudit(prisma, {
    actorUserId: admin.id,
    action: "blog.delete",
    targetType: "BLOG_POST",
    targetId: id,
  });
  revalidatePath("/blog");
  revalidatePath("/dashboard/admin/blog");
}
