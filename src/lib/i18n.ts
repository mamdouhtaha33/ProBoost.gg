import { Locale } from "@prisma/client";

export const SUPPORTED_LOCALES: Locale[] = ["EN", "AR", "ES"];

export const LOCALE_META: Record<Locale, { code: string; name: string; dir: "ltr" | "rtl" }> = {
  EN: { code: "en", name: "English", dir: "ltr" },
  AR: { code: "ar", name: "العربية", dir: "rtl" },
  ES: { code: "es", name: "Español", dir: "ltr" },
};

export type Dictionary = Record<string, string>;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  EN: {
    "site.tagline": "The professional gaming marketplace",
    "nav.games": "Games",
    "nav.pros": "Pros",
    "nav.howItWorks": "How it works",
    "nav.blog": "Blog",
    "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "home.hero.title": "Win more. Stress less. Play with verified Pros.",
    "home.hero.subtitle":
      "Boosting, coaching, and carries from the world's top 0.1% — every game, every region.",
    "home.cta.browse": "Browse games",
    "home.cta.becomePro": "Become a Pro",
    "common.placeOrder": "Place order",
    "common.bid": "Bid",
    "common.accept": "Accept",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.loading": "Loading…",
    "common.continue": "Continue",
    "footer.legal": "Legal",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy",
    "footer.refunds": "Refund policy",
    "footer.cookies": "Cookies",
    "cookies.banner.body":
      "We use cookies to keep you signed in, remember your locale, and measure traffic.",
    "cookies.banner.accept": "Accept all",
    "cookies.banner.reject": "Reject non-essential",
  },
  AR: {
    "site.tagline": "ماركت بليس الجيمنج المحترف",
    "nav.games": "الألعاب",
    "nav.pros": "البروز",
    "nav.howItWorks": "كيف يعمل",
    "nav.blog": "المدونة",
    "nav.faq": "الأسئلة",
    "nav.dashboard": "لوحتي",
    "nav.signIn": "تسجيل الدخول",
    "nav.signOut": "تسجيل الخروج",
    "home.hero.title": "اكسب أكتر. اقلق أقل. العب مع بروز موثوقين.",
    "home.hero.subtitle":
      "بوست وكوتشينج وكاري من أفضل 0.1% لاعبين — كل لعبة وكل منطقة.",
    "home.cta.browse": "تصفح الألعاب",
    "home.cta.becomePro": "انضم كبرو",
    "common.placeOrder": "اطلب الآن",
    "common.bid": "قدّم بيد",
    "common.accept": "قبول",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.loading": "جاري التحميل…",
    "common.continue": "متابعة",
    "footer.legal": "قانوني",
    "footer.terms": "الشروط",
    "footer.privacy": "الخصوصية",
    "footer.refunds": "سياسة الاسترداد",
    "footer.cookies": "الكوكيز",
    "cookies.banner.body":
      "نستخدم الكوكيز لإبقائك مسجل دخول وحفظ لغتك وقياس الزيارات.",
    "cookies.banner.accept": "قبول الكل",
    "cookies.banner.reject": "رفض غير الضرورية",
  },
  ES: {
    "site.tagline": "El marketplace gaming profesional",
    "nav.games": "Juegos",
    "nav.pros": "Pros",
    "nav.howItWorks": "Cómo funciona",
    "nav.blog": "Blog",
    "nav.faq": "FAQ",
    "nav.dashboard": "Panel",
    "nav.signIn": "Iniciar sesión",
    "nav.signOut": "Cerrar sesión",
    "home.hero.title": "Gana más. Estresa menos. Juega con Pros verificados.",
    "home.hero.subtitle":
      "Boosting, coaching y carries del top 0.1% mundial — todos los juegos, todas las regiones.",
    "home.cta.browse": "Ver juegos",
    "home.cta.becomePro": "Hazte Pro",
    "common.placeOrder": "Hacer pedido",
    "common.bid": "Pujar",
    "common.accept": "Aceptar",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.loading": "Cargando…",
    "common.continue": "Continuar",
    "footer.legal": "Legal",
    "footer.terms": "Términos de servicio",
    "footer.privacy": "Privacidad",
    "footer.refunds": "Política de reembolso",
    "footer.cookies": "Cookies",
    "cookies.banner.body":
      "Usamos cookies para tu sesión, idioma y métricas de tráfico.",
    "cookies.banner.accept": "Aceptar todo",
    "cookies.banner.reject": "Rechazar no esenciales",
  },
};

export function t(locale: Locale, key: string): string {
  return DICTIONARIES[locale]?.[key] ?? DICTIONARIES.EN[key] ?? key;
}

export function getLocaleDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
