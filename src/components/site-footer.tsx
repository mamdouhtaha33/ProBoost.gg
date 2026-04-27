import { SiteLogo } from "@/components/site-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[#06070b]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <SiteLogo imageSize={36} textSizeClassName="text-sm" />
          <p className="mt-2 max-w-xs text-sm text-[color:var(--muted)]">
            Premium ARC Raiders boosting, coaching, and carry services. Bid-driven pricing, verified Pros, secure delivery.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Services</div>
          <ul className="space-y-1.5 text-[color:var(--muted)]">
            <li>ARC Raiders Boosting</li>
            <li>Pro Coaching</li>
            <li>Carry & Co-op</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-medium">Company</div>
          <ul className="space-y-1.5 text-[color:var(--muted)]">
            <li>About</li>
            <li>Become a Pro</li>
            <li>Support</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] py-4 text-center text-xs text-[color:var(--muted)]">
        © {new Date().getFullYear()} ProBoost.gg. Not affiliated with the publishers of ARC Raiders.
      </div>
    </footer>
  );
}
