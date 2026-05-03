import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · ProBoost.gg",
  description: "ProBoost.gg Terms of Service.",
};

export default function TermsPage() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1>Terms of Service</h1>
      <p className="text-[color:var(--muted)]">Last updated: April 2026</p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account on ProBoost.gg you agree to these Terms. If you do not
        agree, do not use the platform.
      </p>

      <h2>2. The Service</h2>
      <p>
        ProBoost.gg is a marketplace where customers post boosting, coaching, and carry
        orders for video games. Verified independent professionals (&quot;Pros&quot;) bid
        on these orders. ProBoost.gg facilitates the connection, holds payment in
        escrow until the work is delivered, and handles disputes.
      </p>

      <h2>3. Eligibility</h2>
      <p>You must be at least 18 years old to use the Service. Pros must be at least 18
        and complete identity and skill verification before bidding.</p>

      <h2>4. Account &amp; Security</h2>
      <p>
        You are responsible for safeguarding your account credentials. We strongly
        recommend enabling two-factor authentication. ProBoost.gg is not liable for any
        losses arising from compromised credentials.
      </p>

      <h2>5. Game Publisher Policies</h2>
      <p>
        Many games prohibit account sharing or boosting. By placing an order you
        acknowledge the risks (including potential bans) and agree that the
        responsibility lies with you. Where account sharing is required, we strongly
        recommend selecting a duo / no-share option when offered.
      </p>

      <h2>6. Payments &amp; Refunds</h2>
      <p>
        Payment is captured at checkout and released to the Pro upon completion.
        Refunds are governed by the Refund Policy linked in the footer.
      </p>

      <h2>7. Conduct</h2>
      <p>
        Harassment, fraud, doxxing, exchanging contact info to circumvent the platform,
        and other abusive behavior may result in suspension or termination of your
        account.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, ProBoost.gg&apos;s liability is limited
        to the total amount you paid for the relevant order. We are not liable for
        in-game bans, suspensions, or third-party penalties.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms. Material changes will be communicated by email
        and a banner on the platform.
      </p>
    </article>
  );
}
