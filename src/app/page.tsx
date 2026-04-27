import Link from "next/link";
import {
  ShieldCheck,
  Trophy,
  Zap,
  Star,
  Crosshair,
  Headphones,
  Users,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* HERO */}
      <section className="relative pt-16 pb-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[#0d1018] px-3 py-1 text-xs text-[color:var(--muted)]">
              <span className="size-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_10px_var(--accent)]" />
              Live Pros bidding on orders right now
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Dominate{" "}
              <span className="text-gradient">ARC Raiders</span>
              <br />
              with Elite Pros.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[color:var(--muted)]">
              Boosting, coaching, and full-carry services from vetted top-tier
              players. Submit your goal — verified Pros bid for the job, and our
              admin assigns the best one to your order.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/services/arc-raiders"
                className="btn-primary inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold"
              >
                Browse ARC Raiders Services
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="btn-ghost inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold"
              >
                Become a Pro
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              {[
                ["12k+", "Orders Completed"],
                ["350+", "Verified Pros"],
                ["4.9★", "Avg. Rating"],
              ].map(([n, label]) => (
                <div key={label} className="card px-3 py-3 text-center">
                  <div className="text-lg font-semibold text-white">{n}</div>
                  <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual: stylized "order card" */}
          <div className="relative">
            <div className="absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(77,184,255,0.2),transparent_60%)] blur-2xl" />
            <div className="card relative overflow-hidden p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
                  <Crosshair className="size-4 text-[color:var(--primary)]" />
                  ARC Raiders · Boosting
                </div>
                <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[11px] font-medium text-[color:var(--success)]">
                  OPEN
                </span>
              </div>
              <h3 className="mt-3 text-xl font-semibold">
                Push to Apex Raider · NA-East
              </h3>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Current rank: Veteran · Target: Apex Raider · Stream optional ·
                Account share preferred
              </p>

              <div className="mt-5 space-y-3">
                {[
                  { name: "RaidKing_77", price: 18900, eta: "36h", rating: 4.95 },
                  { name: "GhostScout", price: 19500, eta: "48h", rating: 4.92 },
                  { name: "Voidwalker", price: 21500, eta: "24h", rating: 5.0 },
                ].map((b, i) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[#0a0d15] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-md bg-gradient-to-br from-[#1c2030] to-[#11141d] text-xs font-semibold text-white">
                        P{i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-[11px] text-[color:var(--muted)]">
                          ETA {b.eta} ·{" "}
                          <span className="text-yellow-400">★ {b.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-white">
                        ${(b.price / 100).toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                        Bid
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <Lock className="size-3.5" /> Admin reviews bids · Best Pro is locked in.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, t: "Verified Pros", d: "Every booster is vetted, ranked, and rated." },
          { icon: Zap, t: "Fast Delivery", d: "Most boosts start in under an hour." },
          { icon: Trophy, t: "Bid-Driven Pricing", d: "Pros compete — you get the best deal." },
          { icon: Headphones, t: "24/7 Support", d: "Admins on standby to assign and resolve." },
        ].map((f) => (
          <div key={f.t} className="card p-5">
            <f.icon className="size-5 text-[color:var(--primary)]" />
            <div className="mt-3 font-semibold">{f.t}</div>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{f.d}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="py-12">
        <div className="mb-8 max-w-2xl">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--primary)]">
            Workflow
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A marketplace built for serious players.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "You place an order", d: "Pick your service, configure rank/region/add-ons. Order goes live as OPEN." },
            { n: "02", t: "Pros bid", d: "Verified Pros log in to their dashboard and submit competing bids." },
            { n: "03", t: "Admin locks the Pro in", d: "Our admin reviews bids and assigns the best Pro. Order moves to ASSIGNED." },
          ].map((s) => (
            <div key={s.n} className="card relative p-6">
              <div className="text-5xl font-mono text-[color:var(--primary)]/30">
                {s.n}
              </div>
              <div className="mt-2 font-semibold">{s.t}</div>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="pt-4 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--primary)]">
              Featured
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              ARC Raiders Services
            </h2>
          </div>
          <Link
            href="/services/arc-raiders"
            className="text-sm text-[color:var(--muted)] hover:text-white"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Trophy, t: "Rank Boosting", d: "Push from any rank to Apex Raider, fast.", price: "from $39" },
            { icon: Star, t: "Pro Coaching", d: "1-on-1 sessions with top 0.1% players.", price: "$25 / hr" },
            { icon: Users, t: "Carry & Co-op", d: "Squad up with Pros for raids and missions.", price: "$15 / run" },
          ].map((c) => (
            <Link
              key={c.t}
              href="/services/arc-raiders"
              className="card group relative overflow-hidden p-6 transition-transform hover:-translate-y-0.5"
            >
              <div className="absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(77,184,255,0.2),transparent_70%)]" />
              <c.icon className="size-6 text-[color:var(--primary)]" />
              <div className="mt-4 text-lg font-semibold">{c.t}</div>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{c.d}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-mono text-sm text-white">{c.price}</span>
                <span className="text-sm text-[color:var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                  Configure →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
