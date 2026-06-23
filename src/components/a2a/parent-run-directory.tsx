import Link from "next/link";

import type { Locale } from "@/lib/i18n";

export type A2ASkillRef = {
  id: string;
  name: string;
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
  active_runtime_token_count?: number;
  last_runtime_token_used_at?: string;
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
}: {
  locale: Locale;
  data: ParentRunListPayload;
  activeRunId?: string;
  failed?: boolean;
}) {
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? data.total : items.length;
  const page = Number.isFinite(data.page) && data.page > 0 ? data.page : 1;
  const size = Number.isFinite(data.size) && data.size > 0 ? data.size : 10;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const copy =
    locale === "zh"
      ? {
          title: "我的 Parent 调用链",
          total: (n: number) => `共 ${n} 条`,
          body: "每条 Parent 都是一次真实发起子 Agent 委派的运行。这里按你的运行记录自动生成，不需要再手动输入 parent_run_id。",
          loadFailed: "暂时无法加载 Parent 调用链。",
          empty: "还没有 Parent 调用链。运行会委派子调用的 Agent 后，这里会自动出现记录。",
          viewAgents: "查看我的 Agent",
          viewA2A: "查看 A2A 接入方式",
          parentAgent: "Parent Agent",
          childCalls: "子调用",
          success: "成功",
          running: "运行中",
          source: "入口",
          boundTokens: "绑定令牌",
          prev: "上一页",
          next: "下一页",
          page: (page: number, pages: number) => `第 ${page} / ${pages} 页`,
        }
      : {
          title: "My Parent Call Chains",
          total: (n: number) => `${n} total`,
          body: "Each Parent is a real run that delegated work to a Child Agent. This list is generated from your run history, so there is no manual parent_run_id entry.",
          loadFailed: "Unable to load Parent call chains.",
          empty: "No Parent call chains yet. They will appear after you run an Agent that delegates work.",
          viewAgents: "View My Agents",
          viewA2A: "View A2A Setup",
          parentAgent: "Parent Agent",
          childCalls: "Child calls",
          success: "Success",
          running: "Running",
          source: "Source",
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

      {failed ? (
        <p className="m-5 rounded-[8px] border border-[#e9c5c5] bg-[#fff5f5] p-4 text-[13px] font-semibold text-[#8f3030]">
          {copy.loadFailed}
        </p>
      ) : items.length === 0 ? (
        <div className="m-5 rounded-[12px] border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-8 text-center">
          <p className="text-[13px] font-bold text-[color:var(--ol-muted)]">
            {copy.empty}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/hub" className="ol-mini-btn">
              {copy.viewAgents}
            </Link>
            <Link href="/connect" className="ol-mini-btn">
              {copy.viewA2A}
            </Link>
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
                href={`/a2a?run_id=${encodeURIComponent(item.parent_run_id)}&parent_page=${page}`}
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
                <p className="mt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
                  {copy.childCalls} {item.child_count} · {copy.success} {item.successful_child_count} · {copy.running}{" "}
                  {item.running_child_count}
                </p>
                <p className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                  {copy.source} {sourceLabel(item.source)} · {copy.boundTokens}{" "}
                  {item.active_runtime_token_count ?? 0}
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
            <Link href={`/a2a?parent_page=${page - 1}`} className="ol-mini-btn">
              {copy.prev}
            </Link>
          ) : null}
          <span className="font-bold text-[color:var(--ol-muted)]">
            {copy.page(page, totalPages)}
          </span>
          {page < totalPages ? (
            <Link href={`/a2a?parent_page=${page + 1}`} className="ol-mini-btn">
              {copy.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}

function statusChip(status: string, locale: Locale): { tone: string; label: string } {
  const labels: Record<string, { zh: string; en: string }> = {
    success: { zh: "成功", en: "Success" },
    running: { zh: "运行中", en: "Running" },
    failed: { zh: "失败", en: "Failed" },
    timeout: { zh: "超时", en: "Timed out" },
    canceled: { zh: "已取消", en: "Canceled" },
  };
  if (status === "success") return { tone: "ol-chip ol-chip-green", label: labels.success[locale] };
  if (status === "running") return { tone: "ol-chip ol-chip-mint", label: labels.running[locale] };
  if (status === "failed") return { tone: "ol-chip ol-chip-amber", label: labels.failed[locale] };
  if (status === "timeout") return { tone: "ol-chip ol-chip-amber", label: labels.timeout[locale] };
  if (status === "canceled") return { tone: "ol-chip", label: labels.canceled[locale] };
  return { tone: "ol-chip ol-chip-mint", label: status };
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
