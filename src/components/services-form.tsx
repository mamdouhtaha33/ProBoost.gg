"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ADDONS,
  PLATFORMS,
  RANKS,
  REGIONS,
  SERVICES,
  computeBasePrice,
  defaultTitle,
  type ServiceId,
} from "@/lib/arc-pricing";
import { createOrder, type OrderActionState } from "@/app/actions/orders";
import { formatPrice } from "@/lib/utils";
import { Crosshair, Sparkles, Zap } from "lucide-react";

type Props = {
  initialService?: ServiceId;
  isAuthed: boolean;
};

export function ServicesForm({ initialService = "boosting", isAuthed }: Props) {
  const [service, setService] = useState<ServiceId>(initialService);
  const [region, setRegion] = useState<string>("na-east");
  const [platform, setPlatform] = useState<string>("pc");
  const [currentRank, setCurrentRank] = useState<string>("scavenger");
  const [targetRank, setTargetRank] = useState<string>("apex");
  const [hours, setHours] = useState<number>(2);
  const [runs, setRuns] = useState<number>(3);
  const [addons, setAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  const opts = useMemo(
    () => ({
      service,
      region: region as "na-east",
      platform: platform as "pc",
      currentRank,
      targetRank,
      hours,
      runs,
      addons,
      notes,
    }),
    [service, region, platform, currentRank, targetRank, hours, runs, addons, notes],
  );

  const price = computeBasePrice(opts);
  const title = defaultTitle(opts);

  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(
    createOrder,
    { ok: false },
  );

  const toggleAddon = (id: string) => {
    setAddons((cur) =>
      cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id],
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* CONFIG */}
      <form action={formAction} className="card space-y-8 p-6">
        {/* Service tabs */}
        <input type="hidden" name="service" value={service} />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SERVICES) as ServiceId[]).map((id) => {
            const active = id === service;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setService(id)}
                className={
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "btn-primary"
                    : "btn-ghost")
                }
              >
                {SERVICES[id].name.replace("ARC Raiders: ", "")}
              </button>
            );
          })}
        </div>

        <div>
          <h2 className="text-xl font-semibold">{SERVICES[service].name}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {SERVICES[service].blurb}
          </p>
        </div>

        {/* Region & platform — common */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region">
            <select
              name="region"
              className="input-base"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
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
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Service-specific fields */}
        {service === "boosting" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current rank">
              <select
                name="currentRank"
                className="input-base"
                value={currentRank}
                onChange={(e) => setCurrentRank(e.target.value)}
              >
                {RANKS.map((r) => (
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
                {RANKS.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={r.tier <= (RANKS.find((x) => x.id === currentRank)?.tier ?? 0)}
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
              onChange={(e) => setHours(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
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
              onChange={(e) => setRuns(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </Field>
        )}

        {/* Add-ons */}
        <div>
          <div className="mb-2 text-sm font-medium">Add-ons</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADDONS.map((a) => {
              const active = addons.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={
                    "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors " +
                    (active
                      ? "border-[color:var(--primary)] bg-[#1a1208]"
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
                    +{formatPrice(a.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes for the Pro (optional)">
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-base resize-none"
            placeholder="Anything the Pro should know? Preferred times, account details after assignment, etc."
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

      {/* SUMMARY */}
      <aside className="space-y-4">
        <div className="card sticky top-20 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted)]">
            <Crosshair className="size-4 text-[color:var(--primary)]" />
            Order summary
          </div>
          <div className="mt-3 text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            {REGIONS.find((r) => r.id === region)?.label} · {PLATFORMS.find((p) => p.id === platform)?.label}
          </div>

          <div className="my-5 h-px bg-[color:var(--border)]" />

          <div className="space-y-2 text-sm">
            <Row label="Base service" value={formatPrice(price - addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0))} />
            {addons.map((id) => {
              const a = ADDONS.find((x) => x.id === id);
              if (!a) return null;
              return <Row key={id} label={a.label} value={`+${formatPrice(a.price)}`} />;
            })}
          </div>

          <div className="my-5 h-px bg-[color:var(--border)]" />

          <div className="flex items-end justify-between">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
              Estimated price
            </div>
            <div className="text-3xl font-semibold text-gradient">
              {formatPrice(price)}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs text-[color:var(--muted)]">
            <Tip icon={<Sparkles className="size-3.5 text-[color:var(--accent)]" />}>
              Pros may bid below this estimate — final price is the accepted bid.
            </Tip>
            <Tip icon={<Zap className="size-3.5 text-[color:var(--primary)]" />}>
              Most orders get their first bid within minutes.
            </Tip>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Tip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
