/**
 * Agent Registry 列表页（Server Component）。
 *
 * 视觉沿用旧 Registry 原型：
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

import { apiFetch } from "@/lib/api";
import { Topbar } from "@/components/layout/topbar";
import { MarketHeader } from "@/components/market/market-header";
import { SidebarFilters } from "@/components/market/sidebar-filters";
import { SidePromo } from "@/components/market/side-promo";
import { AgentCard } from "@/components/market/agent-card";
import { Pagination } from "@/components/market/pagination";
import { getLocale } from "@/lib/i18n-server";

interface MarketItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags: string[];
  skills?: SkillMini[];
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

interface SkillMini {
  id: string;
  category: string;
  name: string;
  description: string;
}

const PAGE_SIZE = 12;

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string; q?: string; page?: string; callable_only?: string; skill?: string; skill_ids?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const tags = sp.tags?.split(",").filter(Boolean) ?? [];
  const skillIDs = parseSkillIDs(sp.skill, sp.skill_ids);
  const q = sp.q ?? "";
  const callableOnly = sp.callable_only !== "false";
  const rawPage = Number(sp.page ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const params = new URLSearchParams();
  if (tags.length) params.set("tags", tags.join(","));
  if (skillIDs.length) params.set("skill_ids", skillIDs.join(","));
  if (q) params.set("q", q);
  if (callableOnly) params.set("callable_only", "true");
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));

  let data: MarketResponse;
  let loadFailed = false;
  try {
    data = await apiFetch<MarketResponse>(`/api/v1/agents?${params}`);
  } catch {
    // 接口临时不可用时降级为空数据，避免整个 RSC tree 抛错。
    loadFailed = true;
    data = { items: [], total: 0, page, size: PAGE_SIZE };
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.size));
  const copy =
    locale === "zh"
      ? {
          result: (total: number) => `找到 ${total.toLocaleString()} 个 Agent`,
          listingScope: skillIDs.length
            ? `Skill 匹配 · ${skillIDs.join(", ")}`
            : callableOnly
              ? "仅显示可调用 · 近期状态优先"
              : "全部公开 Agent · 可调用优先",
          failed: "暂时无法加载 Agent。筛选条件仍会保留，请稍后重试。",
          empty: callableOnly
            ? "当前实例没有匹配的可调用 Agent。可以调整筛选条件，或前往 Agent 管理接入一个 Agent。"
            : "当前实例没有匹配的公开 Agent。可以调整筛选条件，或接入 Agent 后将其设为公开。",
        }
      : {
          result: (total: number) => `${total.toLocaleString()} ${total === 1 ? "Agent" : "Agents"} found`,
          listingScope: skillIDs.length
            ? `Skill match · ${skillIDs.join(", ")}`
            : callableOnly
              ? "Callable only · recent status first"
              : "All public Agents · callable first",
          failed: "Agents could not be loaded right now. Your filters are preserved; try again shortly.",
          empty: callableOnly
            ? "This instance has no matching callable Agents. Adjust the filters or connect an Agent from Agent Console."
            : "This instance has no matching public Agents. Adjust the filters, or connect an Agent and set its visibility to public.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <MarketHeader
          currentTags={tags}
          currentSkillIds={skillIDs}
          currentQ={q}
          callableOnly={callableOnly}
          locale={locale}
        />

        <div className="ol-market-layout">
          <SidebarFilters
            currentTags={tags}
            currentSkillIds={skillIDs}
            currentQ={q}
            currentCallableOnly={callableOnly}
            total={data.total}
            locale={locale}
          />

          <section className="ol-panel">
            <div className="ol-panel-head">
              <strong>
                {copy.result(data.total)}
              </strong>
              <span className="rounded-full bg-[color:var(--ol-soft)] px-3 py-1 text-[12px] font-extrabold text-[color:var(--ol-muted)]">
                {copy.listingScope}
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
                  searchParams={{
                    tags: tags.join(","),
                    skill_ids: skillIDs.join(","),
                    q,
                    callable_only: callableOnly ? undefined : "false",
                  }}
                  locale={locale}
                />
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <SidePromo locale={locale} />
          </aside>
        </div>
      </main>
    </>
  );
}

function parseSkillIDs(...values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    for (const part of (value ?? "").split(",")) {
      const skillID = part.trim();
      if (!skillID || seen.has(skillID)) continue;
      seen.add(skillID);
      out.push(skillID);
    }
  }
  return out.slice(0, 10);
}
