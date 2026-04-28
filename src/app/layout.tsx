import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { LiveChat } from "@/components/live-chat";
import { resolveLocaleAndCurrency } from "@/lib/locale-server";
import { getLocaleDir, LOCALE_META } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProBoost.gg — Pro ARC Raiders Boosting & Coaching",
  description:
    "Premium ARC Raiders boosting, coaching, and carry services performed by elite Pros. Bid-driven pricing, verified players, fast delivery.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await resolveLocaleAndCurrency();
  const dir = getLocaleDir(locale);
  const htmlLang = LOCALE_META[locale]?.code ?? "en";

  return (
    <html
      lang={htmlLang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        <CookieBanner />
        <LiveChat crispWebsiteId={process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID} />
      </body>
    </html>
  );
}
