"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Currency, Locale } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function setLocale(formData: FormData): Promise<void> {
  const raw = String(formData.get("locale") ?? "EN");
  const locale = (["EN", "AR", "ES"].includes(raw) ? raw : "EN") as Locale;

  const c = await cookies();
  c.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  }
  revalidatePath("/");
}

export async function setCurrency(formData: FormData): Promise<void> {
  const raw = String(formData.get("currency") ?? "USD");
  const currency = (["USD", "EUR", "EGP", "SAR"].includes(raw) ? raw : "USD") as Currency;

  const c = await cookies();
  c.set("currency", currency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { currency } });
  }
  revalidatePath("/");
}

export async function setCookieConsent(formData: FormData): Promise<void> {
  const decision = String(formData.get("decision") ?? "rejected");
  const accepted = decision === "accepted";
  const c = await cookies();
  c.set("cookie_consent", accepted ? "accepted" : "rejected", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cookieConsent: accepted },
    });
  }
}
