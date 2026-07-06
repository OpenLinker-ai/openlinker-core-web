import Link from "next/link";

import { a2aSessionLabel } from "@/lib/a2a-session.mjs";
import type { Locale } from "@/lib/i18n";
import { runStatusLabel } from "@/lib/i18n-labels";

export type A2ASkillRef = {
  id: string;
  name: string;
};

export type A2AContextRef = {
  protocol_context_id?: string;
  protocolContextId?: string;
  protocol_task_id?: string;
  root_context_id?: string;
  rootContextId?: string;
  parent_context_id?: string;
  parent_task_id?: string;
  context_id?: string;
  contextId?: string;
  trace_id?: string;
  traceId?: string;
  reference_task_ids?: string[];
  source?: string;
};

export type ParentRunSummary = {
  parent_run_id: string;
  caller_agent_id: string;
  caller_agent_slug: string;
  caller_agent_name: string;
  caller_agent_tags?: string[];
  caller_skills?: A2ASkillRef[];
  source?: string;
  status: string;
  duration_ms?: number;
  started_at: string;
  child_count: number;
  successful_child_count: number;
  running_child_count: number;
  active_agent_token_count?: number;
  last_agent_token_used_at?: string;
  a2a_context?: A2AContextRef;
};

export type ParentRunListPayload = {
  items: ParentRunSummary[];
  total: number;
  page: number;
  size: number;
};

export function ParentRunDirectory({
  locale,
  data,
  activeRunId,
  failed = false,
  query = "",
}: {
  locale: Locale;
  data: ParentRunListPayload;
  activeRunId?: string;
  failed?: boolean;
  query?: string;
}) {
  const cleanQuery = query.trim();
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? data.total : items.length;
  const page = Number.isFinite(data.page) && data.page > 0 ? data.page : 1;
  const size = Number.isFinite(data.size) && data.size > 0 ? data.size : 10;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const copy =
    locale === "zh"
      ? {
          title: "我的父调用链",
          total: (n: number) => `共 ${n} 条`,
          body: "每条父调用链都来自一次真实的子 Agent 委派运行。这里按你的运行记录自动生成，不需要再手动输入 parent_run_id。",
          searchLabel: "搜索 Agent 或 run_id",
          searchPlaceholder: "输入 Agent 名称、slug、Skill、tag 或 run_id",
          searchAction: "搜索",
          clearSearch: "清除",
          loadFailed: "暂时无法加载父调用链。",
          empty: "还没有父调用链。运行会委派任务的 Agent 后，这里会自动出现记录。",
          searchEmpty: (q: string) => `没有找到与「${q}」相关的调用链。`,
          viewAgents: "查看我的 Agent",
          viewA2A: "查看 A2A 接入方式",
          parentAgent: "父 Agent",
          childCalls: "子调用",
          success: "成功",
          running: "运行中",
          source: "入口",
          context: "上下文",
          boundTokens: "绑定令牌",
          prev: "上一页",
          next: "下一页",
          page: (page: number, pages: number) => `第 ${page} / ${pages} 页`,
        }
      : {
          title: "My Parent Call Chains",
          total: (n: number) => `${n} total`,
          body: "Each parent call chain comes from a real run that delegated work to a child Agent. This list is generated from your run history, so there is no manual parent_run_id entry.",
          searchLabel: "Search Agent or run_id",
          searchPlaceholder: "Agent name, slug, Skill, tag, or run_id",
          searchAction: "Search",
          clearSearch: "Clear",
          loadFailed: "Unable to load Parent call chains.",
          empty: "No Parent call chains yet. They will appear after you run an Agent that delegates work.",
          searchEmpty: (q: string) => `No call chains matched "${q}".`,
          viewAgents: "View My Agents",
          viewA2A: "View A2A Setup",
          parentAgent: "Parent Agent",
          childCalls: "Child calls",
          success: "Success",
          running: "Running",
          source: "Source",
          context: "Context",
          boundTokens: "Bound tokens",
          prev: "Previous",
          next: "Next",
          page: (page: number, pages: number) => `Page ${page} / ${pages}`,
        };

  return (
    <section className="ol-panel mb-5 overflow-hidden">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="text-[12.5px] font-black text-[color:var(--ol-primary-dark)]">
          {copy.total(total)}
        </span>
      </div>
      <p className="border-b border-[color:var(--ol-line)] px-5 py-4 text-[13px] leading-6 text-[color:var(--ol-muted)]">
        {copy.body}
      </p>
      <form action="/a2a" className="border-b border-[color:var(--ol-line)] bg-white/70 p-5">
        <label
          htmlFor="a2a-parent-search"
          className="text-[11px] font-black uppercase tracking-[0.05em] text-[color:var(--ol-subtle)]"
        >
          {copy.searchLabel}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="a2a-parent-search"
            name="q"
            defaultValue={cleanQuery}
            placeholder={copy.searchPlaceholder}
            className="h-10 min-w-0 flex-1 rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 font-mono text-[13px] outline-none focus:border-[color:var(--ol-primary)]"
          />
          <button type="submit" className="ol-btn h-10 justify-center">
            {copy.searchAction}
          </button>
          {cleanQuery ? (
            <Link href="/a2a" className="ol-mini-btn h-10 justify-center">
              {copy.clearSearch}
            </Link>
          ) : null}
        </div>
      </form>

      {failed ? (
        <p className="m-5 rounded-[8px] border border-[#e9c5c5] bg-[#fff5f5] p-4 text-[13px] font-semibold text-[#8f3030]">
          {copy.loadFailed}
        </p>
      ) : items.length === 0 ? (
        <div className="m-5 rounded-[12px] border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-8 text-center">
          <p className="text-[13px] font-bold text-[color:var(--ol-muted)]">
            {cleanQuery ? copy.searchEmpty(cleanQuery) : copy.empty}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {cleanQuery ? (
              <Link href="/a2a" className="ol-mini-btn">
                {copy.clearSearch}
              </Link>
            ) : (
              <>
                <Link href="/hub" className="ol-mini-btn">
                  {copy.viewAgents}
                </Link>
                <Link href="/connect" className="ol-mini-btn">
                  {copy.viewA2A}
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {items.map((item) => {
            const selected = item.parent_run_id === activeRunId;
            const chip = statusChip(item.status, locale);
            return (
              <Link
                key={item.parent_run_id}
                href={a2aHref({ runId: item.parent_run_id, page, query: cleanQuery })}
                className={`rounded-[12px] border p-4 transition ${
                  selected
                    ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)]"
                    : "border-[color:var(--ol-line)] bg-white hover:border-[color:var(--ol-primary)]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.05em] text-[color:var(--ol-subtle)]">
                      {copy.parentAgent}
                    </p>
                    <h2 className="truncate text-[14px] font-black text-[color:var(--ol-ink)]">
                      {item.caller_agent_name}
                    </h2>
                    <p className="truncate font-mono text-[11px] text-[color:var(--ol-muted)]">
                      {item.caller_agent_slug}
                    </p>
                  </div>
                  <span className={chip.tone}>{chip.label}</span>
                </div>
                <code className="mt-3 block truncate rounded-[7px] bg-[color:var(--ol-soft)] px-2 py-1.5 text-[11px] text-[color:var(--ol-muted)]">
                  {item.parent_run_id}
                </code>
                {a2aSessionLabel(item.a2a_context) ? (
                  <code className="mt-2 block truncate rounded-[7px] bg-white px-2 py-1.5 text-[11px] text-[color:var(--ol-primary-dark)]">
                    {copy.context} {a2aSessionLabel(item.a2a_context)}
                  </code>
                ) : null}
                <p className="mt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
                  {copy.childCalls} {item.child_count} · {copy.success} {item.successful_child_count} · {copy.running}{" "}
                  {item.running_child_count}
                </p>
                <p className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                  {copy.source} {sourceLabel(item.source)} · {copy.boundTokens}{" "}
                  {item.active_agent_token_count ?? 0}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(item.caller_skills ?? []).slice(0, 3).map((skill) => (
                    <span key={skill.id} className="ol-chip ol-chip-blue">
                      {skill.name}
                    </span>
                  ))}
                  {(item.caller_skills ?? []).length === 0
                    ? (item.caller_agent_tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="ol-chip ol-chip-mint">
                          {tag}
                        </span>
                      ))
                    : null}
                </div>
                <p className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                  {formatDate(item.started_at, locale)} · {fmtMs(item.duration_ms, locale)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {!failed && totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 border-t border-[color:var(--ol-line)] p-4 text-[12.5px]">
          {page > 1 ? (
            <Link href={a2aHref({ page: page - 1, query: cleanQuery })} className="ol-mini-btn">
              {copy.prev}
            </Link>
          ) : null}
          <span className="font-bold text-[color:var(--ol-muted)]">
            {copy.page(page, totalPages)}
          </span>
          {page < totalPages ? (
            <Link href={a2aHref({ page: page + 1, query: cleanQuery })} className="ol-mini-btn">
              {copy.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}

function a2aHref({ runId, page, query }: { runId?: string; page?: number; query?: string }): string {
  const params = new URLSearchParams();
  if (runId) params.set("run_id", runId);
  if (page && page > 1) params.set("parent_page", String(page));
  if (query) params.set("q", query);
  const encoded = params.toString();
  return encoded ? `/a2a?${encoded}` : "/a2a";
}

function statusChip(status: string, locale: Locale): { tone: string; label: string } {
  if (status === "success") return { tone: "ol-chip ol-chip-green", label: runStatusLabel(status, locale) };
  if (status === "running") return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
  if (status === "failed" || status === "timeout") return { tone: "ol-chip ol-chip-amber", label: runStatusLabel(status, locale) };
  if (status === "canceled") return { tone: "ol-chip", label: runStatusLabel(status, locale) };
  return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
}

function sourceLabel(source?: string): string {
  if (source === "mcp") return "MCP";
  if (source === "api") return "API";
  return "Web";
}

function fmtMs(ms: number | undefined, locale: Locale): string {
  if (ms == null) return locale === "zh" ? "进行中" : "Running";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
