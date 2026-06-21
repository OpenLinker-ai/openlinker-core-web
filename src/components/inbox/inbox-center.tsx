"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type InboxType = "全部" | "运行" | "审核" | "Webhook" | "Agent";

type NotificationItem = {
  id: string;
  type: Exclude<InboxType, "全部">;
  title: string;
  body: string;
  time: string;
  href: string;
  icon: IconName;
  unread: boolean;
  source?: "availability_alert";
};

export type AvailabilityAlert = {
  id: string;
  agent_id: string;
  agent_slug?: string;
  agent_name?: string;
  type: string;
  severity: string;
  availability_status: string;
  consecutive_failures: number;
  title: string;
  message: string;
  last_error?: string;
  repair_hints?: string[];
  read_at?: string;
  created_at: string;
  updated_at: string;
};

const FILTERS: InboxType[] = ["全部", "Agent", "运行", "审核", "Webhook"];

export function InboxCenter({
  availabilityAlerts = [],
  locale = "zh",
}: {
  availabilityAlerts?: AvailabilityAlert[];
  locale?: Locale;
}) {
  const { fetch: apiFetch } = useApi();
  const [items, setItems] = useState<NotificationItem[]>(() =>
    availabilityAlerts.map((alert) => alertToNotification(alert, locale)),
  );
  const [filter, setFilter] = useState<InboxType>("全部");
  const copy =
    locale === "zh"
      ? {
          filterTitle: "通知筛选",
          filterLabels: { "全部": "全部", Agent: "Agent", "运行": "运行", "审核": "审核", Webhook: "Webhook" } as Record<InboxType, string>,
          markAll: "全部已读",
          stream: "通知流",
          unread: (n: number) => `${n} 未读`,
          empty: "暂无通知。Agent 可用性巡检发现异常时，会在这里出现站内告警。",
          new: "新",
          read: "已读",
          today: "今日概览",
          shortcuts: "快捷入口",
          usage: "运行历史",
          hub: "创作者中心",
          notifications: "通知能力",
        }
      : {
          filterTitle: "Notification filters",
          filterLabels: { "全部": "All", Agent: "Agent", "运行": "Runs", "审核": "Review", Webhook: "Webhook" } as Record<InboxType, string>,
          markAll: "Mark all read",
          stream: "Notification Stream",
          unread: (n: number) => `${n} unread`,
          empty: "No notifications yet. Agent availability alerts will appear here when probes find issues.",
          new: "New",
          read: "Read",
          today: "Today",
          shortcuts: "Shortcuts",
          usage: "Run history",
          hub: "Creator Hub",
          notifications: "Notification capabilities",
        };

  const unreadCount = items.filter((item) => item.unread).length;
  const visible = useMemo(
    () => items.filter((item) => filter === "全部" || item.type === filter),
    [filter, items],
  );

  const markRead = async (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    );
    const item = items.find((candidate) => candidate.id === id);
    if (item?.source === "availability_alert") {
      try {
        await apiFetch(`/api/v1/creator/availability-alerts/${encodeURIComponent(id)}/read`, {
          method: "POST",
        });
      } catch {
        // 本地先标已读；下次刷新会以服务端状态为准。
      }
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => item.unread);
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
    await Promise.all(
      unread
        .filter((item) => item.source === "availability_alert")
        .map((item) =>
          apiFetch(`/api/v1/creator/availability-alerts/${encodeURIComponent(item.id)}/read`, {
            method: "POST",
          }).catch(() => null),
        ),
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_310px]">
      <aside className="ol-panel ol-panel-pad h-fit">
        <div className="ol-kicker">inbox</div>
        <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
          {copy.filterTitle}
        </h2>
        <div className="mt-4 ol-filter-list">
          {FILTERS.map((item) => {
            const count =
              item === "全部"
                ? items.length
                : items.filter((n) => n.type === item).length;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn("ol-filter-item", filter === item && "active")}
              >
                {copy.filterLabels[item]}
                <span>{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[13px] border border-[color:var(--ol-line)] bg-white text-[13px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
        >
          <Icon name="check" size="sm" />
          {copy.markAll}
        </button>
      </aside>

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.stream}</strong>
          <span className="ol-chip ol-chip-mint">{copy.unread(unreadCount)}</span>
        </div>
        <div className="grid gap-0">
          {visible.length === 0 ? (
            <div className="p-10 text-center text-[13px] font-semibold text-[color:var(--ol-muted)]">
              {copy.empty}
            </div>
          ) : null}
          {visible.map((item) => (
            <article
              key={item.id}
              className={cn(
                "grid gap-4 border-b border-[color:var(--ol-line)] bg-white p-4 last:border-b-0 md:grid-cols-[44px_minmax(0,1fr)_110px]",
                item.unread && "bg-[color:var(--ol-mint)]/55",
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[color:var(--ol-blue-soft)] text-[color:var(--ol-blue)]">
                <Icon name={item.icon} size="sm" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ol-chip">{copy.filterLabels[item.type]}</span>
                  {item.unread ? <span className="ol-chip ol-chip-green">{copy.new}</span> : null}
                </div>
                <h3 className="mt-2 text-[15px] font-black text-[color:var(--ol-ink)]">
                  <Link href={item.href} onClick={() => markRead(item.id)}>
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
                  {item.body}
                </p>
              </div>
              <div className="flex flex-row items-center justify-between gap-2 md:flex-col md:items-end">
                <span className="text-[12px] font-bold text-[color:var(--ol-subtle)]">
                  {item.time}
                </span>
                <button
                  type="button"
                  onClick={() => markRead(item.id)}
                  disabled={!item.unread}
                  className="inline-flex h-8 items-center rounded-[11px] border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-black text-[color:var(--ol-muted)] disabled:cursor-default disabled:opacity-50"
                >
                  {copy.read}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.today}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Agent" value={countType(items, "Agent")} />
            <Metric label={copy.filterLabels["运行"]} value={countType(items, "运行")} />
            <Metric label={copy.filterLabels["审核"]} value={countType(items, "审核")} />
            <Metric label="Webhook" value={countType(items, "Webhook")} />
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.shortcuts}
          </h2>
          <div className="mt-4 grid gap-2">
            <Link className="ol-filter-item active" href="/runs">
              {copy.usage} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/hub">
              {copy.hub} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/settings">
              {copy.notifications} <span>→</span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function alertToNotification(alert: AvailabilityAlert, locale: Locale): NotificationItem {
  const isRecovered = alert.type === "availability_recovered";
  const hints = alert.repair_hints?.length
    ? locale === "zh"
      ? ` 修复建议：${alert.repair_hints.join("；")}`
      : ` Repair hints: ${alert.repair_hints.join("; ")}`
    : "";
  return {
    id: alert.id,
    type: "Agent",
    title: alert.title,
    body: `${alert.message}${alert.last_error ? locale === "zh" ? ` 错误：${alert.last_error}` : ` Error: ${alert.last_error}` : ""}${hints}`,
    time: formatTime(alert.created_at, locale),
    href: `/hub/agents/${encodeURIComponent(alert.agent_id)}/onboarding`,
    icon: isRecovered ? "check" : "warn",
    unread: !alert.read_at,
    source: "availability_alert",
  };
}

function formatTime(value: string, locale: Locale) {
  if (!value) return "";
  return new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countType(items: NotificationItem[], type: Exclude<InboxType, "全部">) {
  return String(items.filter((item) => item.type === type).length);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[color:var(--ol-soft)] p-3">
      <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <strong className="mt-1 block text-[18px] text-[color:var(--ol-ink)]">
        {value}
      </strong>
    </div>
  );
}
