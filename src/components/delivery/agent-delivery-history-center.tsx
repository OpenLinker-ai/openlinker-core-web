"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { DeliveryHistoryList } from "@/components/delivery/delivery-history-list";
import type { DeliveryItem } from "@/components/delivery/types";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  agent: AgentResponse;
  items: DeliveryItem[];
  loadError?: boolean;
  status?: string;
  runId?: string;
};

const STATUS_FILTERS = ["", "pending", "success", "failed"] as const;

export function AgentDeliveryHistoryCenter({
  locale,
  agent,
  items,
  loadError = false,
  status = "",
  runId,
}: Props) {
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const copy =
    locale === "zh"
      ? {
          title: "通知投递历史",
          subtitle: "查看投递到本账号 Webhook 或 Slack 目标的记录，按状态筛选并重试失败项。",
          backSettings: "返回通知投递设置",
          runDetail: "返回运行详情",
          retryQueued: "已加入重试队列",
          retryFailed: "重试失败",
          kicker: "投递历史",
          all: "全部",
          pending: "待处理",
          success: "成功",
          failed: "失败",
          empty: "当前筛选条件下没有通知投递历史。",
          total: "总数",
          loadFailed: "通知投递历史加载失败，请重试。",
          reload: "重新加载",
        }
      : {
          title: "Notification delivery history",
          subtitle: "Review records sent to this account's Webhook or Slack targets, filter by status, and retry failures.",
          backSettings: "Back to notification delivery settings",
          runDetail: "Back to run detail",
          retryQueued: "Added to retry queue",
          retryFailed: "Retry failed",
          kicker: "Delivery history",
          all: "All",
          pending: "Pending",
          success: "Success",
          failed: "Failed",
          empty: "No notification delivery history matches this filter.",
          total: "Total",
          loadFailed: "Could not load delivery history. Please retry.",
          reload: "Reload",
        };

  const counts = {
    pending: items.filter((item) => item.status === "pending").length,
    success: items.filter((item) => item.status === "success").length,
    failed: items.filter((item) => item.status === "failed").length,
  };

  const retry = async (delivery: DeliveryItem) => {
    setRetryingId(delivery.id);
    try {
      await apiFetch(`/api/v1/deliveries/${delivery.id}/retry`, { method: "POST" });
      toast.success(copy.retryQueued);
      router.refresh();
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.retryFailed));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>
              {agent.name} · {copy.title}
            </h1>
            <p>
              {copy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {runId ? (
              <Link
                href={`/run/${encodeURIComponent(runId)}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.runDetail}
              </Link>
            ) : null}
            <Link
              href={`/hub/agents/${encodeURIComponent(agent.slug)}/delivery${runId ? `?run_id=${encodeURIComponent(runId)}` : ""}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            >
              {copy.backSettings}
            </Link>
          </div>
        </div>
      </section>

      {!loadError ? <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label={copy.total} value={items.length} />
        <MetricCard label={copy.pending} value={counts.pending} />
        <MetricCard label={copy.success} value={counts.success} />
        <MetricCard label={copy.failed} value={counts.failed} />
      </section> : null}

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <Link
                key={filter || "all"}
                href={historyHref(agent.slug, runId, filter)}
                className={cn(
                  "ol-mini-btn",
                  status === filter
                    ? "bg-[color:var(--ol-primary)] text-white"
                    : "bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]",
                )}
              >
                {filter ? copy[filter] : copy.all}
              </Link>
            ))}
          </div>
        </div>
        <div className="p-5">
          {loadError ? (
            <div role="alert" className="space-y-3 text-[13px] text-[color:var(--ol-muted)]">
              <p>{copy.loadFailed}</p>
              <button type="button" className="ol-mini-btn" onClick={() => router.refresh()}>{copy.reload}</button>
            </div>
          ) : <DeliveryHistoryList
            locale={locale}
            items={items}
            onRetry={retry}
            retryingId={retryingId}
            emptyText={copy.empty}
          />}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <div className="mt-2 text-[24px] font-black text-[color:var(--ol-ink)]">
        {value}
      </div>
    </div>
  );
}

function historyHref(agentSlug: string, runId: string | undefined, status: string): string {
  const params = new URLSearchParams();
  if (runId) params.set("run_id", runId);
  if (status) params.set("status", status);
  const query = params.toString();
  return `/hub/agents/${encodeURIComponent(agentSlug)}/delivery/history${query ? `?${query}` : ""}`;
}
