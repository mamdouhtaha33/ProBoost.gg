"use client";

import { useState } from "react";
import { setCookieConsent } from "@/app/actions/locale";

function hasConsentCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie.split("; ").some((c) => c.startsWith("cookie_consent="));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(() => !hasConsentCookie());

  if (!visible) return null;

  async function decide(decision: "accepted" | "rejected") {
    const fd = new FormData();
    fd.set("decision", decision);
    await setCookieConsent(fd);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-[color:var(--border)] bg-[#0d1018]/95 p-4 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[color:var(--muted)]">
          We use essential cookies to keep you signed in and remember your preferences.
          Optional analytics cookies help us improve the site. See our{" "}
          <a href="/legal/cookies" className="text-[color:var(--primary)] hover:underline">
            Cookie policy
          </a>
          .
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="btn-ghost rounded-md px-3 py-1.5 text-xs"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
