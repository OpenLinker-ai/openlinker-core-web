"use client";

/**
 * 创作者中心：我的 Agent 横排 item-row 列表。
 *
 * 视觉来自 prototype/openlinker-flow-15-creator-hub.png：
 *   - panel + panel-head（"我的 Agent" + 右"X 个公开 · Y 个待处理"）
 *   - 每行 .ol-item-row：38px dash-icon + 名称/版本/状态 + 右侧 ir-side
 *   - 待处理行：黄色边框 + 渐变背景
 *
 * 数据策略：
 *   - 优先用 dashboard.agents（含 calls_this_month）
 *   - 与原 my-agents-card / agent-row 业务并存：编辑/下架仍走 agent-row（用 native confirm，
 *     避免在两处维护）。本组件不实现下架，把交互入口放到详情页 /agents/[slug]。
 *
 * 字段约束：visibility 决定公开范围，certification_status 仅表达认证进度。
 *
 * Phase 1 不展示真实收入金额。次数：toLocaleString() 千分位。
 */

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { avatarFromSlug } from "@/components/market/avatar";
import { SkillsDialog } from "@/components/creator/skills-dialog";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
} from "@/lib/i18n-labels";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import type { AgentStatsItem } from "@/components/agent/agent-stats-list";

interface Props {
  locale: Locale;
  /** dashboard 接口返回的本月统计数据（优先使用） */
  stats: AgentStatsItem[] | null;
  /** /api/v1/creator/agents 原始数据，用于补充 status / 版本号 / 显示待处理 */
  agents: AgentResponse[];
}

/** 把 lifetime calls 缩写成 31k / 1.2M */
function formatCalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

const VISIBILITY_LABEL: Record<string, Record<Locale, string>> = {
  public: { zh: "已公开", en: "Public" },
  unlisted: { zh: "链接可见", en: "Unlisted" },
  private: { zh: "私有", en: "Private" },
};
const CERTIFICATION_LABEL: Record<string, Record<Locale, string>> = {
  unreviewed: { zh: "未认证", en: "Unverified" },
  pending: { zh: "认证中", en: "Verification pending" },
  certified: { zh: "已认证", en: "Verified" },
  rejected: { zh: "认证未通过", en: "Verification rejected" },
};

function isAgentCallable(agent: {
  availability?: AgentResponse["availability"];
  readiness?: AgentResponse["readiness"];
}) {
  return agent.readiness?.callable ?? agent.availability?.status === "healthy";
}

function availabilityLabel(
  availability: AgentResponse["availability"] | undefined,
  callable: boolean,
  locale: Locale,
) {
  if (callable) return locale === "zh" ? "在线" : "Online";
  if (availability?.status === "degraded" || availability?.status === "unreachable") {
    return availabilityStatusLabel(availability.status, locale, availability.label);
  }
  return locale === "zh" ? "未在线" : "Not online";
}

type AgentCounts = {
  total: number;
  online: number;
  public: number;
  unlisted: number;
  private: number;
  pending: number;
};

function computeAgentCounts(
  rows: Array<{
    lifecycleStatus: AgentResponse["lifecycle_status"];
    visibility: AgentResponse["visibility"];
    certificationStatus: AgentResponse["certification_status"];
    availability?: AgentResponse["availability"];
    readiness?: AgentResponse["readiness"];
  }>,
): AgentCounts {
  // 单次遍历计算所有计数，避免多次 filter
  let online = 0, pub = 0, unlisted = 0, priv = 0, pending = 0;
  for (const row of rows) {
    if (row.certificationStatus === "pending") pending++;
    if (row.lifecycleStatus !== "active") continue;
    if (isAgentCallable(row)) online++;
    if (row.visibility === "public") pub++;
    else if (row.visibility === "unlisted") unlisted++;
    else if (row.visibility === "private") priv++;
  }
  return {
    total: rows.length,
    online,
    public: pub,
    unlisted,
    private: priv,
    pending,
  };
}

type AgentListRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  endpointUrl: string;
  tags: string[];
  lifecycleStatus: AgentResponse["lifecycle_status"];
  visibility: AgentResponse["visibility"];
  certificationStatus: AgentResponse["certification_status"];
  lifetimeCalls: number;
  callsThisMonth: number;
  createdAt: string;
  availability?: AgentResponse["availability"];
  readiness?: AgentResponse["readiness"];
};

type StatusFilter = "all" | "online" | "offline" | "degraded" | "disabled" | "review";
type VisibilityFilter = "all" | AgentResponse["visibility"];
type CertificationFilter = "all" | AgentResponse["certification_status"];
type SortKey = "calls_this_month" | "lifetime_calls" | "name" | "created_at";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const PAGE_SIZE_LABELS = Object.fromEntries(
  PAGE_SIZE_OPTIONS.map((size) => [String(size), String(size)]),
) as Record<string, string>;

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function rowSearchText(row: AgentListRow) {
  return [
    row.name,
    row.slug,
    row.description,
    row.endpointUrl,
    row.visibility,
    row.certificationStatus,
    row.availability?.status,
    row.tags.join(" "),
  ].join(" ").toLocaleLowerCase();
}

function createdAtTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function sortRows(rows: AgentListRow[], sortBy: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    if (sortBy === "created_at") {
      return createdAtTime(b.createdAt) - createdAtTime(a.createdAt);
    }
    if (sortBy === "lifetime_calls") {
      return b.lifetimeCalls - a.lifetimeCalls;
    }
    return b.callsThisMonth - a.callsThisMonth;
  });
}

export function AgentsList({ locale, stats, agents }: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [certificationFilter, setCertificationFilter] = useState<CertificationFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("calls_this_month");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const copy =
    locale === "zh"
      ? {
          title: "我的 Agent",
          noneYet: "还没接入",
          empty: "还没有接入 Agent。",
          publish: "立即接入 →",
          searchLabel: "搜索 Agent",
          searchPlaceholder: "搜索名称、slug、标签、端点或状态",
          filterStatus: "状态",
          filterVisibility: "可见性",
          filterCertification: "认证",
          sortBy: "排序",
          pageSize: "每页",
          clear: "清除",
          noMatch: "没有匹配的 Agent。",
          noMatchHint: "换个关键词或放宽筛选条件。",
          filteredSummary: (shown: number, matched: number, total: number) =>
            `显示 ${shown} / 匹配 ${matched} / 总数 ${total}`,
          pageLabel: (current: number, total: number) => `第 ${current} / ${total} 页`,
          previous: "上一页",
          next: "下一页",
          statusOptions: {
            all: "全部状态",
            online: "在线可调用",
            offline: "离线/不可用",
            degraded: "不稳定",
            disabled: "已下架",
            review: "认证中",
          } satisfies Record<StatusFilter, string>,
          visibilityOptions: {
            all: "全部可见性",
            public: "已公开",
            unlisted: "链接可见",
            private: "私有",
          } satisfies Record<VisibilityFilter, string>,
          certificationOptions: {
            all: "全部认证",
            unreviewed: "未认证",
            pending: "认证中",
            certified: "已认证",
            rejected: "认证未通过",
          } satisfies Record<CertificationFilter, string>,
          sortOptions: {
            calls_this_month: "本月调用",
            lifetime_calls: "累计调用",
            name: "名称 A-Z",
            created_at: "最新接入",
          } satisfies Record<SortKey, string>,
          summary: (counts: AgentCounts) =>
            `总数 ${counts.total} · 在线 ${counts.online} · 公开 ${counts.public} · 链接 ${counts.unlisted} · 私有 ${counts.private}${
              counts.pending > 0 ? ` · 认证中 ${counts.pending}` : ""
            }`,
        }
      : {
          title: "My Agents",
          noneYet: "No Agents yet",
          empty: "No Agents connected yet.",
          publish: "Connect now →",
          searchLabel: "Search Agents",
          searchPlaceholder: "Search name, slug, tags, endpoint, or status",
          filterStatus: "Status",
          filterVisibility: "Visibility",
          filterCertification: "Verification",
          sortBy: "Sort",
          pageSize: "Per page",
          clear: "Clear",
          noMatch: "No matching Agents.",
          noMatchHint: "Try a different keyword or loosen the filters.",
          filteredSummary: (shown: number, matched: number, total: number) =>
            `Showing ${shown} / matched ${matched} / total ${total}`,
          pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
          previous: "Previous page",
          next: "Next page",
          statusOptions: {
            all: "All status",
            online: "Online callable",
            offline: "Offline/unavailable",
            degraded: "Degraded",
            disabled: "Disabled",
            review: "In review",
          } satisfies Record<StatusFilter, string>,
          visibilityOptions: {
            all: "All visibility",
            public: "Public",
            unlisted: "Unlisted",
            private: "Private",
          } satisfies Record<VisibilityFilter, string>,
          certificationOptions: {
            all: "All verification",
            unreviewed: "Unverified",
            pending: "In review",
            certified: "Verified",
            rejected: "Rejected",
          } satisfies Record<CertificationFilter, string>,
          sortOptions: {
            calls_this_month: "Calls this month",
            lifetime_calls: "Total calls",
            name: "Name A-Z",
            created_at: "Newest",
          } satisfies Record<SortKey, string>,
          summary: (counts: AgentCounts) =>
            `Total ${counts.total} · Online ${counts.online} · Public ${counts.public} · Unlisted ${counts.unlisted} · Private ${counts.private}${
              counts.pending > 0 ? ` · Pending ${counts.pending}` : ""
            }`,
        };
  // 用 stats 为主，按 id 拼上 agents 里的 status
  // dashboard.agents 没传 status 时（旧版字段为 string），fallback 到 agents 表
  const agentById = useMemo(() => {
    const map = new Map<string, AgentResponse>();
    for (const agent of agents) {
      map.set(agent.id, agent);
    }
    return map;
  }, [agents]);

  // 没有本月数据时，全部从 agents 构造（每行无本月数字，只显示 "—"）
  const rows = useMemo<AgentListRow[]>(
    () =>
      stats && stats.length > 0
        ? stats.map((s) => {
            const agent = agentById.get(s.id);
            return {
              id: s.id,
              slug: s.slug,
              name: s.name,
              description: agent?.description ?? "",
              endpointUrl: agent?.endpoint_url ?? "",
              tags: agent?.tags ?? [],
              lifecycleStatus: agent?.lifecycle_status ?? "active",
              visibility: agent?.visibility ?? "public",
              certificationStatus: agent?.certification_status ?? "unreviewed",
              lifetimeCalls: s.lifetime_calls,
              callsThisMonth: s.calls_this_month,
              createdAt: agent?.created_at ?? agent?.approved_at ?? "",
              availability: agent?.availability,
              readiness: agent?.readiness,
            };
          })
        : agents.map((a) => ({
            id: a.id,
            slug: a.slug,
            name: a.name,
            description: a.description,
            endpointUrl: a.endpoint_url,
            tags: a.tags,
            lifecycleStatus: a.lifecycle_status,
            visibility: a.visibility,
            certificationStatus: a.certification_status,
            lifetimeCalls: a.total_calls,
            callsThisMonth: 0,
            createdAt: a.created_at ?? a.approved_at ?? "",
            availability: a.availability,
            readiness: a.readiness,
          })),
    [agentById, agents, stats],
  );

  const counts = useMemo(() => computeAgentCounts(rows), [rows]);
  const searchQuery = normalizeSearch(deferredQuery);
  const filteredRows = useMemo(() => {
    const matched = rows.filter((row) => {
      const active = row.lifecycleStatus === "active";
      const callable = active && isAgentCallable(row);
      if (searchQuery && !rowSearchText(row).includes(searchQuery)) {
        return false;
      }
      if (statusFilter === "online" && !callable) {
        return false;
      }
      if (
        statusFilter === "offline" &&
        (!active || callable || row.availability?.status === "degraded")
      ) {
        return false;
      }
      if (statusFilter === "degraded" && row.availability?.status !== "degraded") {
        return false;
      }
      if (statusFilter === "disabled" && row.lifecycleStatus !== "disabled") {
        return false;
      }
      if (statusFilter === "review" && row.certificationStatus !== "pending") {
        return false;
      }
      if (visibilityFilter !== "all" && row.visibility !== visibilityFilter) {
        return false;
      }
      if (certificationFilter !== "all" && row.certificationStatus !== certificationFilter) {
        return false;
      }
      return true;
    });
    return sortRows(matched, sortBy);
  }, [certificationFilter, rows, searchQuery, sortBy, statusFilter, visibilityFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    visibilityFilter !== "all" ||
    certificationFilter !== "all";
  const shownCount = pageRows.length;

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setVisibilityFilter("all");
    setCertificationFilter("all");
    resetPage();
  };

  if (rows.length === 0) {
    return (
      <div className="ol-panel">
        <div className="ol-panel-head">
          <strong>{copy.title}</strong>
          <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
            {copy.noneYet}
          </span>
        </div>
        <div className="px-5 py-10 text-center text-[13px] text-[color:var(--ol-muted)]">
          {copy.empty}
          <Link
            href="/publish"
            className="ml-2 font-bold text-[color:var(--ol-primary-dark)] underline"
          >
            {copy.publish}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ol-panel">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {copy.summary(counts)}
        </span>
      </div>
      <div className="border-b border-[color:var(--ol-line)] px-[18px] py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.9fr)_minmax(520px,1.1fr)] lg:items-end">
          <label className="block">
            <span className="sr-only">{copy.searchLabel}</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--ol-subtle)]"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPage();
                }}
                placeholder={copy.searchPlaceholder}
                className="h-11 w-full rounded-[14px] border border-[color:var(--ol-line)] bg-white pl-9 pr-10 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[rgba(15,145,135,0.12)]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    resetPage();
                  }}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)] hover:text-[color:var(--ol-primary-dark)]"
                  aria-label={copy.clear}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label={copy.filterStatus}
              value={statusFilter}
              options={copy.statusOptions}
              onChange={(value) => {
                setStatusFilter(value as StatusFilter);
                resetPage();
              }}
            />
            <FilterSelect
              label={copy.filterVisibility}
              value={visibilityFilter}
              options={copy.visibilityOptions}
              onChange={(value) => {
                setVisibilityFilter(value as VisibilityFilter);
                resetPage();
              }}
            />
            <FilterSelect
              label={copy.filterCertification}
              value={certificationFilter}
              options={copy.certificationOptions}
              onChange={(value) => {
                setCertificationFilter(value as CertificationFilter);
                resetPage();
              }}
            />
            <FilterSelect
              label={copy.sortBy}
              value={sortBy}
              options={copy.sortOptions}
              onChange={(value) => {
                setSortBy(value as SortKey);
                resetPage();
              }}
            />
            <FilterSelect
              label={copy.pageSize}
              value={String(pageSize)}
              options={PAGE_SIZE_LABELS}
              onChange={(value) => {
                setPageSize(Number(value));
                resetPage();
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          <span>{copy.filteredSummary(shownCount, filteredRows.length, rows.length)}</span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:bg-[color:var(--ol-soft)]"
            >
              <X className="size-3.5" aria-hidden="true" />
              {copy.clear}
            </button>
          ) : null}
        </div>
      </div>
      <div className="p-[18px]">
        {pageRows.length > 0 ? (
          pageRows.map((row) => (
            <AgentItemRow key={row.id} locale={locale} row={row} />
          ))
        ) : (
          <div className="rounded-[14px] border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-4 py-8 text-center">
            <div className="text-[14px] font-black text-[color:var(--ol-ink)]">{copy.noMatch}</div>
            <div className="mt-1 text-[12.5px] font-bold text-[color:var(--ol-muted)]">{copy.noMatchHint}</div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ol-line)] px-[18px] py-4">
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {copy.pageLabel(currentPage, totalPages)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
            className="ol-mini-btn gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={copy.previous}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {locale === "zh" ? "上一页" : "Prev"}
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage >= totalPages}
            className="ol-mini-btn gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={copy.next}
          >
            {locale === "zh" ? "下一页" : "Next"}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-extrabold text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[rgba(15,145,135,0.12)]"
      >
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgentItemRow({
  locale,
  row,
}: {
  locale: Locale;
  row: AgentListRow;
}) {
  const copy =
    locale === "zh"
      ? {
          totalCalls: "累计调用",
          disabled: "已下架",
          calls: "调用",
          month: "本月",
          records: "记录",
          freeAccess: "免费期",
          playgroundTitle: "打开这个 Agent 的 Playground，直接发起一次测试调用",
          playgroundUnavailable: "离线不可试用",
          skillTitle: "编辑该 Agent 声明的 skill（最多 5 个）",
          setup: "接入",
          setupTitle: "维护能力声明、示例和 dry-run 状态",
          settings: "设置",
          settingsTitle: "编辑基础信息、连接方式和可见性",
          runHistory: "调用记录",
          runHistoryTitle: "查看这个 Agent 被用户、访问令牌或 MCP 触发的调用记录",
          benchmarkTitle: "为已声明 Skill 运行测评，通过后详情页会显示已验证徽章",
          deliveryTitle: "管理通知投递目标与通知投递历史",
          delivery: "投递",
          progress: "查看进度",
          progressLabel: (name: string) => `查看 ${name} 进度`,
        }
      : {
          totalCalls: "total calls",
          disabled: "Disabled",
          calls: "calls",
          month: "this month",
          records: "records",
          freeAccess: "free access",
          playgroundTitle: "Open this Agent in Playground and run a test call",
          playgroundUnavailable: "Offline",
          skillTitle: "Edit this Agent's declared Skills, up to 5",
          setup: "Setup",
          setupTitle: "Maintain capability claims, examples, and dry-run status",
          settings: "Settings",
          settingsTitle: "Edit basic information, connection, and visibility",
          runHistory: "Run history",
          runHistoryTitle: "View calls triggered by users, access tokens, or MCP",
          benchmarkTitle: "Run benchmarks for declared Skills; passed ones show a Verified badge on the detail page",
          deliveryTitle: "Manage notification delivery targets and delivery history",
          delivery: "Delivery",
          progress: "View progress",
          progressLabel: (name: string) => `View ${name} progress`,
        };
  const avatar = avatarFromSlug(row.slug);
  const isPending = row.certificationStatus === "pending";
  const isActive = row.lifecycleStatus === "active";
  const isListed = isActive && row.visibility === "public";
  const callable = isActive && isAgentCallable(row);
  const availabilityText = availabilityLabel(row.availability, callable, locale);
  const [skillsOpen, setSkillsOpen] = useState(false);

  // 待处理行：黄色高亮（按 prompt 要求的样式 token）
  const yellowStyle: React.CSSProperties = isPending
    ? {
        borderColor: "rgba(200, 131, 13, 0.3)",
        background: "linear-gradient(90deg, #fff5df, #fff)",
      }
    : {};

  return (
    <div className="ol-item-row ol-agent-item-row" style={yellowStyle}>
      <div className="ol-dash-icon" style={{ background: avatar.color }}>
        {avatar.initials}
      </div>
      <div className="min-w-0 self-center">
        <h4 className="truncate">
          <Link
            href={row.visibility === "private" ? `/hub/agents/${row.slug}/onboarding` : `/agents/${row.slug}`}
            className="hover:text-[color:var(--ol-primary-dark)]"
          >
            {row.name}
          </Link>
        </h4>
        <p className="truncate">
          {isActive ? (
            <>
              {VISIBILITY_LABEL[row.visibility][locale]} · {availabilityText} · {CERTIFICATION_LABEL[row.certificationStatus][locale]} · {formatCalls(row.lifetimeCalls)} {copy.totalCalls}
            </>
          ) : isPending ? (
            <>{CERTIFICATION_LABEL[row.certificationStatus][locale]} · {VISIBILITY_LABEL[row.visibility][locale]}</>
          ) : (
            <>{copy.disabled}</>
          )}
        </p>
      </div>
      {isActive ? (
          <div className="ol-ir-side flex min-w-0 flex-col items-end gap-2">
            <div>
              <b>{formatCalls(row.callsThisMonth)} {copy.calls}</b>
              <span className="ml-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                {isListed ? copy.month : copy.records} · {copy.freeAccess}
              </span>
            </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            {callable ? (
              <Link
                href={`/playground/${row.slug}`}
                className="ol-mini-btn ol-mini-btn-primary gap-1.5"
                title={copy.playgroundTitle}
              >
                <PlayCircle className="size-3.5" aria-hidden="true" />
                Playground
              </Link>
            ) : (
              <span
                className="ol-mini-btn cursor-not-allowed gap-1.5 opacity-60"
                title={
                  row.availability
                    ? availabilityStatusHint(row.availability.status, locale, row.availability.hint)
                    : copy.playgroundUnavailable
                }
              >
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {copy.playgroundUnavailable}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSkillsOpen(true)}
              className="ol-mini-btn"
              title={copy.skillTitle}
            >
              Skill
            </button>
            <Link
              href={`/hub/agents/${row.slug}/settings`}
              className="ol-mini-btn gap-1.5"
              title={copy.settingsTitle}
            >
              <Settings className="size-3.5" aria-hidden="true" />
              {copy.settings}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/onboarding`}
              className="ol-mini-btn"
              title={copy.setupTitle}
            >
              {copy.setup}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/runs`}
              className="ol-mini-btn"
              title={copy.runHistoryTitle}
            >
              {copy.runHistory}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/benchmarks`}
              className="ol-mini-btn"
              title={copy.benchmarkTitle}
            >
              Benchmark
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/delivery`}
              className="ol-mini-btn"
              title={copy.deliveryTitle}
            >
              {copy.delivery}
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href={`/hub/agents/${row.slug}/onboarding`}
          className="ol-mini-btn"
          aria-label={copy.progressLabel(row.name)}
        >
          {copy.progress}
        </Link>
      )}
      {isActive && skillsOpen ? (
        <>
          {skillsOpen ? (
            <SkillsDialog
              agentId={row.id}
              agentSlug={row.slug}
              agentName={row.name}
              open={true}
              onClose={() => setSkillsOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
