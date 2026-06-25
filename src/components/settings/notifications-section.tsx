import Link from "next/link";

import type { Locale } from "@/lib/i18n";

interface NotifRow {
  label: string;
  available: string[];
  unavailable: string[];
  href?: string;
  action?: string;
}

const COPY: Record<Locale, {
  title: string;
  body: string;
  available: string;
  unavailable: string;
  open: string;
  rows: NotifRow[];
}> = {
  zh: {
    title: "通知能力",
    body: "完成、失败、取消、投递失败等事件统一进入通知投递配置；调用方不持续监听时，可在发起任务时声明任务回调，运行详情只显示投递记录。",
    available: "可用",
    unavailable: "后续开放",
    open: "打开",
    rows: [
      {
        label: "Agent 可用性告警",
        available: ["站内通知中心"],
        unavailable: ["邮件", "移动推送"],
        href: "/inbox",
        action: "查看通知",
      },
      {
        label: "运行事件通知",
        available: ["Webhook 投递", "Slack 投递"],
        unavailable: ["邮件摘要"],
        href: "/run",
        action: "查看运行",
      },
      {
        label: "API 与接入安全",
        available: ["访问令牌管理", "Agent 绑定用途"],
        unavailable: ["短信"],
      },
    ],
  },
  en: {
    title: "Notification Capabilities",
    body: "Completion, failure, cancellation, and delivery-failure events are handled through notification delivery settings. Callers that are not continuously listening can declare optional task callbacks when starting a task; run detail only shows delivery records.",
    available: "available",
    unavailable: "planned",
    open: "Open",
    rows: [
      {
        label: "Agent availability alerts",
        available: ["Inbox"],
        unavailable: ["Email", "Mobile push"],
        href: "/inbox",
        action: "View inbox",
      },
      {
        label: "Run event notifications",
        available: ["Webhook delivery", "Slack delivery"],
        unavailable: ["Email digest"],
        href: "/run",
        action: "View runs",
      },
      {
        label: "API and access safety",
        available: ["Access token management", "Agent-bound usage"],
        unavailable: ["SMS"],
      },
    ],
  },
};

export function NotificationsSection({ locale = "zh" }: { locale?: Locale }) {
  const copy = COPY[locale];

  return (
    <section id="notifications" className="ol-panel ol-panel-pad scroll-mt-24 space-y-2">
      <header className="pb-2">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </h3>
        <p className="mt-1 text-[12px] text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
      </header>

      <div>
        {copy.rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-3 border-t border-[color:var(--ol-line)] py-3 first:border-t-0 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center"
          >
            <label className="text-[12px] font-bold text-[color:var(--ol-muted)]">
              {row.label}
            </label>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {row.available.map((channel) => (
                <span key={channel} className="ol-chip ol-chip-green">
                  {channel} · {copy.available}
                </span>
              ))}
              {row.unavailable.map((channel) => (
                <span key={channel} className="ol-chip">
                  {channel} · {copy.unavailable}
                </span>
              ))}
            </div>
            {row.href ? (
              <Link href={row.href} className="ol-mini-btn justify-center">
                {row.action ?? copy.open}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
