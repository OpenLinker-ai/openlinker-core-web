"use client";

import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";

const subscribeToHydration = () => () => undefined;

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

// A2A's directory is server-rendered, while its details are interactive. Use
// the same UTC first render in both, then the browser's zone after hydration.
// Callers with their own format pass complete options; they replace the
// defaults rather than merge, since dateStyle cannot be combined with month.
export function LocalRunTime({
  value,
  locale,
  options,
  withTitle = false,
}: {
  value: string;
  locale: Locale;
  options?: Intl.DateTimeFormatOptions;
  withTitle?: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <time>{value}</time>;
  const base = options ?? DEFAULT_OPTIONS;
  const formatted = date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", hydrated ? base : { ...base, timeZone: "UTC" });
  return (
    <time dateTime={value} title={withTitle ? formatted : undefined}>
      {formatted}
    </time>
  );
}
