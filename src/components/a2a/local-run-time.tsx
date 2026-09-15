"use client";

import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";

const subscribeToHydration = () => () => undefined;

// A2A's directory is server-rendered, while its details are interactive. Use
// the same UTC first render in both, then the browser's zone after hydration.
export function LocalRunTime({ value, locale }: { value: string; locale: Locale }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <time>{value}</time>;
  const formatted = date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(hydrated ? {} : { timeZone: "UTC" }),
  });
  return <time dateTime={value}>{formatted}</time>;
}
