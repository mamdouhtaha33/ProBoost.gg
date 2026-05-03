import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { upsertBlogPost, deleteBlogPost } from "@/app/actions/blog";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const posts = await prisma.blogPost.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Blog</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Drafts are private; published posts appear at <Link href="/blog" className="text-[color:var(--primary)]">/blog</Link>.
      </p>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-sm font-semibold">+ New post</summary>
        <PostForm action={upsertBlogPost} />
      </details>

      <section className="mt-6 space-y-4">
        {posts.map((p) => (
          <details key={p.id} className="card p-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm">
              <span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] uppercase " +
                    (p.status === "PUBLISHED"
                      ? "bg-green-500/15 text-green-400"
                      : p.status === "ARCHIVED"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-[color:var(--border)]")
                  }
                >
                  {p.status}
                </span>{" "}
                <span className="font-semibold">{p.title}</span>{" "}
                <span className="text-xs text-[color:var(--muted)]">/{p.slug}</span>
              </span>
              <span className="text-xs text-[color:var(--muted)]">
                {new Date(p.updatedAt).toLocaleDateString()}
              </span>
            </summary>
            <PostForm action={upsertBlogPost} post={p} />
            <form action={deleteBlogPost} className="mt-3">
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="btn-ghost rounded-md px-3 py-1.5 text-xs">
                Delete
              </button>
            </form>
          </details>
        ))}
      </section>
    </div>
  );
}

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags: string[];
  locale: "EN" | "AR" | "ES";
  coverImage: string | null;
};

function PostForm({
  action,
  post,
}: {
  action: (formData: FormData) => Promise<void>;
  post?: Post;
}) {
  return (
    <form action={action} className="mt-3 grid gap-3">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" name="title" defaultValue={post?.title ?? ""} required />
        <Field label="Slug" name="slug" defaultValue={post?.slug ?? ""} required />
        <Field
          label="Excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
        />
        <Field
          label="Cover image URL"
          name="coverImage"
          defaultValue={post?.coverImage ?? ""}
          placeholder="https://…"
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={post?.status ?? "DRAFT"}
          options={["DRAFT", "PUBLISHED", "ARCHIVED"]}
        />
        <SelectField
          label="Locale"
          name="locale"
          defaultValue={post?.locale ?? "EN"}
          options={["EN", "AR", "ES"]}
        />
        <Field
          label="Tags (comma-separated)"
          name="tags"
          defaultValue={post?.tags.join(", ") ?? ""}
        />
      </div>
      <label className="block text-xs">
        Body
        <textarea
          name="body"
          rows={10}
          defaultValue={post?.body ?? ""}
          className="input-base mt-1 resize-y font-mono text-xs"
          required
        />
      </label>
      <div>
        <button type="submit" className="btn-primary rounded-md px-4 py-2 text-xs font-semibold">
          Save
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs">
      {label}
      <input {...props} className="input-base mt-1" />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[];
}) {
  return (
    <label className="block text-xs">
      {label}
      <select {...props} className="input-base mt-1">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
