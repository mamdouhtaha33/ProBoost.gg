import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ShieldCheck, LayoutDashboard, LogOut, Search } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { resolveLocaleAndCurrency } from "@/lib/locale-server";

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="btn-ghost rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5"
        aria-label="Sign out"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </form>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;
  const { locale, currency } = await resolveLocaleAndCurrency();

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[#07080c]/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <SiteLogo imageSize={34} textSizeClassName="text-lg" />

        <nav className="hidden items-center gap-5 text-sm text-[color:var(--muted)] md:flex">
          <Link href="/games" className="hover:text-white transition-colors">
            Games
          </Link>
          <Link href="/offers" className="hover:text-white transition-colors">
            Offers
          </Link>
          <Link href="/currency" className="hover:text-white transition-colors">
            Currency
          </Link>
          <Link href="/accounts" className="hover:text-white transition-colors">
            Accounts
          </Link>
          <Link href="/pros" className="hover:text-white transition-colors">
            Pros
          </Link>
          <Link href="/blog" className="hover:text-white transition-colors">
            Blog
          </Link>
          <Link href="/faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <form action="/search" className="hidden md:block">
            <label className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                name="q"
                placeholder="Search offers..."
                className="rounded-md border border-[color:var(--border)] bg-[#0d1018] py-1.5 pl-7 pr-3 text-xs w-44 focus:w-60 transition-all"
              />
            </label>
          </form>
          <div className="hidden md:block">
            <LocaleSwitcher currentLocale={locale} currentCurrency={currency} />
          </div>
          {session?.user ? (
            <>
              <Link
                href={
                  role === "ADMIN"
                    ? "/dashboard/admin"
                    : role === "PRO"
                      ? "/dashboard/pro"
                      : "/dashboard"
                }
                className="btn-ghost rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
              {role === "ADMIN" && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[color:var(--border)] bg-[#11141d] px-2 py-0.5 text-xs text-[color:var(--accent)]">
                  <ShieldCheck className="size-3" /> Admin
                </span>
              )}
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
