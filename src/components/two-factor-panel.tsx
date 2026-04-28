"use client";

import { useActionState, useState, useTransition } from "react";
import {
  confirmTwoFactor,
  disableTwoFactor,
  startTwoFactorEnrollment,
  type TwoFactorEnrollState,
} from "@/app/actions/two-factor";

type Props = { enabled: boolean; required: boolean };

export function TwoFactorPanel({ enabled, required }: Props) {
  const [enroll, setEnroll] = useState<TwoFactorEnrollState | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmTwoFactor, {
    ok: false,
  });

  if (enabled) {
    return (
      <div className="card p-6">
        <div className="text-sm">
          Two-factor authentication is{" "}
          <strong className="text-[color:var(--primary)]">enabled</strong>.
        </div>
        {required && (
          <div className="mt-2 text-xs text-[color:var(--muted)]">
            Admins cannot disable 2FA. Contact security@proboost.gg if you need help.
          </div>
        )}
        {!required && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void disableTwoFactor();
              })
            }
            className="btn-ghost mt-4 rounded-md px-4 py-2 text-xs"
          >
            Disable 2FA
          </button>
        )}
      </div>
    );
  }

  if (!enroll) {
    return (
      <div className="card p-6">
        <div className="text-sm">Two-factor authentication is currently off.</div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await startTwoFactorEnrollment();
              setEnroll(res);
            })
          }
          className="btn-primary mt-4 rounded-md px-4 py-2 text-sm font-semibold"
        >
          Start enrollment
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-5 p-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          Step 1 — Add to your authenticator
        </div>
        <p className="mt-1 text-sm">
          Scan the QR (or paste the secret) into Google Authenticator, Authy, 1Password,
          etc.
        </p>
        {enroll.otpauthUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <a
              href={enroll.otpauthUrl}
              className="text-xs font-mono text-[color:var(--primary)] hover:underline"
            >
              {enroll.otpauthUrl}
            </a>
          </div>
        )}
        <div className="mt-3 rounded-md border border-[color:var(--border)] bg-[#0d1018] p-3 font-mono text-xs">
          {enroll.secret}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          Step 2 — Save your recovery codes
        </div>
        <p className="mt-1 text-xs">
          Store these somewhere safe. Each can be used once if you lose your authenticator.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {enroll.recoveryCodes?.map((c) => (
            <code
              key={c}
              className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-2 py-1 text-center text-xs"
            >
              {c}
            </code>
          ))}
        </div>
      </div>

      <form action={confirmAction} className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          Step 3 — Verify
        </div>
        <input
          name="token"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          className="input-base"
        />
        {confirmState.error && (
          <div className="text-xs text-[color:var(--danger)]">{confirmState.error}</div>
        )}
        <button
          type="submit"
          disabled={confirmPending}
          className="btn-primary rounded-md px-4 py-2 text-sm font-semibold"
        >
          {confirmPending ? "Verifying…" : "Confirm & enable"}
        </button>
      </form>
    </div>
  );
}
