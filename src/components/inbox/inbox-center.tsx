"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusLabel,
  localizedBackendText,
  localizedBackendTextList,
} from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  agentId: string;
  title: string;
  body: string;
  time: string;
  href: string;
  icon: IconName;
  unread: boolean;
  recovered: boolean;
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
  const copy =
    locale === "zh"
      ? {
          kicker: "通知中心",
          scopeTitle: "告警范围",
          scopeBody: "仅显示服务端可用性巡检产生的 Agent 异常与恢复记录。",
          total: "全部告警",
          markAll: "全部已读",
          stream: "可用性告警",
          unread: (n: number) => `${n} 未读`,
          empty: "暂无可用性告警。巡检发现 Agent 异常或恢复后，记录会出现在这里。",
          new: "新",
          read: "已读",
          issue: "连接异常",
          recovered: "已恢复",
          overview: "告警概览",
          affectedAgents: "涉及 Agent",
          shortcuts: "快捷入口",
          usage: "运行历史",
          hub: "Agent 管理",
          notifications: "通知设置",
        }
      : {
          kicker: "Inbox",
          scopeTitle: "Alert scope",
          scopeBody: "Only Agent failures and recoveries reported by server-side availability probes appear here.",
          total: "All alerts",
          markAll: "Mark all read",
          stream: "Availability alerts",
          unread: (n: number) => `${n} unread`,
          empty: "No availability alerts. A record will appear when a probe detects an Agent failure or recovery.",
          new: "New",
          read: "Read",
          issue: "Connection issue",
          recovered: "Recovered",
          overview: "Alert overview",
          affectedAgents: "Affected Agents",
          shortcuts: "Shortcuts",
          usage: "Run history",
          hub: "Agent Console",
          notifications: "Notification settings",
        };

  const unreadCount = items.filter((item) => item.unread).length;
  const affectedAgentCount = new Set(items.map((item) => item.agentId)).size;

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
        <div className="ol-kicker">{copy.kicker}</div>
        <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
          {copy.scopeTitle}
        </h2>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
          {copy.scopeBody}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label={copy.total} value={String(items.length)} />
          <Metric label={copy.read} value={String(items.length - unreadCount)} />
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
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
          {items.length === 0 ? (
            <div className="p-10 text-center text-[13px] font-semibold text-[color:var(--ol-muted)]">
              {copy.empty}
            </div>
          ) : null}
          {items.map((item) => (
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
                  <span className={cn("ol-chip", item.recovered ? "ol-chip-green" : "ol-chip-amber")}>
                    {item.recovered ? copy.recovered : copy.issue}
                  </span>
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
            {copy.overview}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label={copy.total} value={String(items.length)} />
            <Metric label={copy.unread(unreadCount)} value={String(unreadCount)} />
            <Metric label={copy.affectedAgents} value={String(affectedAgentCount)} />
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.shortcuts}
          </h2>
          <div className="mt-4 grid gap-2">
            <Link className="ol-filter-item active" href="/run">
              {copy.usage} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/hub">
              {copy.hub} <span>→</span>
            </Link>
            <Link className="ol-filter-item" href="/settings?tab=notifications">
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
  const name = alert.agent_name || alert.agent_slug || "Agent";
  const status = availabilityStatusLabel(alert.availability_status, locale);
  const visibleError = localizedBackendText(alert.last_error, locale, "");
  const localizedHints = localizedBackendTextList(alert.repair_hints ?? [], locale);
  const title = isRecovered
    ? locale === "zh"
      ? `${name} 可用性已恢复`
      : `${name} availability recovered`
    : locale === "zh"
      ? `${name} 可用性异常`
      : `${name} availability issue`;
  let body = isRecovered
    ? locale === "zh"
      ? `服务端巡检已通过，当前状态为${status}。`
      : `The server-side probe passed. Current status: ${status}.`
    : locale === "zh"
      ? `服务端巡检已连续失败 ${alert.consecutive_failures} 次，当前状态为${status}。`
      : `The server-side probe failed ${alert.consecutive_failures} consecutive ${alert.consecutive_failures === 1 ? "time" : "times"}. Current status: ${status}.`;
  if (visibleError) {
    body += locale === "zh" ? ` 最近错误：${visibleError}` : ` Latest error: ${visibleError}`;
  }
  if (localizedHints.length > 0) {
    body += locale === "zh"
      ? ` 修复建议：${localizedHints.join("；")}`
      : ` Suggested checks: ${localizedHints.join("; ")}`;
  } else if (!isRecovered) {
    body += locale === "zh"
      ? " 请进入 Agent 接入页检查连接配置。"
      : " Open Agent setup to check the connection configuration.";
  }
  return {
    id: alert.id,
    agentId: alert.agent_id,
    title,
    body,
    time: formatTime(alert.created_at, locale),
    href: `/hub/agents/${encodeURIComponent(alert.agent_id)}/onboarding`,
    icon: isRecovered ? "check" : "warn",
    unread: !alert.read_at,
    recovered: isRecovered,
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
