import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy · ProBoost.gg",
};

export default function CookiesPage() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1>Cookie Policy</h1>
      <p className="text-[color:var(--muted)]">Last updated: April 2026</p>

      <h2>Essential cookies</h2>
      <p>
        These keep you signed in (NextAuth session token), remember your locale and
        currency preferences, and persist your cookie-consent choice.
      </p>

      <h2>Analytics cookies</h2>
      <p>
        We use privacy-friendly analytics (Plausible-compatible) to understand traffic
        sources and feature usage. Analytics cookies are only set after you accept the
        cookie banner.
      </p>

      <h2>Marketing cookies</h2>
      <p>
        Currently none. We will update this policy if that changes.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Use the cookie banner at the bottom of the page to revisit your decision. You
        can also clear cookies in your browser at any time.
      </p>
    </article>
  );
}
