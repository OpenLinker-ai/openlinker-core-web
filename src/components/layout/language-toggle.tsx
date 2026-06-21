"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleCookie } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: "zh", label: "中" },
  { locale: "en", label: "EN" },
];

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    startTransition(() => {
      void setLocaleCookie(nextLocale).then(() => {
        router.refresh();
      });
    });
  };

  return (
    <div
      className="inline-flex h-9 items-center rounded-xl border border-[color:var(--ol-line)] bg-white p-1"
      aria-label={locale === "zh" ? "语言切换" : "Language switcher"}
    >
      {OPTIONS.map((option) => {
        const active = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => switchLocale(option.locale)}
            disabled={pending}
            className={cn(
              "inline-flex h-7 min-w-8 items-center justify-center rounded-lg px-2 text-[12px] font-black transition-colors",
              active
                ? "bg-[color:var(--ol-primary)] text-white"
                : "text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-ink)]",
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
