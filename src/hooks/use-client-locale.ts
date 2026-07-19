"use client";

import { createContext, useContext } from "react";

import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export const ClientLocaleContext = createContext<Locale | undefined>(undefined);

export function useClientLocale(defaultLocale: Locale = DEFAULT_LOCALE): Locale {
  return useContext(ClientLocaleContext) ?? defaultLocale;
}
