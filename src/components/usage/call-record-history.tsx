import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { runCancelStateLabel, runDispatchStateLabel } from "@/lib/i18n-labels";
import {
  formatRuntimeTransportEvidenceTime,
  runtimeTransportLabel,
  runtimeTransportReasonLabel,
} from "@/lib/runtime-transport-evidence";

export type CallRecordView = "all" | "made" | "received";
export type CallRecordSort =
  | "started_desc"
  | "started_asc"
  | "amount_desc"
  | "amount_asc"
  | "duration_desc"
  | "duration_asc";
export type CallRecordStatusFilter = "" | "running" | "success" | "failed" | "timeout" | "canceled";
export type CallRecordSourceFilter = "" | "web" | "api" | "mcp" | "runtime" | "a2a";
export type CallRecordRelationFilter = "" | "direct" | "a2a_parent" | "a2a_child";

export interface CallRecordAgentRef {
  id: string;
  slug: string;
  name: string;
}

export interface CallRecordA2AContext {
  session_id?: string;
  call_id?: string;
  protocol_context_id?: string;
  protocol_task_id?: string;
  root_context_id?: string;
  parent_context_id?: string;
  parent_task_id?: string;
  trace_id?: string;
  reference_task_ids?: string[];
  source?: string;
}

export interface CallRecord {
  id: string;
  run_id: string;
  direction: "made" | "received" | "both" | string;
  relation: "direct" | "a2a_parent" | "a2a_child" | string;
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  target_agent: CallRecordAgentRef;
  caller_agent?: CallRecordAgentRef;
  status: string;
  cost_cents: number;
  creator_revenue_cents: number;
  duration_ms?: number;
  started_at: string;
  finished_at?: string;
  source?: string;
  runtime_contract_id: string;
  agent_connection_mode?: "direct_http" | "mcp_server" | "runtime" | string;
  runtime_transport?: "websocket" | "long_poll" | string;
  runtime_transport_reason?: string;
  runtime_transport_changed_at?: string;
  dispatch_state: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at?: string;
  latest_attempt_id?: string;
  active_attempt_id?: string;
  cancel_state?: string;
  cancel_requested_at?: string;
  cancel_acknowledged_at?: string;
  cancel_reason?: string;
  dead_lettered_at?: string;
  replay_of_run_id?: string;
  parent_run_id?: string;
  child_count: number;
  call_id: string;
  a2a_context?: CallRecordA2AContext;
}

interface Props {
  items: CallRecord[];
  total: number;
  page: number;
  size: number;
  view: CallRecordView;
  query?: string;
  sort: CallRecordSort;
  status?: CallRecordStatusFilter;
  source?: CallRecordSourceFilter;
  relation?: CallRecordRelationFilter;
  locale?: Locale;
  recordsPath: string;
  emptyHref: string;
  emptyActionLabel: string;
  sideColumnClassName: string;
  selectLabelClassName?: string;
  formatCost: (record: CallRecord, locale: Locale) => string;
  avatarFromSlug: (slug: string) => CallRecordAvatar;
}

export interface CallRecordAvatar {
  initials: string;
  color: string;
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

const SOURCE_BADGE: Record<string, { label: Record<Locale, string>; chip: string }> = {
  web: { label: { zh: "网页", en: "Web" }, chip: "ol-chip-green" },
  mcp: { label: { zh: "MCP", en: "MCP" }, chip: "ol-chip-blue" },
  api: { label: { zh: "API", en: "API" }, chip: "ol-chip-amber" },
  runtime: { label: { zh: "Runtime Worker", en: "Runtime Worker" }, chip: "ol-chip" },
  a2a: { label: { zh: "A2A", en: "A2A" }, chip: "ol-chip-blue" },
};

const CONNECTION_MODE_BADGE: Record<string, { label: Record<Locale, string>; chip: string }> = {
  direct_http: { label: { zh: "HTTP 直连", en: "Direct HTTP" }, chip: "ol-chip-green" },
  mcp_server: { label: { zh: "MCP Server", en: "MCP Server" }, chip: "ol-chip-blue" },
  runtime: { label: { zh: "Runtime 连接", en: "Runtime connection" }, chip: "ol-chip-amber" },
};

const RUNTIME_TRANSPORT_CHIP: Record<string, string> = {
  websocket: "ol-chip-green",
  long_poll: "ol-chip-blue",
};

const EXECUTION_EVIDENCE_COPY: Record<Locale, { evidence: string; missingTransport: string }> = {
  zh: { evidence: "实际连接方式", missingTransport: "暂无连接方式记录" },
  en: { evidence: "Actual connection used", missingTransport: "No connection details recorded" },
};

function formatRelative(iso: string, locale: Locale): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const min = Math.round((Date.now() - t) / 60_000);
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

function shortID(value?: string): string {
  if (!value) return "";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function idRows(record: CallRecord, locale: Locale): Array<{ label: string; value?: string; href?: string }> {
  const ctx = record.a2a_context;
  const attemptID = record.active_attempt_id || record.latest_attempt_id;
  return [
    {
      label: locale === "zh" ? "会话" : "Session",
      value: ctx?.session_id,
    },
    {
      label: locale === "zh" ? "协议上下文" : "Protocol context",
      value: ctx?.protocol_context_id,
    },
    {
      label: locale === "zh" ? "调用 ID" : "Call ID",
      value: record.call_id || ctx?.call_id || ctx?.protocol_task_id,
    },
    {
      label: "Run ID",
      value: record.run_id,
      href: `/run/${encodeURIComponent(record.run_id)}`,
    },
    {
      label: locale === "zh" ? "父 Run" : "Parent run",
      value: record.parent_run_id,
      href: record.parent_run_id ? `/run/${encodeURIComponent(record.parent_run_id)}` : undefined,
    },
    {
      label: locale === "zh" ? "原运行" : "Original run",
      value: record.replay_of_run_id,
      href: record.replay_of_run_id
        ? `/run/${encodeURIComponent(record.replay_of_run_id)}`
        : undefined,
    },
    {
      label: locale === "zh" ? "Runtime 协议版本" : "Runtime protocol version",
      value: record.runtime_contract_id,
    },
    {
      label: locale === "zh" ? "执行尝试" : "Attempt",
      value: attemptID,
    },
  ].filter((row) => Boolean(row.value));
}

function directionLabel(direction: string, locale: Locale): string {
  if (locale === "en") {
    if (direction === "made") return "Called by me";
    if (direction === "received") return "My agent was called";
    if (direction === "both") return "Own agent";
    return direction;
  }
  if (direction === "made") return "我调用的";
  if (direction === "received") return "我的 Agent 被调用";
  if (direction === "both") return "自己的 Agent";
  return direction;
}

function relationLabel(record: CallRecord, locale: Locale): string {
  if (locale === "en") {
    if (record.relation === "a2a_parent") return `Parent call · ${record.child_count} child`;
    if (record.relation === "a2a_child") return "Child call";
    return "Direct call";
  }
  if (record.relation === "a2a_parent") return `父调用 · ${record.child_count} 个子调用`;
  if (record.relation === "a2a_child") return "子调用";
  return "直接调用";
}

function recordsHref({
  recordsPath,
  view,
  page,
  query,
  sort,
  status,
  source,
  relation,
}: {
  recordsPath: string;
  view: CallRecordView;
  page?: number;
  query?: string;
  sort: CallRecordSort;
  status?: CallRecordStatusFilter;
  source?: CallRecordSourceFilter;
  relation?: CallRecordRelationFilter;
}): string {
  const params = new URLSearchParams({
    call_view: view,
    sort,
  });
  if (page && page > 1) params.set("page", String(page));
  if (query?.trim()) params.set("q", query.trim());
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  if (relation) params.set("relation", relation);
  return `${recordsPath}?${params.toString()}`;
}

function viewHref(
  recordsPath: string,
  view: CallRecordView,
  query: string | undefined,
  sort: CallRecordSort,
  status?: CallRecordStatusFilter,
  source?: CallRecordSourceFilter,
  relation?: CallRecordRelationFilter,
): string {
  return recordsHref({ recordsPath, view, query, sort, status, source, relation });
}

function pageHref(
  recordsPath: string,
  view: CallRecordView,
  page: number,
  query: string | undefined,
  sort: CallRecordSort,
  status?: CallRecordStatusFilter,
  source?: CallRecordSourceFilter,
  relation?: CallRecordRelationFilter,
): string {
  return recordsHref({ recordsPath, view, page, query, sort, status, source, relation });
}

export function CallRecordHistory({
  items,
  total,
  page,
  size,
  view,
  query,
  sort,
  status = "",
  source = "",
  relation = "",
  locale = "zh",
  recordsPath,
  emptyHref,
  emptyActionLabel,
  sideColumnClassName,
  selectLabelClassName,
  formatCost,
  avatarFromSlug,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const visibleSort = sort === "amount_desc" || sort === "amount_asc" ? "started_desc" : sort;
  const copy =
    locale === "zh"
      ? {
          title: "调用记录",
          total: `共 ${total} 条`,
          search: "搜索",
          searchPlaceholder: "Agent、状态、Run ID、Call ID、上下文 ID",
          sort: "排序",
          status: "状态",
          source: "来源",
          relation: "关系",
          apply: "应用",
          reset: "重置",
          empty: "还没有调用记录。",
          prev: "上一页",
          next: "下一页",
          page: `第 ${page} / ${totalPages} 页`,
          views: [
            ["all", "全部"],
            ["made", "我调用的"],
            ["received", "我的 Agent 被调用"],
          ] as Array<[CallRecordView, string]>,
          sorts: [
            ["started_desc", "最新优先"],
            ["started_asc", "最早优先"],
            ["duration_desc", "耗时从高到低"],
            ["duration_asc", "耗时从低到高"],
          ] as Array<[CallRecordSort, string]>,
          statuses: [
            ["", "全部状态"],
            ["running", "运行中"],
            ["success", "完成"],
            ["failed", "失败"],
            ["timeout", "超时"],
            ["canceled", "已取消"],
          ] as Array<[CallRecordStatusFilter, string]>,
          sources: [
            ["", "全部来源"],
            ["web", "Web"],
            ["api", "API"],
            ["mcp", "MCP"],
            ["runtime", "Runtime Worker"],
            ["a2a", "A2A"],
          ] as Array<[CallRecordSourceFilter, string]>,
          relations: [
            ["", "全部关系"],
            ["direct", "直接调用"],
            ["a2a_parent", "A2A 父调用"],
            ["a2a_child", "A2A 子调用"],
          ] as Array<[CallRecordRelationFilter, string]>,
        }
      : {
          title: "Call records",
          total: `${total} total`,
          search: "Search",
          searchPlaceholder: "Agent, status, Run ID, Call ID, context ID",
          sort: "Sort",
          status: "Status",
          source: "Source",
          relation: "Relation",
          apply: "Apply",
          reset: "Reset",
          empty: "No call records yet.",
          prev: "Previous",
          next: "Next",
          page: `Page ${page} / ${totalPages}`,
          views: [
            ["all", "All"],
            ["made", "Called by me"],
            ["received", "My agents"],
          ] as Array<[CallRecordView, string]>,
          sorts: [
            ["started_desc", "Newest first"],
            ["started_asc", "Oldest first"],
            ["duration_desc", "Duration high to low"],
            ["duration_asc", "Duration low to high"],
          ] as Array<[CallRecordSort, string]>,
          statuses: [
            ["", "All statuses"],
            ["running", "Running"],
            ["success", "Complete"],
            ["failed", "Failed"],
            ["timeout", "Timed out"],
            ["canceled", "Canceled"],
          ] as Array<[CallRecordStatusFilter, string]>,
          sources: [
            ["", "All sources"],
            ["web", "Web"],
            ["api", "API"],
            ["mcp", "MCP"],
            ["runtime", "Runtime Worker"],
            ["a2a", "A2A"],
          ] as Array<[CallRecordSourceFilter, string]>,
          relations: [
            ["", "All relations"],
            ["direct", "Direct"],
            ["a2a_parent", "A2A parent"],
            ["a2a_child", "A2A child"],
          ] as Array<[CallRecordRelationFilter, string]>,
        };

  return (
    <div className="ol-panel">
      <div className="ol-panel-head flex-wrap gap-3">
        <div className="min-w-0">
          <strong>{copy.title}</strong>
          <span className="ml-2 text-[12.5px] font-[900] text-[color:var(--ol-primary)]">
            {copy.total}
          </span>
        </div>
        <nav
          className="flex flex-wrap gap-1.5"
          aria-label={locale === "zh" ? "调用记录视图" : "Call record views"}
        >
          {copy.views.map(([key, label]) => (
            <Link
              key={key}
              href={viewHref(recordsPath, key, query, visibleSort, status, source, relation)}
              aria-current={key === view ? "page" : undefined}
              className={`rounded-[10px] border px-2.5 py-1 text-[12px] font-black ${
                key === view
                  ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] text-white"
                  : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-[14px]">
        <form
          action={recordsPath}
          method="get"
          className="mb-3 grid gap-2 rounded-[12px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_220px_auto_auto]"
        >
          <input type="hidden" name="call_view" value={view} />
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
              {copy.search}
            </span>
            <input
              name="q"
              defaultValue={query ?? ""}
              maxLength={200}
              placeholder={copy.searchPlaceholder}
              className="h-10 w-full rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
            />
          </label>
          <label className={selectLabelClassName}>
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
              {copy.status}
            </span>
            <select
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
            >
              {copy.statuses.map(([key, label]) => (
                <option key={key || "all"} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={selectLabelClassName}>
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
              {copy.source}
            </span>
            <select
              name="source"
              defaultValue={source}
              className="h-10 w-full rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
            >
              {copy.sources.map(([key, label]) => (
                <option key={key || "all"} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={selectLabelClassName}>
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
              {copy.relation}
            </span>
            <select
              name="relation"
              defaultValue={relation}
              className="h-10 w-full rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
            >
              {copy.relations.map(([key, label]) => (
                <option key={key || "all"} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={selectLabelClassName}>
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
              {copy.sort}
            </span>
            <select
              name="sort"
              defaultValue={visibleSort}
              className="h-10 w-full rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-ink)] outline-none focus:border-[color:var(--ol-primary)]"
            >
              {copy.sorts.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="self-end rounded-[10px] bg-[color:var(--ol-primary)] px-4 py-2 text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.apply}
          </button>
          <Link
            href={recordsPath}
            className="self-end rounded-[10px] border border-[color:var(--ol-line)] bg-white px-4 py-2 text-center text-[13px] font-black text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
          >
            {copy.reset}
          </Link>
        </form>

        {items.length === 0 ? (
          <div className="px-2 py-10 text-center text-[13px] text-[color:var(--ol-muted)]">
            {copy.empty}
            <Link
              href={emptyHref}
              className="ml-2 font-[900] text-[color:var(--ol-primary-dark)] underline"
            >
              {emptyActionLabel}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((record) => (
              <CallRecordRow
                key={`${record.run_id}-${record.direction}`}
                record={record}
                locale={locale}
                sideColumnClassName={sideColumnClassName}
                formatCost={formatCost}
                avatarFromSlug={avatarFromSlug}
              />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            className="mt-4 flex items-center justify-center gap-2 text-[12.5px]"
            aria-label={locale === "zh" ? "调用记录分页" : "Call records pagination"}
          >
            {page > 1 ? (
              <Link
                href={pageHref(
                  recordsPath,
                  view,
                  page - 1,
                  query,
                  visibleSort,
                  status,
                  source,
                  relation,
                )}
                className="rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 py-1.5 font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
              >
                {copy.prev}
              </Link>
            ) : null}
            <span className="font-bold text-[color:var(--ol-muted)]">{copy.page}</span>
            {page < totalPages ? (
              <Link
                href={pageHref(
                  recordsPath,
                  view,
                  page + 1,
                  query,
                  visibleSort,
                  status,
                  source,
                  relation,
                )}
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

export function CallRecordRow({
  record,
  locale,
  sideColumnClassName,
  formatCost,
  avatarFromSlug,
}: {
  record: CallRecord;
  locale: Locale;
  sideColumnClassName: string;
  formatCost: (record: CallRecord, locale: Locale) => string;
  avatarFromSlug: (slug: string) => CallRecordAvatar;
}) {
  const target = record.target_agent ?? {
    id: record.agent_id,
    slug: record.agent_slug,
    name: record.agent_name,
  };
  const avatar = avatarFromSlug(target.slug);
  const statusLabel = STATUS_LABEL[locale][record.status] ?? record.status;
  const progressLabel = record.cancel_state
    ? runCancelStateLabel(record.cancel_state, locale)
    : record.dispatch_state && record.dispatch_state !== "terminal"
      ? runDispatchStateLabel(record.dispatch_state, locale)
      : statusLabel;
  const sourceBadge = record.source ? SOURCE_BADGE[record.source] : undefined;
  const connectionModeBadge = record.agent_connection_mode
    ? CONNECTION_MODE_BADGE[record.agent_connection_mode]
    : undefined;
  const runtimeTransportChip = record.runtime_transport
    ? RUNTIME_TRANSPORT_CHIP[record.runtime_transport]
    : undefined;
  const runtimeTransport = runtimeTransportLabel(record.runtime_transport, locale);
  const evidenceCopy = EXECUTION_EVIDENCE_COPY[locale];
  const runtimeEvidence = [
    runtimeTransportReasonLabel(record.runtime_transport_reason, locale),
    formatRuntimeTransportEvidenceTime(record.runtime_transport_changed_at, locale),
  ].filter(Boolean);
  const rows = idRows(record, locale);
  const duration = record.duration_ms != null ? ` · ${record.duration_ms}ms` : "";
  const attemptSummary =
    record.max_attempts > 0 &&
    (record.attempt_count > 1 ||
      record.dispatch_state === "retry_wait" ||
      record.dispatch_state === "dead_letter")
      ? locale === "zh"
        ? ` · 尝试 ${record.attempt_count}/${record.max_attempts}`
        : ` · Attempt ${record.attempt_count}/${record.max_attempts}`
      : "";

  return (
    <div className="rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3">
      <div className={`grid gap-3 ${sideColumnClassName}`}>
        <div className="min-w-0">
          <div className="flex min-w-0 gap-3">
            <div className="ol-dash-icon shrink-0" style={{ background: avatar.color }}>
              {avatar.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Link
                  href={`/agents/${target.slug}`}
                  className="truncate text-[14px] font-black text-[color:var(--ol-ink)] hover:text-[color:var(--ol-primary-dark)]"
                >
                  {target.name || record.agent_name}
                </Link>
                <span className="ol-chip ol-chip-blue h-5 px-1.5 text-[10px]">
                  {directionLabel(record.direction, locale)}
                </span>
                <span className="ol-chip h-5 px-1.5 text-[10px]">
                  {relationLabel(record, locale)}
                </span>
                {sourceBadge ? (
                  <span className={`ol-chip h-5 px-1.5 text-[10px] ${sourceBadge.chip}`}>
                    {sourceBadge.label[locale]}
                  </span>
                ) : null}
                {record.agent_connection_mode ? (
                  <span className={`ol-chip h-5 px-1.5 text-[10px] ${connectionModeBadge?.chip ?? ""}`}>
                    {connectionModeBadge?.label[locale] ?? record.agent_connection_mode}
                  </span>
                ) : null}
                {record.agent_connection_mode === "runtime" ? (
                  <span className={`ol-chip h-5 px-1.5 text-[10px] ${runtimeTransportChip ?? ""}`}>
                    {runtimeTransport || evidenceCopy.missingTransport}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[12.5px] font-bold text-[color:var(--ol-muted)]">
                {progressLabel}
                {duration}
                {attemptSummary}
                {record.caller_agent
                  ? ` · ${locale === "zh" ? "父 Agent" : "Parent agent"}: ${record.caller_agent.name || record.caller_agent.slug}`
                  : ""}
              </p>
              {runtimeEvidence.length > 0 ? (
                <p className="mt-1 break-words text-[11.5px] font-bold text-[color:var(--ol-muted)]">
                  {evidenceCopy.evidence}: {runtimeEvidence.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <div
                  key={`${row.label}-${row.value}`}
                  className="min-w-0 rounded-[8px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-2 py-1.5"
                  title={row.value}
                >
                  <div className="text-[10.5px] font-black uppercase tracking-[0] text-[color:var(--ol-muted)]">
                    {row.label}
                  </div>
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="mt-0.5 block truncate font-mono text-[11.5px] font-bold text-[color:var(--ol-primary-dark)]"
                    >
                      {shortID(row.value)}
                    </Link>
                  ) : (
                    <div className="mt-0.5 truncate font-mono text-[11.5px] font-bold text-[color:var(--ol-ink)]">
                      {shortID(row.value)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-start justify-between gap-2 lg:items-end">
          <div className="lg:text-right">
            <b className="text-[13px] text-[color:var(--ol-ink)]">{formatCost(record, locale)}</b>
            <div className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
              {formatRelative(record.started_at, locale)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            <Link
              href={`/run/${encodeURIComponent(record.run_id)}`}
              className="ol-mini-btn"
            >
              {locale === "zh" ? "运行详情" : "Run details"}
            </Link>
            {record.relation !== "direct" ? (
              <Link
                href={`/a2a?run_id=${encodeURIComponent(record.parent_run_id || record.run_id)}`}
                className="ol-mini-btn"
              >
                A2A
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
