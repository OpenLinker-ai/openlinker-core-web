"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  deliveryStatusLabel,
  localizedBackendText,
} from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

type TaskCallbackDelivery = {
  id: string;
  subscription_id: string;
  run_event_id: string;
  event_type: string;
  target_url: string;
  status: "pending" | "success" | "failed" | string;
  response_status?: number;
  error_message?: string;
  attempt_count: number;
  next_retry_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  locale?: Locale;
  runId: string;
  enabled: boolean;
};

export function TaskCallbackSection({ locale = "zh", runId, enabled }: Props) {
  const copy =
    locale === "zh"
      ? {
          fetchFailed: "拉取任务回调投递记录失败",
          title: "任务回调投递记录",
          body: "任务回调由调用方在发起 A2A 任务或设置 pushNotificationConfig 时声明；这里仅显示该运行的回调投递审计。",
          refresh: "刷新",
          loading: "正在加载投递记录…",
          attempts: "尝试",
          response: "HTTP",
          nextRetry: "下次重试",
          delivered: "投递于",
          created: "创建于",
          deliveryFailed: "回调投递失败，请检查目标地址与接收端状态。",
          technicalDetails: "技术详情",
        }
      : {
          fetchFailed: "Failed to load task callback delivery records",
          title: "Task callback delivery records",
          body: "Task callbacks are declared by the caller when starting an A2A task or setting pushNotificationConfig. This view only shows delivery audit records for this run.",
          refresh: "Refresh",
          loading: "Loading delivery records…",
          attempts: "Attempts",
          response: "HTTP",
          nextRetry: "Next retry",
          delivered: "Delivered",
          created: "Created",
          deliveryFailed: "Callback delivery failed. Check the target URL and receiver status.",
          technicalDetails: "Technical details",
        };
  const { fetch: apiFetch, isAuthenticated } = useApi();
  const [items, setItems] = useState<TaskCallbackDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    let cancelled = false;

    apiFetch<{ items: TaskCallbackDelivery[] }>(
      `/api/v1/runs/${encodeURIComponent(runId)}/task-callbacks/deliveries?limit=50`,
    )
      .then((data) => {
        if (!cancelled) setItems(data?.items ?? []);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status !== 401) {
          toast.error(localizedErrorMessage(err, locale, copy.fetchFailed));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch, copy.fetchFailed, enabled, isAuthenticated, locale, reloadKey, runId]);

  if (!enabled || !isAuthenticated || (loaded && items.length === 0)) {
    return null;
  }

  return (
    <section className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <div>
          <strong>{copy.title}</strong>
          <p className="mt-1 text-[12px] font-semibold text-[color:var(--ol-muted)]">
            {copy.body}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReloadKey((key) => key + 1);
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-bold text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
        >
          <Icon name="refresh" size="sm" />
          {copy.refresh}
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="rounded-2xl bg-[color:var(--ol-soft)] px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
            {copy.loading}
          </div>
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => {
              const rawError = item.error_message?.trim() ?? "";
              const localizedError = rawError
                ? localizedBackendText(rawError, locale, copy.deliveryFailed)
                : "";
              const showRawError = Boolean(rawError && rawError !== localizedError);
              return (
                <li
                key={item.id}
                className="rounded-2xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4"
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("ol-chip", deliveryChipForStatus(item.status))}>
                        {callbackDeliveryStatusLabel(item.status, locale)}
                      </span>
                      <span className="rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-bold text-[color:var(--ol-muted)]">
                        {item.event_type}
                      </span>
                    </div>
                    <div className="mt-2 truncate font-mono text-[12px] font-bold text-[color:var(--ol-ink)]">
                      {item.target_url}
                    </div>
                    {rawError ? (
                      <div className="mt-2 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#7a1f1f]">
                        <div>{localizedError}</div>
                        {showRawError ? (
                          <details className="mt-1.5 text-[11px] font-normal text-[color:var(--ol-muted)]">
                            <summary className="cursor-pointer font-bold">{copy.technicalDetails}</summary>
                            <code className="mt-1 block whitespace-pre-wrap break-words font-mono text-[10.5px]">{rawError}</code>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-1 text-right text-[11.5px] font-bold text-[color:var(--ol-muted)]">
                    <span>{copy.attempts}: {item.attempt_count}</span>
                    {item.response_status ? <span>{copy.response}: {item.response_status}</span> : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[color:var(--ol-subtle)]">
                  <span>{copy.created} {formatTime(item.created_at, locale)}</span>
                  {item.delivered_at ? <span>{copy.delivered} {formatTime(item.delivered_at, locale)}</span> : null}
                  {item.next_retry_at ? <span>{copy.nextRetry} {formatTime(item.next_retry_at, locale)}</span> : null}
                </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function deliveryChipForStatus(status: string): string {
  if (status === "success") return "ol-chip-green";
  if (status === "pending") return "ol-chip-mint";
  if (status === "failed") return "ol-chip-amber";
  return "ol-chip-mint";
}

function callbackDeliveryStatusLabel(status: string, locale: Locale): string {
  if (status === "pending") return locale === "zh" ? "待投递" : "Pending";
  return deliveryStatusLabel(status, locale);
}

function formatTime(value: string | undefined, locale: Locale): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
