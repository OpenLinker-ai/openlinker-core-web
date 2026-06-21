"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

export async function setLocaleCookie(nextLocale: Locale) {
  const locale = normalizeLocale(nextLocale);
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
