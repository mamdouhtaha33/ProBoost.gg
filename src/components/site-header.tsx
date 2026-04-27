import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ShieldCheck, LayoutDashboard, LogOut } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";

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

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[#07080c]/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <SiteLogo imageSize={34} textSizeClassName="text-lg" />

        <nav className="hidden items-center gap-7 text-sm text-[color:var(--muted)] md:flex">
          <Link href="/services/arc-raiders" className="hover:text-white transition-colors">
            ARC Raiders
          </Link>
          <Link href="/services/arc-raiders#boosting" className="hover:text-white transition-colors">
            Boosting
          </Link>
          <Link href="/services/arc-raiders#coaching" className="hover:text-white transition-colors">
            Coaching
          </Link>
          <Link href="/services/arc-raiders#carry" className="hover:text-white transition-colors">
            Carry
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
