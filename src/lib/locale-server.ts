import { cookies } from "next/headers";
import { Currency, Locale } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_LOCALES: Locale[] = ["EN", "AR", "ES"];
const VALID_CURRENCIES: Currency[] = ["USD", "EUR", "EGP", "SAR"];

export async function resolveLocaleAndCurrency(): Promise<{
  locale: Locale;
  currency: Currency;
}> {
  const jar = await cookies();
  const cLocale = jar.get("locale")?.value as Locale | undefined;
  const cCurrency = jar.get("currency")?.value as Currency | undefined;

  let locale: Locale | undefined =
    cLocale && VALID_LOCALES.includes(cLocale) ? cLocale : undefined;
  let currency: Currency | undefined =
    cCurrency && VALID_CURRENCIES.includes(cCurrency) ? cCurrency : undefined;

  if (!locale || !currency) {
    const session = await auth();
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true, currency: true },
      });
      if (u) {
        locale ??= u.locale;
        currency ??= u.currency;
      }
    }
  }

  return { locale: locale ?? "EN", currency: currency ?? "USD" };
}
