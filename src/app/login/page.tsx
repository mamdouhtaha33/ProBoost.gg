import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Sign in · ProBoost.gg",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl = "/dashboard" } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col items-center justify-center px-4">
      <div className="card w-full p-8">
        <div className="flex items-center justify-center">
          <Image
            src="/proboost-logo.png"
            alt="ProBoost.gg"
            width={76}
            height={76}
            className="rounded-full shadow-[0_0_32px_-8px_rgba(77,184,255,0.9)]"
            priority
          />
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">
          Sign in to ProBoost.gg
        </h1>
        <p className="mt-1 text-center text-sm text-[color:var(--muted)]">
          Continue with Google to place orders or compete as a Pro.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
          className="mt-7"
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-md border border-[color:var(--border)] bg-white py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-md border border-[color:var(--border)] bg-[#0a0d15] p-3 text-xs text-[color:var(--muted)]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
          We only request your basic Google profile (name, email, avatar). Your
          gaming credentials are never stored on our servers.
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
