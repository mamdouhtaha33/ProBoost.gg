import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TwoFactorPanel } from "@/components/two-factor-panel";

export const dynamic = "force-dynamic";

export default async function TwoFactorSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, role: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Required for admins. Strongly recommended for Pros. Use Google Authenticator,
        Authy, 1Password, or any RFC 6238 TOTP app.
      </p>
      <div className="mt-6">
        <TwoFactorPanel
          enabled={!!user?.twoFactorEnabled}
          required={user?.role === "ADMIN"}
        />
      </div>
    </div>
  );
}
