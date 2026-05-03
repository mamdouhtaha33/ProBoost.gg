import Link from "next/link";
import { CheckCircle2, ShieldCheck, Users, Trophy } from "lucide-react";

export const metadata = {
  title: "How it works · ProBoost.gg",
  description: "How ProBoost.gg matches you with verified Pros and protects your money.",
};

const STEPS = [
  {
    title: "Configure your order",
    body: "Pick a game, service, region, platform, and any add-ons. We show you the floor price up-front.",
    icon: CheckCircle2,
  },
  {
    title: "Pros bid for your job",
    body: "Verified Pros place competing bids. You see their stats, rank, and reviews — pick whoever you like (or let auto-assign do it).",
    icon: Users,
  },
  {
    title: "We hold the money in escrow",
    body: "Your payment is held by ProBoost.gg, not paid to the Pro yet. The Pro is incentivized to deliver a clean job.",
    icon: ShieldCheck,
  },
  {
    title: "Mark complete and review",
    body: "Once the work is done you confirm completion. Funds release. You leave a public review that helps the next customer.",
    icon: Trophy,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          How <span className="text-gradient">ProBoost.gg</span> works
        </h1>
        <p className="mt-3 text-[color:var(--muted)]">
          A bidding-based marketplace that puts you in control. No middlemen
          inflating prices. No anonymous workers. Real Pros, real reviews, real escrow.
        </p>
      </div>

      <ol className="mt-12 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md bg-[#0d1018]">
                  <Icon className="size-5 text-[color:var(--primary)]" />
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
                  Step {i + 1}
                </div>
              </div>
              <h2 className="mt-3 text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{s.body}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-12 flex gap-3">
        <Link href="/games" className="btn-primary rounded-md px-5 py-2.5 text-sm font-semibold">
          Browse games
        </Link>
        <Link href="/dashboard/pro/apply" className="btn-ghost rounded-md px-5 py-2.5 text-sm font-medium">
          Become a Pro
        </Link>
      </div>
    </div>
  );
}
