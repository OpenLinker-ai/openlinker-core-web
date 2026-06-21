"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DeliveryItem, DeliveryTarget } from "./types";

interface Props {
  locale?: Locale;
  runId: string;
  runStatus: string;
}

const TERMINAL_STATES = new Set(["success", "failed", "timeout"]);

export function RunDeliverySection({ locale = "zh", runId, runStatus }: Props) {
  const copy =
    locale === "zh"
      ? {
          targetLoadFailed: "拉取投递目标失败",
          historyLoadFailed: "拉取投递历史失败",
          stillRunning: "Run 仍在执行中，完成后再投递",
          noTarget: "请先在 /connect 配置一个投递目标",
          queued: "投递已入队",
          deliverFailed: "触发投递失败",
          retryQueued: "已加入重试队列",
          retryFailed: "重试失败",
          title: "投递",
          refreshHistory: "刷新历史",
          refresh: "刷新",
          loading: "正在加载投递目标…",
          noTargetsPrefix: "还没有投递目标。先去",
          noTargetsSuffix: "添加一个 Webhook 或 Slack 目标。",
          target: "目标",
          default: "（默认）",
          delivering: "投递中…",
          deliverNow: "立即投递",
          waitRun: "等待 Run 完成",
        }
      : {
          targetLoadFailed: "Failed to load delivery targets",
          historyLoadFailed: "Failed to load delivery history",
          stillRunning: "Run is still running. Deliver after it finishes.",
          noTarget: "Configure a delivery target in /connect first",
          queued: "Delivery queued",
          deliverFailed: "Failed to trigger delivery",
          retryQueued: "Added to retry queue",
          retryFailed: "Retry failed",
          title: "Delivery",
          refreshHistory: "Refresh history",
          refresh: "Refresh",
          loading: "Loading delivery targets…",
          noTargetsPrefix: "No delivery targets yet. Go to",
          noTargetsSuffix: "to add a Webhook or Slack target.",
          target: "Target",
          default: " (default)",
          delivering: "Delivering…",
          deliverNow: "Deliver now",
          waitRun: "Waiting for Run",
        };
  const { fetch: apiFetch, isAuthenticated } = useApi();
  const [targets, setTargets] = useState<DeliveryTarget[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const canDeliver = TERMINAL_STATES.has(runStatus);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const [tRes, dRes] = await Promise.all([
          apiFetch<{ items: DeliveryTarget[] }>("/api/v1/delivery-targets").catch(
            (err) => {
              if (err instanceof ApiError && err.status !== 401) {
                toast.error(err.message || copy.targetLoadFailed);
              }
              return { items: [] as DeliveryTarget[] };
            },
          ),
          apiFetch<{ items: DeliveryItem[] }>(
            `/api/v1/runs/${encodeURIComponent(runId)}/deliveries`,
          ).catch((err) => {
            if (err instanceof ApiError && err.status !== 401) {
              toast.error(err.message || copy.historyLoadFailed);
            }
            return { items: [] as DeliveryItem[] };
          }),
        ]);
        if (cancelled) return;
        const items = tRes?.items ?? [];
        setTargets(items);
        const def = items.find((t) => t.is_default);
        setSelectedId((prev) => prev || def?.id || items[0]?.id || "");
        setDeliveries(dRes?.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, copy.historyLoadFailed, copy.targetLoadFailed, isAuthenticated, runId, reloadKey]);

  const reloadDeliveries = async () => {
    try {
      const data = await apiFetch<{ items: DeliveryItem[] }>(
        `/api/v1/runs/${encodeURIComponent(runId)}/deliveries`,
      );
      setDeliveries(data?.items ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error(err.message || copy.historyLoadFailed);
      }
    }
  };

  const handleDeliver = async () => {
    if (!canDeliver) {
      toast.error(copy.stillRunning);
      return;
    }
    if (!selectedId) {
      toast.error(copy.noTarget);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/runs/${encodeURIComponent(runId)}/deliver`, {
        method: "POST",
        body: { target_id: selectedId },
      });
      toast.success(copy.queued);
      await reloadDeliveries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.deliverFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (delivery: DeliveryItem) => {
    setRetryingId(delivery.id);
    try {
      await apiFetch(`/api/v1/deliveries/${delivery.id}/retry`, { method: "POST" });
      toast.success(copy.retryQueued);
      await reloadDeliveries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : copy.retryFailed);
    } finally {
      setRetryingId(null);
    }
  };

  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedId),
    [targets, selectedId],
  );

  return (
    <section className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-bold text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
          aria-label={copy.refreshHistory}
        >
          <Icon name="refresh" size="sm" />
          {copy.refresh}
        </button>
      </div>

      <div className="space-y-4 p-5">
        {loading ? (
          <div className="rounded-2xl bg-[color:var(--ol-soft)] px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
            {copy.loading}
          </div>
        ) : targets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-4 py-6 text-[12.5px] text-[color:var(--ol-muted)]">
            {copy.noTargetsPrefix}
            <a
              className="mx-1 font-black text-[color:var(--ol-primary-dark)] underline"
              href="/connect"
            >
              /connect
            </a>
            {copy.noTargetsSuffix}
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
                {copy.target}
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)]"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.type}
                    {t.is_default ? copy.default : ""}
                  </option>
                ))}
              </select>
              {selectedTarget ? (
                <div className="truncate text-[11.5px] text-[color:var(--ol-muted)]">
                  {selectedTarget.url}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleDeliver}
              disabled={submitting || !canDeliver || !selectedId}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-[900] text-white shadow-sm",
                submitting || !canDeliver || !selectedId
                  ? "cursor-not-allowed bg-[color:var(--ol-subtle)]"
                  : "bg-[color:var(--ol-primary)] hover:bg-[color:var(--ol-primary-dark)]",
              )}
            >
              {submitting ? copy.delivering : canDeliver ? copy.deliverNow : copy.waitRun}
            </button>
          </div>
        )}

        <DeliveryHistory
          locale={locale}
          items={deliveries}
          onRetry={handleRetry}
          retryingId={retryingId}
        />
      </div>
    </section>
  );
}

function DeliveryHistory({
  locale,
  items,
  onRetry,
  retryingId,
}: {
  locale: Locale;
  items: DeliveryItem[];
  onRetry: (d: DeliveryItem) => void;
  retryingId: string | null;
}) {
  const copy =
    locale === "zh"
      ? {
          empty: "尚无投递历史",
          attempt: (n: number) => `第 ${n} 次`,
          retrying: "重试中…",
          retry: "重试",
          nextRetry: "下次重试",
        }
      : {
          empty: "No delivery history yet",
          attempt: (n: number) => `Attempt ${n}`,
          retrying: "Retrying…",
          retry: "Retry",
          nextRetry: "Next retry",
        };
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-white px-4 py-6 text-center text-[12.5px] text-[color:var(--ol-muted)]">
        {copy.empty}
      </div>
    );
  }
  return (
    <ul className="grid gap-2">
      {items.map((d) => (
        <li
          key={d.id}
          className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("ol-chip", chipForStatus(d.status))}>
                {d.status}
              </span>
              <span className="ol-chip ol-chip-mint">{d.target_type}</span>
              <span className="text-[11px] font-bold text-[color:var(--ol-muted)]">
                {copy.attempt(d.attempt_count)}
              </span>
              {d.response_status ? (
                <span className="text-[11px] font-bold text-[color:var(--ol-muted)]">
                  HTTP {d.response_status}
                </span>
              ) : null}
            </div>
            {d.status === "failed" ? (
              <button
                type="button"
                onClick={() => onRetry(d)}
                disabled={retryingId === d.id}
                className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
              >
                {retryingId === d.id ? copy.retrying : copy.retry}
              </button>
            ) : null}
          </div>
          <div className="mt-1.5 truncate text-[11.5px] text-[color:var(--ol-muted)]">
            {d.target_url}
          </div>
          {d.error_message ? (
            <div className="mt-1.5 rounded-md bg-[#fde7e7] px-2 py-1 text-[11.5px] text-[#7a1f1f]">
              {d.error_message}
            </div>
          ) : null}
          <div className="mt-1.5 text-[11px] text-[color:var(--ol-subtle)]">
            {formatTime(d.created_at, locale)}
            {d.next_retry_at ? (
              <span> · {copy.nextRetry} {formatTime(d.next_retry_at, locale)}</span>
            ) : null}
          </div>
        </li>
      ))}
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
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
  } catch {
    return iso;
  }
}
