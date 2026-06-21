/**
 * Agent 市场列表页（Server Component）。
 *
 * 视觉来自 prototype/openlinker-flow-07-market.png：
 *   - <Topbar /> 顶部导航
 *   - <MarketHeader /> page-head（kicker + h1 + 副标题 + 右侧搜索）
 *   - .ol-market-layout 3 列：240px / 主区 / 315px
 *
 * URL state 是单一真相：tags / q / page 全部走 searchParams
 *   - 列表数据走公开接口 GET /api/v1/agents（不需要 JWT）
 *   - 后端 504/500 兜底为空数据
 *
 * Next 16 约定：searchParams 是 Promise，必须 await。
 *
 * 发布口径：
 *   - 排序由后端统一按可用性 + 创建时间返回，不展示未接 API 的排序 tab
 *   - 评分接口暂无 → 卡片只显示 total_calls，不杜撰数据
 */

import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { Topbar } from "@/components/layout/topbar";
import { MarketHeader } from "@/components/market/market-header";
import { SidebarFilters } from "@/components/market/sidebar-filters";
import { SidePromo } from "@/components/market/side-promo";
import { AgentCard } from "@/components/market/agent-card";
import { Pagination } from "@/components/market/pagination";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

interface MarketItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags: string[];
  total_calls: number;
  creator: { display_name: string };
  availability?: {
    status: "unknown" | "healthy" | "degraded" | "unreachable";
    label: string;
    hint: string;
    consecutive_failures: number;
  };
  readiness?: {
    callable: boolean;
    verified: boolean;
    certified: boolean;
  };
}

interface MarketResponse {
  items: MarketItem[];
  total: number;
  page: number;
  size: number;
}

interface MarketTaskItem {
  id: string;
  query: string;
  parsed_skill_refs?: { id: string; name: string }[];
  parsed_skills: string[];
  mcp_tools?: string[];
  mcp_tool_refs?: { name: string; description: string }[];
  recommended_agent_count: number;
  status: "open" | "matched" | "needs_agent";
}

interface TaskBoardResponse {
  items: MarketTaskItem[];
}

const PAGE_SIZE = 12;

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const tags = sp.tags?.split(",").filter(Boolean) ?? [];
  const q = sp.q ?? "";
  const rawPage = Number(sp.page ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const params = new URLSearchParams();
  if (tags.length) params.set("tags", tags.join(","));
  if (q) params.set("q", q);
  params.set("callable_only", "true");
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));

  let data: MarketResponse;
  let loadFailed = false;
  try {
    data = await apiFetch<MarketResponse>(`/api/v1/agents?${params}`);
  } catch {
    // 后端尚未上线 / 临时不可用 时降级为空数据，避免整个 RSC tree 抛错
    loadFailed = true;
    data = { items: [], total: 0, page, size: PAGE_SIZE };
  }

  let recentTasks: MarketTaskItem[] = [];
  try {
    const taskData = await apiFetch<TaskBoardResponse>("/api/v1/tasks/board?limit=3");
    recentTasks = taskData.items ?? [];
  } catch {
    recentTasks = [];
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.size));
  const copy =
    locale === "zh"
      ? {
          result: "推荐结果",
          count: "个",
          callableOnly: "仅展示可调用 · 健康状态优先",
          failed: "暂时无法连接市场数据，请检查后端服务或稍后刷新。",
          empty: "当前没有匹配的可调用 Agent。可以换一个关键词，或去创作者中心接入一个 runtime_pull Agent。",
        }
      : {
          result: "Results",
          count: "Agents",
          callableOnly: "Callable only · healthy status first",
          failed: "Market data is unavailable. Check the backend service or refresh later.",
          empty: "No matching callable Agents yet. Try another keyword or connect a runtime_pull Agent in Creator Hub.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <MarketHeader currentTags={tags} currentQ={q} locale={locale} />

        <div className="ol-market-layout">
          <SidebarFilters currentTags={tags} currentQ={q} total={data.total} locale={locale} />

          <section className="ol-panel">
            <div className="ol-panel-head">
              <strong>
                {locale === "zh"
                  ? `${copy.result} · 共 ${data.total.toLocaleString()} ${copy.count}`
                  : `${copy.result} · ${data.total.toLocaleString()} ${copy.count}`}
              </strong>
              <span className="rounded-full bg-[color:var(--ol-soft)] px-3 py-1 text-[12px] font-extrabold text-[color:var(--ol-muted)]">
                {copy.callableOnly}
              </span>
            </div>

            {data.items.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-[color:var(--ol-muted)]">
                {loadFailed ? copy.failed : copy.empty}
              </div>
            ) : (
              <div className="ol-agent-list">
                {data.items.map((item, idx) => (
                  <AgentCard
                    key={item.id}
                    agent={item}
                    active={page === 1 && idx === 0}
                    locale={locale}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="border-t border-[color:var(--ol-line)] py-3">
                <Pagination
                  currentPage={data.page}
                  totalPages={totalPages}
                  searchParams={{ tags: tags.join(","), q }}
                  locale={locale}
                />
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <RecentTasksCard tasks={recentTasks} locale={locale} />
            <SidePromo locale={locale} />
          </aside>
        </div>
      </main>
    </>
  );
}

function RecentTasksCard({ tasks, locale }: { tasks: MarketTaskItem[]; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "最近公开任务",
          all: "查看全部",
          empty: "还没有公开任务。你可以先发布一个任务，让 Agent 和创作者看到需求。",
          candidates: "个候选",
          find: "找 Agent",
          publish: "发布一个任务",
        }
      : {
          title: "Recent public tasks",
          all: "View all",
          empty: "No public tasks yet. Publish one so Agents and creators can see the need.",
          candidates: "candidates",
          find: "Find Agent",
          publish: "Publish a task",
        };
  return (
    <section className="ol-panel ol-panel-pad">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="ol-kicker">task board</div>
          <h2 className="mt-2 text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.title}
          </h2>
        </div>
        <Link
          href="/tasks"
          className="text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline"
        >
          {copy.all}
        </Link>
      </div>
      <div className="mt-4 grid gap-3">
        {tasks.length === 0 ? (
          <p className="rounded-[14px] bg-[color:var(--ol-soft)] p-3 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.empty}
          </p>
        ) : (
          tasks.map((task) => {
            const primarySkill =
              task.parsed_skill_refs?.[0]?.id ?? task.parsed_skills[0] ?? "";
            return (
              <article
                key={task.id}
                className="rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="ol-chip ol-chip-mint">
                    {taskStatusLabel(task.status, locale)}
                  </span>
                  <span className="ol-chip">
                    {locale === "zh"
                      ? `${task.recommended_agent_count} ${copy.candidates}`
                      : `${task.recommended_agent_count} ${copy.candidates}`}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-relaxed text-[color:var(--ol-ink)]">
                  {task.query}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(task.parsed_skill_refs ?? []).slice(0, 2).map((skill) => (
                      <span key={skill.id} className="ol-chip">
                        {skill.name}
                      </span>
                    ))}
                    {(task.mcp_tool_refs ?? []).slice(0, 2).map((tool) => (
                      <span
                        key={tool.name}
                        className="ol-chip ol-chip-blue"
                        title={tool.description}
                      >
                        {tool.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={
                      primarySkill
                        ? `/market?q=${encodeURIComponent(primarySkill)}`
                        : "/market"
                    }
                    className="text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline"
                  >
                    {copy.find}
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
      <Link
        href="/task"
        className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
      >
        {copy.publish}
      </Link>
    </section>
  );
}

function taskStatusLabel(status: MarketTaskItem["status"], locale: Locale) {
  if (locale === "en") {
    if (status === "matched") return "Matched";
    if (status === "needs_agent") return "Needs Agent";
    return "Open";
  }
  if (status === "matched") return "已选择";
  if (status === "needs_agent") return "待补 Agent";
  return "可接入";
}
