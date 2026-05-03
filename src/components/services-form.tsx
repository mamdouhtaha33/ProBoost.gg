"use client";

import { useActionState, useMemo, useState } from "react";
import {
  computeBasePriceFor,
  defaultOrderTitle,
  type GameDef,
  type GameServiceId,
} from "@/lib/games";
import { createOrder, type OrderActionState } from "@/app/actions/orders";
import { formatPrice } from "@/lib/utils";
import { Crosshair } from "lucide-react";

type Props = {
  game: GameDef;
  initialService?: GameServiceId;
  isAuthed: boolean;
};

export function ServicesForm({ game, initialService = "boosting", isAuthed }: Props) {
  const services = Object.keys(game.services) as GameServiceId[];
  const [service, setService] = useState<GameServiceId>(
    services.includes(initialService) ? initialService : services[0],
  );
  const [region, setRegion] = useState<string>(game.regions[0]?.id ?? "");
  const [platform, setPlatform] = useState<string>(game.platforms[0]?.id ?? "pc");
  const [currentRank, setCurrentRank] = useState<string>(game.ranks[0]?.id ?? "");
  const [targetRank, setTargetRank] = useState<string>(
    game.ranks[game.ranks.length - 1]?.id ?? "",
  );
  const [hours, setHours] = useState<number>(2);
  const [runs, setRuns] = useState<number>(3);
  const [addons, setAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  const opts = useMemo(
    () => ({
      service,
      region,
      platform,
      currentRank,
      targetRank,
      hours,
      runs,
      addons,
      notes,
    }),
    [service, region, platform, currentRank, targetRank, hours, runs, addons, notes],
  );

  const price = computeBasePriceFor(game, opts);
  const title = defaultOrderTitle(game, opts);

  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(
    createOrder,
    { ok: false },
  );

  const toggleAddon = (id: string) => {
    setAddons((cur) =>
      cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id],
    );
  };

  const serviceLabel: Record<GameServiceId, string> = {
    boosting: "Rank Boosting",
    coaching: "Pro Coaching",
    carry: "Carry & Co-op",
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form action={formAction} className="card space-y-8 p-6">
        <input type="hidden" name="service" value={service} />
        <input type="hidden" name="gameSlug" value={game.slug} />

        <div className="flex flex-wrap gap-2">
          {services.map((id) => {
            const active = id === service;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setService(id)}
                className={
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                  (active ? "btn-primary" : "btn-ghost")
                }
              >
                {serviceLabel[id]}
              </button>
            );
          })}
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            {game.name}: {serviceLabel[service]}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{game.tagline}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region">
            <select
              name="region"
              className="input-base"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {game.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Platform">
            <select
              name="platform"
              className="input-base"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {game.platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {service === "boosting" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current rank">
              <select
                name="currentRank"
                className="input-base"
                value={currentRank}
                onChange={(e) => setCurrentRank(e.target.value)}
              >
                {game.ranks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target rank">
              <select
                name="targetRank"
                className="input-base"
                value={targetRank}
                onChange={(e) => setTargetRank(e.target.value)}
              >
                {game.ranks.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={
                      r.tier <= (game.ranks.find((x) => x.id === currentRank)?.tier ?? 0)
                    }
                  >
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {service === "coaching" && (
          <Field label="Hours">
            <input
              name="hours"
              type="number"
              min={1}
              max={20}
              className="input-base"
              value={hours}
              onChange={(e) =>
                setHours(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
            />
          </Field>
        )}

        {service === "carry" && (
          <Field label="Number of runs">
            <input
              name="runs"
              type="number"
              min={1}
              max={20}
              className="input-base"
              value={runs}
              onChange={(e) =>
                setRuns(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
            />
          </Field>
        )}

        <div>
          <div className="mb-2 text-sm font-medium">Add-ons</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {game.addons.map((a) => {
              const active = addons.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={
                    "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors " +
                    (active
                      ? "border-[color:var(--primary)] bg-[#0c1626]"
                      : "border-[color:var(--border)] bg-[#0a0d15] hover:border-[#2a3045]")
                  }
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="addons"
                      value={a.id}
                      checked={active}
                      onChange={() => toggleAddon(a.id)}
                      className="size-4 accent-[color:var(--primary)]"
                    />
                    {a.label}
                  </span>
                  <span className="font-mono text-xs text-[color:var(--muted)]">
                    +{formatPrice(a.priceCents)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <Field label="Notes for the Pro (optional)">
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-base resize-none"
            placeholder="Preferred times, account details, special requests…"
          />
        </Field>

        {state.error && (
          <div className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || price <= 0 || !isAuthed}
          className="btn-primary w-full rounded-md py-3 text-sm font-semibold disabled:opacity-50"
        >
          {!isAuthed
            ? "Sign in to place this order"
            : pending
              ? "Placing order..."
              : `Place order · ${formatPrice(price)}`}
        </button>
        {!isAuthed && (
          <p className="text-center text-xs text-[color:var(--muted)]">
            You need an account so Pros can bid on your order.
          </p>
        )}
      </form>

      <aside className="space-y-4">
        <div className="card sticky top-20 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <Crosshair className="size-4 text-[color:var(--primary)]" />
            Order summary
          </div>
          <div className="mt-3 text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            {game.regions.find((r) => r.id === region)?.label} ·{" "}
            {game.platforms.find((p) => p.id === platform)?.label}
          </div>

          <div className="my-5 h-px bg-[color:var(--border)]" />

          <div className="space-y-2 text-sm">
            <Row
              label="Base service"
              value={formatPrice(
                price -
                  addons.reduce(
                    (s, id) => s + (game.addons.find((a) => a.id === id)?.priceCents ?? 0),
                    0,
                  ),
              )}
            />
            {addons.map((id) => {
              const a = game.addons.find((x) => x.id === id);
              if (!a) return null;
              return <Row key={id} label={a.label} value={`+${formatPrice(a.priceCents)}`} />;
            })}
          </div>

          <div className="my-5 h-px bg-[color:var(--border)]" />

          <div className="flex items-end justify-between">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Estimated price
            </div>
            <div className="text-3xl font-semibold text-gradient">{formatPrice(price)}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[color:var(--muted)]">
        {label}
      </div>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
