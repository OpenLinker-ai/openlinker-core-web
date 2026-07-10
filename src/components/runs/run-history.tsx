/**
 * 运行记录：最近运行 panel。
 *
 * 视觉沿用原运行记录原型：
 *   - panel + panel-head（"最近运行" + 右"查看全部"链接）
 *   - 每行 .ol-item-row：38px dash-icon (按 agent_slug 配色) + 名称/状态 + 右 ir-side（费用记录/时间）
 *
 * 数据由父 page.tsx 从 GET /api/v1/runs?page=&size= 拿到后传入，
 * URL searchParams 是单一真相，翻页通过 Link 改 URL 触发 RSC 重渲染，
 * 不在客户端拉数据。
 *
 * cost_cents 是兼容外部系统的费用记录；OpenLinker Core 不据此扣费。
 * 失败 run（status != "success"）不展示 "$0"，避免把兼容字段误解为 Core 账单。
 */

import Link from "next/link";

import { avatarFromSlug } from "@/components/market/avatar";
import type { Locale } from "@/lib/i18n";

export interface Run {
  id: string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  status: string;
  cost_cents: number;
  duration_ms?: number;
  started_at: string;
  source?: string;
}

interface Props {
  items: Run[];
  total: number;
  page: number;
  size: number;
  title?: string;
  emptyText?: string;
  emptyHref?: string;
  emptyActionLabel?: string;
  locale?: Locale;
}

const STATUS_LABEL: Record<Locale, Record<string, string>> = {
  zh: {
    running: "运行中",
    success: "完成",
    failed: "失败",
    timeout: "超时",
    canceled: "已取消",
  },
  en: {
    running: "Running",
    success: "Complete",
    failed: "Failed",
    timeout: "Timed out",
    canceled: "Canceled",
  },
};

// source 徽章：'web' 是默认 channel，不展示；'mcp' / 'api' 显示渠道，方便区分调用入口
const SOURCE_BADGE: Record<string, { label: string; chip: string }> = {
  mcp: { label: "MCP", chip: "ol-chip-blue" },
  api: { label: "API", chip: "ol-chip-amber" },
};

/** 把 ISO 时间转成"X 小时前 / 昨天 / N 天前 / yyyy-mm-dd"。 */
function formatRelative(iso: string, locale: Locale): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = now - t;
  const min = Math.round(diffMs / 60_000);
  if (locale === "en") {
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.round(hr / 24);
    if (day === 1) return "Yesterday";
    if (day < 7) return `${day} days ago`;
    return new Date(iso).toLocaleDateString("en-US");
  }
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.round(hr / 24);
  if (day === 1) return "昨天";
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

function formatCost(run: Run, locale: Locale): string {
  if (locale === "en") {
    if (run.cost_cents > 0) return `External cost record $${(run.cost_cents / 100).toFixed(2)}`;
    return "No external cost recorded";
  }
  if (run.cost_cents > 0) return `外部费用记录 $${(run.cost_cents / 100).toFixed(2)}`;
  return "未记录外部费用";
}

export function RunHistory({
  items,
  total,
  page,
  size,
  title = "最近运行",
  emptyText = "还没有调用记录。",
  emptyHref = "/registry",
  emptyActionLabel = "打开 Agent 库 →",
  locale = "zh",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const copy =
    locale === "zh"
      ? {
          title,
          emptyText,
          emptyActionLabel,
          total: `共 ${total} 条`,
          prev: "← 上一页",
          next: "下一页 →",
          page: `第 ${page} / ${totalPages} 页`,
        }
      : {
          title: title === "最近运行" ? "Recent Runs" : title,
          emptyText: emptyText === "还没有调用记录。" ? "No run records yet." : emptyText,
          emptyActionLabel: emptyActionLabel === "打开 Agent 库 →" ? "Open Registry ->" : emptyActionLabel,
          total: `${total} total`,
          prev: "← Previous",
          next: "Next →",
          page: `Page ${page} / ${totalPages}`,
        };

  return (
    <div className="ol-panel">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="text-[12.5px] font-[900] text-[color:var(--ol-primary)]">
          {copy.total}
        </span>
      </div>

      <div className="p-[14px]">
        {items.length === 0 ? (
          <div className="px-2 py-10 text-center text-[13px] text-[color:var(--ol-muted)]">
            {copy.emptyText}
            <Link
              href={emptyHref}
              className="ml-2 font-[900] text-[color:var(--ol-primary-dark)] underline"
            >
              {copy.emptyActionLabel}
            </Link>
          </div>
        ) : (
          items.map((run) => <RunItemRow key={run.id} run={run} locale={locale} />)
        )}

        {totalPages > 1 ? (
          <nav className="mt-3 flex items-center justify-center gap-2 text-[12.5px]">
            {page > 1 ? (
              <Link
                href={`?page=${page - 1}`}
                className="rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 py-1.5 font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.prev}
              </Link>
            ) : null}
            <span className="text-[color:var(--ol-muted)] font-bold">
              {copy.page}
            </span>
            {page < totalPages ? (
              <Link
                href={`?page=${page + 1}`}
                className="rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 py-1.5 font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function RunItemRow({ run, locale }: { run: Run; locale: Locale }) {
  const avatar = avatarFromSlug(run.agent_slug);
  const statusLabel = STATUS_LABEL[locale][run.status] ?? run.status;
  const subtitle =
    run.duration_ms != null
      ? `${run.agent_name} · ${statusLabel} · ${run.duration_ms}ms`
      : `${run.agent_name} · ${statusLabel}`;
  const sourceBadge = run.source ? SOURCE_BADGE[run.source] : undefined;

  return (
    <div className="ol-item-row">
      <div className="ol-dash-icon" style={{ background: avatar.color }}>
        {avatar.initials}
      </div>
      <div className="min-w-0">
        <h4 className="truncate">
          <Link
            href={`/agents/${run.agent_slug}`}
            className="hover:text-[color:var(--ol-primary-dark)]"
          >
            {run.agent_name}
          </Link>
          {sourceBadge ? (
            <span
              className={`ol-chip ml-2 h-5 px-1.5 text-[10px] ${sourceBadge.chip}`}
              title={locale === "zh" ? `本次调用来自 ${sourceBadge.label}` : `This run came from ${sourceBadge.label}`}
            >
              {sourceBadge.label}
            </span>
          ) : null}
        </h4>
        <p className="truncate">{subtitle}</p>
      </div>
      <div className="ol-ir-side flex flex-col items-end gap-1.5">
        <div>
          <b>{formatCost(run, locale)}</b>
          <span className="ml-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {formatRelative(run.started_at, locale)}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link
            href={`/run/${encodeURIComponent(run.id)}`}
            className="ol-mini-btn"
            title={locale === "zh" ? "查看本次运行的状态、输出和兼容费用记录" : "View status, output, and the external cost record for this run"}
          >
            {locale === "zh" ? "详情" : "Details"}
          </Link>
          <Link
            href={`/playground/${run.agent_slug}`}
            className="ol-mini-btn"
            title={locale === "zh" ? "跳到试用台重新发起一次" : "Open Playground and run again"}
          >
            {locale === "zh" ? "再试用" : "Try again"}
          </Link>
        </div>
      </div>
    </div>
  );
}
