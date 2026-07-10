"use client";

/**
 * Agent 管理：我的 Agent 横排 item-row 列表。
 *
 * 视觉来自 prototype/openlinker-flow-15-creator-hub.png：
 *   - panel + panel-head（"我的 Agent" + 右"X 个公开 · Y 个待处理"）
 *   - 每行 .ol-item-row：38px dash-icon + 名称/版本/状态 + 右侧 ir-side
 *   - 待处理行：黄色边框 + 渐变背景
 *
 * 数据策略：
 *   - 由 /api/v1/creator/agents?limit&offset 提供当前页、总数和筛选计数。
 *   - 本组件只展示当前页并把搜索 / 筛选 / 翻页写进 URL，不再对全量数组做本地分页。
 *
 * 字段约束：visibility 决定公开范围，certification_status 仅表达认证进度。
 *
 * Core 不提供收入结算，因此不展示收入金额。次数使用本地化千分位。
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PlayCircle,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { avatarFromSlug } from "@/components/market/avatar";
import { SkillsDialog } from "@/components/creator/skills-dialog";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
} from "@/lib/i18n-labels";

import type { AgentResponse } from "@/components/agent/my-agents-card";

type StatusFilter = "all" | "online" | "offline" | "degraded" | "disabled" | "review";
type VisibilityFilter = "all" | AgentResponse["visibility"];
type CertificationFilter = "all" | AgentResponse["certification_status"];
type SortKey = "calls_this_month" | "lifetime_calls" | "name" | "created_at";

export type AgentCounts = {
  total: number;
  online: number;
  public: number;
  unlisted: number;
  private: number;
  pending: number;
};

export type AgentListPage = {
  items: AgentResponse[];
  total: number;
  limit: number;
  offset: number;
  counts: AgentCounts;
};

export type AgentListControls = {
  query: string;
  status: StatusFilter;
  visibility: VisibilityFilter;
  certification: CertificationFilter;
  sortBy: SortKey;
  pageSize: number;
  page: number;
};

interface Props {
  locale: Locale;
  agentPage: AgentListPage;
  controls: AgentListControls;
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
  unreviewed: { zh: "未提交实例认证", en: "Not instance-certified" },
  pending: { zh: "实例认证中", en: "Instance certification pending" },
  certified: { zh: "实例已认证", en: "Instance certified" },
  rejected: { zh: "实例认证未通过", en: "Instance certification rejected" },
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
  if (callable) return locale === "zh" ? "可调用" : "Callable";
  if (availability?.status === "degraded" || availability?.status === "unreachable") {
    return availabilityStatusLabel(availability.status, locale, availability.label);
  }
  return locale === "zh" ? "暂不可调用" : "Not callable";
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const PAGE_SIZE_LABELS = Object.fromEntries(
  PAGE_SIZE_OPTIONS.map((size) => [String(size), String(size)]),
) as Record<string, string>;

export function AgentsList({ locale, agentPage, controls }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(controls.query);

  const copy =
    locale === "zh"
      ? {
          title: "我的 Agent",
          noneYet: "尚未接入",
          empty: "还没有接入 Agent。",
          publish: "接入 Agent →",
          searchLabel: "搜索 Agent",
          searchPlaceholder: "搜索名称、slug、标签、端点或状态",
          filterStatus: "状态",
          filterVisibility: "可见性",
          filterCertification: "实例认证",
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
            online: "可调用",
            offline: "暂不可调用",
            degraded: "不稳定",
            disabled: "已停用",
            review: "实例认证中",
          } satisfies Record<StatusFilter, string>,
          visibilityOptions: {
            all: "全部可见性",
            public: "已公开",
            unlisted: "链接可见",
            private: "私有",
          } satisfies Record<VisibilityFilter, string>,
          certificationOptions: {
            all: "全部实例认证状态",
            unreviewed: "未提交实例认证",
            pending: "实例认证中",
            certified: "实例已认证",
            rejected: "实例认证未通过",
          } satisfies Record<CertificationFilter, string>,
          sortOptions: {
            calls_this_month: "本月调用",
            lifetime_calls: "累计调用",
            name: "名称 A-Z",
            created_at: "最新接入",
          } satisfies Record<SortKey, string>,
          summary: (counts: AgentCounts) =>
            `总数 ${counts.total} · 可调用 ${counts.online} · 公开 ${counts.public} · 链接 ${counts.unlisted} · 私有 ${counts.private}${
              counts.pending > 0 ? ` · 实例认证中 ${counts.pending}` : ""
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
          filterCertification: "Instance certification",
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
            online: "Callable",
            offline: "Not callable",
            degraded: "Degraded",
            disabled: "Disabled",
            review: "Instance certification pending",
          } satisfies Record<StatusFilter, string>,
          visibilityOptions: {
            all: "All visibility",
            public: "Public",
            unlisted: "Unlisted",
            private: "Private",
          } satisfies Record<VisibilityFilter, string>,
          certificationOptions: {
            all: "All instance certification",
            unreviewed: "Not instance-certified",
            pending: "Instance certification pending",
            certified: "Instance certified",
            rejected: "Instance certification rejected",
          } satisfies Record<CertificationFilter, string>,
          sortOptions: {
            calls_this_month: "Calls this month",
            lifetime_calls: "Total calls",
            name: "Name A-Z",
            created_at: "Newest",
          } satisfies Record<SortKey, string>,
          summary: (counts: AgentCounts) =>
            `Total ${counts.total} · Callable ${counts.online} · Public ${counts.public} · Unlisted ${counts.unlisted} · Private ${counts.private}${
              counts.pending > 0 ? ` · Instance certification pending ${counts.pending}` : ""
            }`,
        };

  const updateUrl = (updates: Partial<AgentListControls>) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = updates.query ?? query;
    const nextStatus = updates.status ?? controls.status;
    const nextVisibility = updates.visibility ?? controls.visibility;
    const nextCertification = updates.certification ?? controls.certification;
    const nextSortBy = updates.sortBy ?? controls.sortBy;
    const nextPageSize = updates.pageSize ?? controls.pageSize;
    const nextPage = updates.page ?? controls.page;

    setOptionalParam(params, "q", nextQuery.trim());
    setDefaultedParam(params, "status", nextStatus, "all");
    setDefaultedParam(params, "visibility", nextVisibility, "all");
    setDefaultedParam(params, "certification_status", nextCertification, "all");
    setDefaultedParam(params, "sort_by", nextSortBy, "created_at");
    setDefaultedParam(params, "limit", String(nextPageSize), "25");
    setDefaultedParam(params, "page", String(nextPage), "1");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    if (query === controls.query) {
      return;
    }
    const timer = window.setTimeout(() => {
      updateUrl({ query, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, controls.query]);

  const rows = useMemo<AgentListRow[]>(
    () =>
      agentPage.items.map((a) => ({
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
        callsThisMonth: a.calls_this_month ?? 0,
        createdAt: a.created_at ?? a.approved_at ?? "",
        availability: a.availability,
        readiness: a.readiness,
      })),
    [agentPage.items],
  );
  const counts = agentPage.counts;
  const totalPages = Math.max(1, Math.ceil(agentPage.total / Math.max(agentPage.limit, 1)));
  const currentPage = Math.min(controls.page, totalPages);
  const pageRows = rows;
  const hasActiveFilters =
    query.trim() !== "" ||
    controls.status !== "all" ||
    controls.visibility !== "all" ||
    controls.certification !== "all";
  const shownCount = pageRows.length;
  const loading = isPending || query !== controls.query;

  const clearFilters = () => {
    setQuery("");
    updateUrl({
      query: "",
      status: "all",
      visibility: "all",
      certification: "all",
      page: 1,
    });
  };

  if (counts.total === 0 && rows.length === 0 && !hasActiveFilters) {
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-11 w-full rounded-[14px] border border-[color:var(--ol-line)] bg-white pl-9 pr-10 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[rgba(15,145,135,0.12)]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    updateUrl({ query: "", page: 1 });
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
              value={controls.status}
              options={copy.statusOptions}
              onChange={(value) => updateUrl({ status: value as StatusFilter, page: 1 })}
            />
            <FilterSelect
              label={copy.filterVisibility}
              value={controls.visibility}
              options={copy.visibilityOptions}
              onChange={(value) => updateUrl({ visibility: value as VisibilityFilter, page: 1 })}
            />
            <FilterSelect
              label={copy.filterCertification}
              value={controls.certification}
              options={copy.certificationOptions}
              onChange={(value) => updateUrl({ certification: value as CertificationFilter, page: 1 })}
            />
            <FilterSelect
              label={copy.sortBy}
              value={controls.sortBy}
              options={copy.sortOptions}
              onChange={(value) => updateUrl({ sortBy: value as SortKey, page: 1 })}
            />
            <FilterSelect
              label={copy.pageSize}
              value={String(controls.pageSize)}
              options={PAGE_SIZE_LABELS}
              onChange={(value) => updateUrl({ pageSize: Number(value), page: 1 })}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          <span>{copy.filteredSummary(shownCount, agentPage.total, counts.total)}</span>
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
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-[color:var(--ol-primary-dark)]">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              {locale === "zh" ? "加载中" : "Loading"}
            </span>
          ) : null}
        </div>
      </div>
      <div className="relative p-[18px]">
        {loading ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <div className="grid size-11 place-items-center rounded-full border border-[color:var(--ol-line)] bg-white shadow-sm">
              <LoaderCircle className="size-5 animate-spin text-[color:var(--ol-primary-dark)]" aria-hidden="true" />
            </div>
          </div>
        ) : null}
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
            onClick={() => updateUrl({ page: Math.max(1, currentPage - 1) })}
            disabled={currentPage <= 1}
            className="ol-mini-btn gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={copy.previous}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            {locale === "zh" ? "上一页" : "Prev"}
          </button>
          <button
            type="button"
            onClick={() => updateUrl({ page: Math.min(totalPages, currentPage + 1) })}
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

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function setDefaultedParam(params: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (value && value !== defaultValue) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
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
          disabled: "已停用",
          calls: "调用",
          month: "本月",
          records: "记录",
          playgroundTitle: "在试用台中对这个 Agent 发起一次测试调用",
          playgroundUnavailable: "暂不可调用",
          skillTitle: "编辑该 Agent 声明的 skill（最多 5 个）",
          setup: "接入",
          setupTitle: "维护能力声明、示例和 dry-run 状态",
          settings: "设置",
          settingsTitle: "编辑基础信息、连接方式和可见性",
          runHistory: "调用记录",
          runHistoryTitle: "查看这个 Agent 被用户、访问凭证或 MCP 触发的调用记录",
          benchmarkTitle: "为已声明 Skill 运行能力测评；通过后详情页会显示测评已通过",
          deliveryTitle: "管理通知投递目标与通知投递历史",
          delivery: "投递",
          progress: "查看进度",
          progressLabel: (name: string) => `查看 ${name} 进度`,
        }
      : {
          totalCalls: "total invocations",
          disabled: "Disabled",
          calls: "invocations",
          month: "this month",
          records: "records",
          playgroundTitle: "Open this Agent in Playground and invoke it once for testing",
          playgroundUnavailable: "Not callable",
          skillTitle: "Edit this Agent's declared Skills, up to 5",
          setup: "Setup",
          setupTitle: "Maintain capability claims, examples, and dry-run status",
          settings: "Settings",
          settingsTitle: "Edit basic information, connection, and visibility",
          runHistory: "Run history",
          runHistoryTitle: "View invocations triggered by users, access credentials, or MCP",
          benchmarkTitle: "Run Benchmarks for declared Skills; passed ones show a Benchmark verified badge on the detail page",
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

  // 待处理行使用黄色高亮，与其他状态拉开视觉层级。
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
                {isListed ? copy.month : copy.records}
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
                {locale === "zh" ? "试用台" : "Playground"}
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
              {locale === "zh" ? "能力测评" : "Benchmark"}
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
