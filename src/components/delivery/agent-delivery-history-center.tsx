"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { DeliveryHistoryList } from "@/components/delivery/delivery-history-list";
import type { DeliveryItem } from "@/components/delivery/types";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  agent: AgentResponse;
  items: DeliveryItem[];
  status?: string;
  runId?: string;
};

const STATUS_FILTERS = ["", "pending", "success", "failed"] as const;

export function AgentDeliveryHistoryCenter({
  locale,
  agent,
  items,
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
          subtitle: "查看当前账号触发此 Agent 时产生的通知投递记录，包含 Webhook、Slack 和后续 Email 目标。",
          backSettings: "返回通知投递设置",
          runDetail: "返回运行详情",
          retryQueued: "已加入重试队列",
          retryFailed: "重试失败",
          all: "全部",
          pending: "待处理",
          success: "成功",
          failed: "失败",
          empty: "当前筛选条件下没有通知投递历史。",
          total: "总数",
        }
      : {
          title: "Notification delivery history",
          subtitle: "Review notification delivery records created when this account invokes the Agent, including Webhook, Slack, and future Email targets.",
          backSettings: "Back to notification delivery settings",
          runDetail: "Back to run detail",
          retryQueued: "Added to retry queue",
          retryFailed: "Retry failed",
          all: "All",
          pending: "Pending",
          success: "Success",
          failed: "Failed",
          empty: "No notification delivery history matches this filter.",
          total: "Total",
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
      toast.error(err instanceof ApiError ? err.message : copy.retryFailed);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="ol-kicker">delivery history</div>
            <h1 className="mt-2 text-[30px] font-[900] leading-tight text-[color:var(--ol-ink)]">
              {agent.name} · {copy.title}
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[color:var(--ol-muted)]">
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

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label={copy.total} value={items.length} />
        <MetricCard label={copy.pending} value={counts.pending} />
        <MetricCard label={copy.success} value={counts.success} />
        <MetricCard label={copy.failed} value={counts.failed} />
      </section>

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
          <DeliveryHistoryList
            locale={locale}
            items={items}
            onRetry={retry}
            retryingId={retryingId}
            emptyText={copy.empty}
          />
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
