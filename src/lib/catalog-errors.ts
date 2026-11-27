import type { Locale } from "@/lib/i18n";
import { skillPackageErrorText } from "@/lib/skill-packages";
import { catalogErrorMessages } from "@/messages/catalog";

export function catalogErrorText(
  error: unknown,
  locale: Locale,
  fallback: string,
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const messages = catalogErrorMessages[locale];
  if (Object.hasOwn(messages, code)) return messages[code];
  return skillPackageErrorText(error, locale, fallback);
}
