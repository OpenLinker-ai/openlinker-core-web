export const LOCALE_COOKIE = "ol_locale";
export const LOCALES = ["zh", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type LocalizedText = {
  zh: string;
  en: string;
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "zh";
}

export function text(locale: Locale, value: LocalizedText): string {
  return value[locale];
}
