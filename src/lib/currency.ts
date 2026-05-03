import { Currency } from "@prisma/client";

// Simple static FX table; production should source rates from a daily-refreshed
// API and persist them per-day for auditing. Rates are USD->target.
export const FX_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  EGP: 49.0,
  SAR: 3.75,
};

export const CURRENCY_META: Record<Currency, { symbol: string; name: string }> = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  EGP: { symbol: "EGP", name: "Egyptian Pound" },
  SAR: { symbol: "SAR", name: "Saudi Riyal" },
};

export function convertFromUsdCents(usdCents: number, target: Currency): number {
  const rate = FX_RATES[target] ?? 1;
  return Math.round(usdCents * rate);
}

export function formatCents(amountCents: number, currency: Currency): string {
  const major = amountCents / 100;
  if (currency === "USD" || currency === "EUR") {
    const sym = CURRENCY_META[currency].symbol;
    return `${sym}${major.toFixed(2)}`;
  }
  const sym = CURRENCY_META[currency].symbol;
  return `${major.toFixed(2)} ${sym}`;
}

export function formatUsdCents(usdCents: number, target: Currency = "USD"): string {
  if (target === "USD") return formatCents(usdCents, "USD");
  const converted = convertFromUsdCents(usdCents, target);
  return formatCents(converted, target);
}
