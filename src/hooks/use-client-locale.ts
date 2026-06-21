"use client";

import { useState } from "react";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

export function useClientLocale(defaultLocale: Locale = "zh"): Locale {
  const [locale] = useState<Locale>(() => {
    if (typeof document === "undefined") return defaultLocale;
    const raw = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1];
    return normalizeLocale(raw ? decodeURIComponent(raw) : defaultLocale);
  });

  return locale;
}
