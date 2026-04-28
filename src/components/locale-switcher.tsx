"use client";

import { useTransition } from "react";
import { Currency, Locale } from "@prisma/client";
import { setLocale, setCurrency } from "@/app/actions/locale";
import { LOCALE_META } from "@/lib/i18n";
import { CURRENCY_META } from "@/lib/currency";

type Props = {
  currentLocale: Locale;
  currentCurrency: Currency;
};

export function LocaleSwitcher({ currentLocale, currentCurrency }: Props) {
  const [pending, startTransition] = useTransition();

  function changeLocale(value: string) {
    const fd = new FormData();
    fd.set("locale", value);
    startTransition(() => {
      void setLocale(fd);
    });
  }

  function changeCurrency(value: string) {
    const fd = new FormData();
    fd.set("currency", value);
    startTransition(() => {
      void setCurrency(fd);
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <select
        aria-label="Locale"
        value={currentLocale}
        onChange={(e) => changeLocale(e.target.value)}
        disabled={pending}
        className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-2 py-1"
      >
        {(Object.keys(LOCALE_META) as Locale[]).map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].name}
          </option>
        ))}
      </select>
      <select
        aria-label="Currency"
        value={currentCurrency}
        onChange={(e) => changeCurrency(e.target.value)}
        disabled={pending}
        className="rounded-md border border-[color:var(--border)] bg-[#0d1018] px-2 py-1"
      >
        {(Object.keys(CURRENCY_META) as Currency[]).map((c) => (
          <option key={c} value={c}>
            {CURRENCY_META[c].symbol} {c}
          </option>
        ))}
      </select>
    </div>
  );
}
