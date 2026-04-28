import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  Crosshair,
  LayoutGrid,
  Gavel,
  ShieldCheck,
  User2,
  UserPlus,
  Users,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");
  const role = session.user.role;

  const items = [
    { href: "/dashboard", label: "Overview", icon: LayoutGrid, show: true },
    {
      href: "/dashboard/pro",
      label: "Pro Bids",
      icon: Gavel,
      show: role === "PRO" || role === "ADMIN",
    },
    {
      href: "/dashboard/pro/apply",
      label: "Apply as Pro",
      icon: UserPlus,
      show: role === "USER",
    },
    {
      href: "/dashboard/admin",
      label: "Admin",
      icon: ShieldCheck,
      show: role === "ADMIN",
    },
    {
      href: "/dashboard/admin/applications",
      label: "Applications",
      icon: Users,
      show: role === "ADMIN",
    },
  ].filter((i) => i.show);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[220px_1fr]">
      <aside>
        <div className="card sticky top-20 p-4">
          <div className="flex items-center gap-3 px-2 pb-3">
            <div className="grid size-9 place-items-center rounded-md bg-gradient-to-br from-[#1c2030] to-[#11141d]">
              <User2 className="size-4 text-[color:var(--muted)]" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {session.user.name ?? session.user.email}
              </div>
              <div className="text-xs text-[color:var(--muted)]">{role}</div>
            </div>
          </div>
          <div className="my-2 h-px bg-[color:var(--border)]" />
          <nav className="flex flex-col gap-1 pt-1">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[color:var(--muted)] transition-colors hover:bg-white/5 hover:text-white"
              >
                <i.icon className="size-4" />
                {i.label}
              </Link>
            ))}
            <Link
              href="/services/arc-raiders"
              className="mt-2 flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[#0a0d15] px-2.5 py-2 text-sm hover:border-[color:var(--primary)]/50"
            >
              <Crosshair className="size-4 text-[color:var(--primary)]" />
              New order
            </Link>
          </nav>
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
