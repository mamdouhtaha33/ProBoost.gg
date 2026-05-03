import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · ProBoost.gg",
};

export default function PrivacyPage() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1>Privacy Policy</h1>
      <p className="text-[color:var(--muted)]">Last updated: April 2026</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account: email, name, avatar, locale, currency.</li>
        <li>Order info: game, region, platform, configuration, notes.</li>
        <li>Payment info: handled by Stripe / Paymob — we never store card numbers.</li>
        <li>Communication: messages exchanged on the platform.</li>
        <li>Operational: IP address, user agent, audit log of admin actions.</li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To process your orders and route them to qualified Pros.</li>
        <li>To prevent fraud and enforce our Terms.</li>
        <li>To send transactional and (optionally) marketing emails.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share your data only with payment processors, hosting and email providers
        we use to operate the platform, and the Pro assigned to your order.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request export or deletion of your data at any time by contacting{" "}
        <a href="mailto:privacy@proboost.gg">privacy@proboost.gg</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies for authentication, locale, and analytics. See the{" "}
        <a href="/legal/cookies">Cookie policy</a>.
      </p>
    </article>
  );
}
