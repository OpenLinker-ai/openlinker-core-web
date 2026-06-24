"use client";

/**
 * Agent 回调投递历史表格。
 *
 * 由 Server Component（hub/agents/[id]/delivery/page.tsx）拉数据后传入。
 * 纯展示，不发起请求。
 *
 * 列：
 *   - 创建时间（相对，如 "2 分钟前"）
 *   - 状态徽章（pending 黄 / success 绿 / failed 红）
 *   - 响应码 / attempt_count
 *   - URL（截断 + title 全文）
 *   - run_id（链接到 /runs？暂纯展示）
 *   - 错误信息（failed 才显示）
 *   - 下次重试时间（pending 才显示）
 */

import type { WebhookDelivery } from "./webhook-delivery-types";
import type { Locale } from "@/lib/i18n";

interface Props {
  items: WebhookDelivery[];
  locale?: Locale;
}

const STATUS_BADGE: Record<Locale, Record<WebhookDelivery["status"], { label: string; className: string }>> = {
  zh: {
    pending: { label: "待重试", className: "bg-yellow-100 text-yellow-700" },
    success: { label: "成功", className: "bg-green-100 text-green-700" },
    failed: { label: "失败", className: "bg-red-100 text-red-700" },
  },
  en: {
    pending: { label: "Pending retry", className: "bg-yellow-100 text-yellow-700" },
    success: { label: "Success", className: "bg-green-100 text-green-700" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  },
};

function relativeTime(iso: string, locale: Locale): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffSec = (Date.now() - t) / 1000;
  if (locale === "en") {
    if (diffSec < 60) return `${Math.max(1, Math.floor(diffSec))} sec ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} days ago`;
    return new Date(t).toISOString().slice(0, 10);
  }
  if (diffSec < 60) return `${Math.max(1, Math.floor(diffSec))} 秒前`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} 天前`;
  return new Date(t).toISOString().slice(0, 10);
}

function truncate(s: string, max = 56): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function DeliveryTable({ items, locale = "zh" }: Props) {
  const copy =
    locale === "zh"
      ? {
          empty: "暂无投递记录。Agent 被调用并配置回调后，每次投递都会在这里留下一条记录。",
          time: "时间",
          status: "状态",
          response: "响应码",
          attempts: "尝试",
          detail: "详情",
          nextRetry: "下次重试",
        }
      : {
          empty: "No delivery records yet. After the Agent is called and a callback is configured, each delivery leaves a record here.",
          time: "Time",
          status: "Status",
          response: "Response",
          attempts: "Attempts",
          detail: "Details",
          nextRetry: "Next retry",
        };
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-10 text-center text-sm text-[color:var(--ol-muted)]">
        {copy.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--ol-line)] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-[color:var(--ol-soft)] text-[12px] font-bold text-[color:var(--ol-muted)]">
          <tr>
            <th className="px-4 py-3">{copy.time}</th>
            <th className="px-4 py-3">{copy.status}</th>
            <th className="px-4 py-3">{copy.response}</th>
            <th className="px-4 py-3">{copy.attempts}</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Run</th>
            <th className="px-4 py-3">{copy.detail}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--ol-line)]">
          {items.map((d) => {
            const badge = STATUS_BADGE[locale][d.status] ?? {
              label: d.status,
              className: "bg-gray-100 text-gray-700",
            };
            return (
              <tr key={d.id} className="align-top">
                <td
                  className="px-4 py-3 text-[12.5px] text-[color:var(--ol-muted)]"
                  title={d.created_at}
                >
                  {relativeTime(d.created_at, locale)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {d.response_status ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{d.attempt_count}</td>
                <td className="px-4 py-3 text-xs" title={d.url}>
                  <code className="break-all font-mono">{truncate(d.url)}</code>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--ol-muted)]">
                  {d.run_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {d.status === "pending" && d.next_retry_at ? (
                    <span
                      className="text-yellow-700"
                      title={d.next_retry_at}
                    >
                      {copy.nextRetry}: {relativeTime(d.next_retry_at, locale)}
                    </span>
                  ) : null}
                  {d.status === "failed" && d.error_message ? (
                    <span
                      className="text-red-700"
                      title={d.error_message}
                    >
                      {truncate(d.error_message, 80)}
                    </span>
                  ) : null}
                  {d.status === "success" ? (
                    <span className="text-[color:var(--ol-muted)]">—</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
