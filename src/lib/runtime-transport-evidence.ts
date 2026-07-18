import type { Locale } from "@/lib/i18n";

const RUNTIME_TRANSPORT_LABEL: Record<string, Record<Locale, string>> = {
  websocket: { zh: "WebSocket", en: "WebSocket" },
  long_poll: { zh: "长轮询 / Runtime Pull", en: "Long Poll / Runtime Pull" },
};

const RUNTIME_TRANSPORT_REASON_LABEL: Record<string, Record<Locale, string>> = {
  explicit: { zh: "显式选择", en: "Explicit" },
  websocket_unavailable: {
    zh: "WebSocket 不可用，已回退",
    en: "WebSocket unavailable; fallback active",
  },
  policy_forced: { zh: "策略指定", en: "Policy selected" },
  recovery: { zh: "WebSocket 已恢复", en: "WebSocket recovered" },
};

export function runtimeTransportLabel(value: string | undefined, locale: Locale): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  return RUNTIME_TRANSPORT_LABEL[normalized]?.[locale] ?? normalized;
}

export function runtimeTransportReasonLabel(value: string | undefined, locale: Locale): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  return RUNTIME_TRANSPORT_REASON_LABEL[normalized]?.[locale] ?? normalized;
}

export function formatRuntimeTransportEvidenceTime(value: string | undefined, locale: Locale): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  const formatted = parsed.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}
