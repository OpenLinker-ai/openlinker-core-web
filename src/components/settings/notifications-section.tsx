import Link from "next/link";

import type { Locale } from "@/lib/i18n";

interface NotifRow {
  label: string;
  channels: string[];
  href?: string;
  action?: string;
}

const COPY: Record<Locale, {
  title: string;
  body: string;
  available: string;
  open: string;
  rows: NotifRow[];
}> = {
  zh: {
    title: "通知能力",
    body: "这里只列出当前可用的通知入口：Agent 可用性异常进入站内 Inbox；运行完成、失败或取消可投递到已配置的 Webhook 或 Slack 目标。",
    available: "已支持",
    open: "打开",
    rows: [
      {
        label: "Agent 可用性告警",
        channels: ["站内 Inbox"],
        href: "/inbox",
        action: "查看告警",
      },
      {
        label: "运行终态投递",
        channels: ["Webhook", "Slack"],
        href: "/connect?tab=delivery",
        action: "管理投递目标",
      },
    ],
  },
  en: {
    title: "Notification Capabilities",
    body: "Only currently available notification paths are listed here. Agent availability issues appear in the Inbox; run completion, failure, and cancellation can be sent to configured Webhook or Slack targets.",
    available: "Available",
    open: "Open",
    rows: [
      {
        label: "Agent availability alerts",
        channels: ["In-app Inbox"],
        href: "/inbox",
        action: "View alerts",
      },
      {
        label: "Terminal run delivery",
        channels: ["Webhook", "Slack"],
        href: "/connect?tab=delivery",
        action: "Manage delivery targets",
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
              {row.channels.map((channel) => (
                <span key={channel} className="ol-chip ol-chip-green">
                  {channel} · {copy.available}
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
