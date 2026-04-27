import { auth } from "@/auth";
import { ServicesForm } from "@/components/services-form";
import { Crosshair } from "lucide-react";

export const metadata = {
  title: "ARC Raiders Boosting & Coaching · ProBoost.gg",
  description:
    "Configure your ARC Raiders boosting, coaching, or carry order. Pros bid for the job.",
};

export default async function ArcRaidersServicesPage() {
  const session = await auth();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="pt-12 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[#0d1018] px-3 py-1 text-xs text-[color:var(--muted)]">
          <Crosshair className="size-3.5 text-[color:var(--primary)]" />
          ARC Raiders
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Configure your <span className="text-gradient">ARC Raiders</span> service
        </h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          Pick what you need, set your preferences, and submit. Verified Pros
          will start bidding on your order within minutes.
        </p>
      </section>

      <section className="pb-24">
        <ServicesForm isAuthed={!!session?.user} />
      </section>
    </div>
  );
}
