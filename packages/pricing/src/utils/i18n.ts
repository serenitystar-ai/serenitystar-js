type I18nStrings = {
  title: string;
  description: string;
  ctaText: string;
  loading: string;
  error: string;
  noPlans: string;
  monthly: string;
  annual: string;
  billedAnnually: string;
  perMonth: string;
};

const translations: Record<string, I18nStrings> = {
  en: {
    title: "Pricing",
    description: "Start with a free trial, no credit card required and pay-as-you-go.",
    ctaText: "Get Started",
    loading: "Loading pricing plans...",
    error: "Error",
    noPlans: "No pricing plans available.",
    monthly: "Monthly",
    annual: "Annual",
    billedAnnually: "/month (billed annually)",
    perMonth: "/month",
  },
  es: {
    title: "Precios",
    description: "Comienza con una prueba gratuita, sin tarjeta de crédito y paga según tu uso.",
    ctaText: "Comenzar",
    loading: "Cargando planes de precios...",
    error: "Error",
    noPlans: "No hay planes de precios disponibles.",
    monthly: "Mensual",
    annual: "Anual",
    billedAnnually: "/mes (facturación anual)",
    perMonth: "/mes",
  },
};

/**
 * Returns translation strings for the given language code.
 * If no language is provided, detects the browser language.
 * Falls back to English if the language is not supported.
 */
export function getDefaults(language?: string): I18nStrings {
  const lang = language
    ?? (typeof navigator !== "undefined"
      ? navigator.language.slice(0, 2).toLowerCase()
      : "en");

  return translations[lang] ?? translations.en;
}
