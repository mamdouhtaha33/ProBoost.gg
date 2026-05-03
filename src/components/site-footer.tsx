import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { NewsletterForm } from "@/components/newsletter-form";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[#06070b]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        <div>
          <SiteLogo imageSize={36} textSizeClassName="text-sm" />
          <p className="mt-2 max-w-xs text-sm text-[color:var(--muted)]">
            Premium boosting, coaching, currency and account services for the games you love.
            Bid-driven pricing, verified Pros, secure delivery.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Marketplace</div>
          <ul className="space-y-1.5 text-[color:var(--muted)]">
            <li><Link href="/offers" className="hover:text-white">All offers</Link></li>
            <li><Link href="/currency" className="hover:text-white">Buy currency</Link></li>
            <li><Link href="/accounts" className="hover:text-white">Buy accounts</Link></li>
            <li><Link href="/games" className="hover:text-white">All games</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Company</div>
          <ul className="space-y-1.5 text-[color:var(--muted)]">
            <li><Link href="/dashboard/pro/apply" className="hover:text-white">Become a Pro</Link></li>
            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ &amp; Support</Link></li>
            <li><Link href="/legal/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Get -10% off</div>
          <p className="mb-3 text-xs text-[color:var(--muted)]">
            Subscribe for hidden promo codes, sales alerts and a welcome discount.
          </p>
          <NewsletterForm source="footer" />
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] py-4 text-center text-xs text-[color:var(--muted)]">
        © {new Date().getFullYear()} ProBoost.gg. Not affiliated with game publishers.
      </div>
    </footer>
  );
}
