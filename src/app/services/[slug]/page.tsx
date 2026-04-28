import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { ServicesForm } from "@/components/services-form";
import { GAMES, getGameBySlug } from "@/lib/games";
import { Crosshair } from "lucide-react";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const game = getGameBySlug(slug);
  if (!game) return { title: "Service not found · ProBoost.gg" };
  return {
    title: `${game.name} Boosting & Coaching · ProBoost.gg`,
    description: `Configure your ${game.name} boosting, coaching, or carry order. Pros bid for the job.`,
    openGraph: {
      title: `${game.name} on ProBoost.gg`,
      description: game.tagline,
    },
  };
}

export default async function ServicesPage(props: {
  params: Promise<Params>;
}) {
  const { slug } = await props.params;
  const game = getGameBySlug(slug);
  if (!game) return notFound();

  const session = await auth();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="pt-12 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[#0d1018] px-3 py-1 text-xs text-[color:var(--muted)]">
          <Crosshair className="size-3.5 text-[color:var(--primary)]" />
          {game.name}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Configure your <span className="text-gradient">{game.name}</span> service
        </h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">{game.description}</p>
      </section>

      <section className="pb-24">
        <ServicesForm game={game} isAuthed={!!session?.user} />
      </section>
    </div>
  );
}
