"use client";

import type { Locale } from "@/lib/i18n";
import {
  deliveryStatusLabel,
  localizedBackendText,
  targetTypeLabel,
} from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

import type { DeliveryItem } from "./types";

type Props = {
  locale: Locale;
  items: DeliveryItem[];
  onRetry?: (delivery: DeliveryItem) => void;
  retryingId?: string | null;
  emptyText?: string;
};

export function DeliveryHistoryList({
  locale,
  items,
  onRetry,
  retryingId,
  emptyText,
}: Props) {
  const copy =
    locale === "zh"
      ? {
          empty: "尚无投递历史",
          attempt: (n: number) => `第 ${n} 次`,
          retrying: "重试中…",
          retry: "重试",
          nextRetry: "下次重试：",
          run: "运行",
          deliveryFailed: "投递失败，请检查目标配置与接收端状态。",
          technicalDetails: "技术详情",
        }
      : {
          empty: "No delivery history yet",
          attempt: (n: number) => `Attempt ${n}`,
          retrying: "Retrying…",
          retry: "Retry",
          nextRetry: "Next retry:",
          run: "Run",
          deliveryFailed: "Delivery failed. Check the target configuration and receiver status.",
          technicalDetails: "Technical details",
        };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-white px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
        {emptyText ?? copy.empty}
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {items.map((delivery) => {
        const rawError = delivery.error_message?.trim() ?? "";
        const localizedError = rawError
          ? localizedBackendText(rawError, locale, copy.deliveryFailed)
          : "";
        const showRawError = Boolean(rawError && rawError !== localizedError);
        return (
          <li
          key={delivery.id}
          className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-3"
          >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={cn("ol-chip", chipForStatus(delivery.status))}>
                {deliveryStatusLabel(delivery.status, locale)}
              </span>
              <span className="ol-chip ol-chip-mint">
                {targetTypeLabel(delivery.target_type, locale)}
              </span>
              <span className="text-[11px] font-bold text-[color:var(--ol-muted)]">
                {copy.attempt(delivery.attempt_count)}
              </span>
              {delivery.response_status ? (
                <span className="text-[11px] font-bold text-[color:var(--ol-muted)]">
                  HTTP {delivery.response_status}
                </span>
              ) : null}
              <span className="truncate text-[11px] font-bold text-[color:var(--ol-subtle)]">
                {copy.run} {shortID(delivery.run_id)}
              </span>
            </div>
            {delivery.status === "failed" && onRetry ? (
              <button
                type="button"
                onClick={() => onRetry(delivery)}
                disabled={retryingId === delivery.id}
                className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
              >
                {retryingId === delivery.id ? copy.retrying : copy.retry}
              </button>
            ) : null}
          </div>
          <div className="mt-1.5 truncate text-[11.5px] text-[color:var(--ol-muted)]">
            {delivery.target_url}
          </div>
          {rawError ? (
            <div className="mt-1.5 rounded-md bg-[#fde7e7] px-2 py-1 text-[11.5px] text-[#7a1f1f]">
              <div>{localizedError}</div>
              {showRawError ? (
                <details className="mt-1.5 text-[11px] text-[color:var(--ol-muted)]">
                  <summary className="cursor-pointer font-bold">{copy.technicalDetails}</summary>
                  <code className="mt-1 block whitespace-pre-wrap break-words font-mono text-[10.5px]">{rawError}</code>
                </details>
              ) : null}
            </div>
          ) : null}
          <div className="mt-1.5 text-[11px] text-[color:var(--ol-subtle)]">
            {formatTime(delivery.created_at, locale)}
            {delivery.next_retry_at ? (
              <span> · {copy.nextRetry} {formatTime(delivery.next_retry_at, locale)}</span>
            ) : null}
          </div>
          </li>
        );
      })}
    </ul>
  );
}

function chipForStatus(status: string): string {
  if (status === "success") return "ol-chip-green";
  if (status === "failed") return "ol-chip-amber";
  return "ol-chip-mint";
}

function formatTime(iso: string, locale: Locale): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
  } catch {
    return iso;
  }
}

function shortID(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}
