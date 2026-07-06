"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DeliveryHistoryList } from "@/components/delivery/delivery-history-list";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { targetTypeLabel } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

import type { DeliveryItem, DeliveryTarget } from "./types";

interface Props {
  locale?: Locale;
  runId: string;
  runStatus: string;
  historyHref?: string;
  historyMode?: "inline" | "link";
}

const TERMINAL_STATES = new Set(["success", "failed", "timeout"]);

export function RunDeliverySection({
  locale = "zh",
  runId,
  runStatus,
  historyHref,
  historyMode = "inline",
}: Props) {
  const copy =
    locale === "zh"
      ? {
          targetLoadFailed: "拉取投递目标失败",
          historyLoadFailed: "拉取投递历史失败",
          stillRunning: "运行仍在执行中，完成后再投递",
          noTarget: "请先配置一个通知投递目标",
          queued: "投递已入队",
          deliverFailed: "触发投递失败",
          retryQueued: "已加入重试队列",
          retryFailed: "重试失败",
          title: "手动投递",
          refreshHistory: "刷新历史",
          refresh: "刷新",
          loading: "正在加载投递目标…",
          noTargetsPrefix: "还没有通知投递目标。先到",
          noTargetsSuffix: "添加 Webhook 或 Slack。",
          target: "目标",
          default: "（默认）",
          delivering: "投递中…",
          deliverNow: "立即投递",
          waitRun: "等待运行完成",
          historySummary: "本次运行投递历史",
          viewHistory: "查看通知投递历史",
          success: "成功",
          failed: "失败",
          pending: "待处理",
        }
      : {
          targetLoadFailed: "Failed to load delivery targets",
          historyLoadFailed: "Failed to load delivery history",
          stillRunning: "The run is still running. Deliver after it finishes.",
          noTarget: "Configure a notification delivery target first",
          queued: "Delivery queued",
          deliverFailed: "Failed to trigger delivery",
          retryQueued: "Added to retry queue",
          retryFailed: "Retry failed",
          title: "Manual delivery",
          refreshHistory: "Refresh history",
          refresh: "Refresh",
          loading: "Loading delivery targets…",
          noTargetsPrefix: "No notification delivery targets yet. Go to",
          noTargetsSuffix: "to add Webhook or Slack.",
          target: "Target",
          default: " (default)",
          delivering: "Delivering…",
          deliverNow: "Deliver now",
          waitRun: "Waiting for run",
          historySummary: "Delivery history for this run",
          viewHistory: "View notification delivery history",
          success: "Success",
          failed: "Failed",
          pending: "Pending",
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
                toast.error(localizedErrorMessage(err, locale, copy.targetLoadFailed));
              }
              return { items: [] as DeliveryTarget[] };
            },
          ),
          apiFetch<{ items: DeliveryItem[] }>(
            `/api/v1/runs/${encodeURIComponent(runId)}/deliveries`,
          ).catch((err) => {
            if (err instanceof ApiError && err.status !== 401) {
              toast.error(localizedErrorMessage(err, locale, copy.historyLoadFailed));
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
  }, [apiFetch, copy.historyLoadFailed, copy.targetLoadFailed, isAuthenticated, locale, runId, reloadKey]);

  const reloadDeliveries = async () => {
    try {
      const data = await apiFetch<{ items: DeliveryItem[] }>(
        `/api/v1/runs/${encodeURIComponent(runId)}/deliveries`,
      );
      setDeliveries(data?.items ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        toast.error(localizedErrorMessage(err, locale, copy.historyLoadFailed));
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
      toast.error(localizedErrorMessage(err, locale, copy.deliverFailed));
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
      toast.error(localizedErrorMessage(err, locale, copy.retryFailed));
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
                    {t.name} · {targetTypeLabel(t.type, locale)}
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

        {historyMode === "link" ? (
          <HistorySummary
            copy={copy}
            items={deliveries}
            href={historyHref}
          />
        ) : (
          <DeliveryHistoryList
            locale={locale}
            items={deliveries}
            onRetry={handleRetry}
            retryingId={retryingId}
          />
        )}
      </div>
    </section>
  );
}

function HistorySummary({
  copy,
  items,
  href,
}: {
  copy: {
    historySummary: string;
    viewHistory: string;
    success: string;
    failed: string;
    pending: string;
  };
  items: DeliveryItem[];
  href?: string;
}) {
  const successCount = items.filter((item) => item.status === "success").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const pendingCount = items.filter((item) => item.status === "pending").length;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
      <div>
        <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
          {copy.historySummary}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="ol-chip ol-chip-green">{copy.success} {successCount}</span>
          <span className="ol-chip ol-chip-amber">{copy.failed} {failedCount}</span>
          <span className="ol-chip ol-chip-mint">{copy.pending} {pendingCount}</span>
        </div>
      </div>
      {href ? (
        <Link
          href={href}
          className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
        >
          {copy.viewHistory}
        </Link>
      ) : null}
    </div>
  );
}
