import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  upsertAutoAssignmentRule,
  deleteAutoAssignmentRule,
} from "@/app/actions/auto-assignment";
import { GAMES } from "@/lib/games";

export const dynamic = "force-dynamic";

const RANKS = ["UNRANKED", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

export default async function AutoAssignmentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const rules = await prisma.autoAssignmentRule.findMany({
    orderBy: [{ enabled: "desc" }, { priority: "desc" }],
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Auto-assignment rules</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Rules apply when a Pro places a bid on an OPEN order. The first matching rule
        accepts the bid automatically.
      </p>

      <section className="mt-6 space-y-4">
        {rules.map((r) => (
          <form
            key={r.id}
            action={upsertAutoAssignmentRule}
            className="card grid gap-3 p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={r.id} />
            <Field label="Name" name="name" defaultValue={r.name} />
            <Field
              label="Game slug (blank = any)"
              name="gameSlug"
              defaultValue={r.gameSlug ?? ""}
              list="games"
            />
            <Field
              label="Service (blank = any)"
              name="service"
              defaultValue={r.service ?? ""}
            />
            <SelectField
              label="Min Pro rank"
              name="minProRank"
              defaultValue={r.minProRank}
              options={RANKS.map((r) => ({ value: r, label: r }))}
            />
            <Field
              label="Min bid % of base"
              name="minBidPercent"
              defaultValue={r.minBidPercent.toString()}
              type="number"
            />
            <Field
              label="Max bid % of base"
              name="maxBidPercent"
              defaultValue={r.maxBidPercent.toString()}
              type="number"
            />
            <Field
              label="Priority"
              name="priority"
              defaultValue={r.priority.toString()}
              type="number"
            />
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="requireProVerified"
                  defaultChecked={r.requireProVerified}
                />
                Require verified Pro
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="enabled" defaultChecked={r.enabled} />
                Enabled
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="btn-primary rounded-md px-4 py-2 text-xs font-semibold">
                Save
              </button>
              <button
                type="submit"
                formAction={deleteAutoAssignmentRule}
                className="btn-ghost rounded-md px-4 py-2 text-xs"
              >
                Delete
              </button>
            </div>
          </form>
        ))}

        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold">+ New rule</summary>
          <form action={upsertAutoAssignmentRule} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" placeholder="e.g. Top tier auto-assign" required />
            <Field label="Game slug (blank = any)" name="gameSlug" list="games" />
            <Field label="Service (blank = any)" name="service" />
            <SelectField
              label="Min Pro rank"
              name="minProRank"
              defaultValue="GOLD"
              options={RANKS.map((r) => ({ value: r, label: r }))}
            />
            <Field label="Min bid % of base" name="minBidPercent" defaultValue="60" type="number" />
            <Field label="Max bid % of base" name="maxBidPercent" defaultValue="110" type="number" />
            <Field label="Priority" name="priority" defaultValue="100" type="number" />
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="requireProVerified" /> Require verified Pro
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="enabled" /> Enabled
              </label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary rounded-md px-4 py-2 text-xs font-semibold">
                Create rule
              </button>
            </div>
          </form>
        </details>
      </section>

      <datalist id="games">
        {GAMES.map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.name}
          </option>
        ))}
      </datalist>
    </div>
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
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs">
      {label}
      <select {...props} className="input-base mt-1">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
