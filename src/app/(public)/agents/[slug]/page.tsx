/**
 * Agent 详情页（Server Component）。
 *
 * 视觉对照原型 prototype/openlinker-flow-08-agent-detail.png：
 *   - Topbar
 *   - 面包屑：首页 / 市场 / [Agent 名]
 *   - 3 列 detail-layout：hero(330) / 主区(自适应) / action(320)
 *
 * 数据：GET /api/v1/agents/:slug（公开接口，不需 auth）
 *   - 404 → notFound()
 *   - 其他错误 → 抛出给 error.tsx 兜底
 *
 * Phase 1 简化（详见 task spec）：
 *   - 评价系统未上线；可用性来自真实运行记录
 *   - Skill 清单可由后端返回，无则降级为「功能介绍 + tag list」
 *   - 用户评价用空状态
 *   - 工作流入口跳到已上线编排页；部署租用属于后续计划能力
 *
 * Next 16 约定：params 是 Promise，必须 await。
 */

import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionPanel } from "@/components/agent/action-panel";
import { AgentHero } from "@/components/agent/agent-hero";
import { ReviewEmpty } from "@/components/agent/review-empty";
import { Topbar } from "@/components/layout/topbar";
import { ApiError, apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
  availabilityStatusSummary,
} from "@/lib/i18n-labels";
import { getLocale } from "@/lib/i18n-server";

interface AgentDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  endpoint_url: string;
  price_per_call_cents: number;
  tags: string[];
  total_calls: number;
  certification_status?: "unreviewed" | "pending" | "certified" | "rejected";
  availability?: {
    status: "unknown" | "healthy" | "degraded" | "unreachable";
    label?: string;
    hint?: string;
    last_successful_run_at?: string;
    last_failed_run_at?: string;
    last_checked_at?: string;
    consecutive_failures: number;
  };
  readiness?: {
    listed: boolean;
    discoverable: boolean;
    callable: boolean;
    verified: boolean;
    certified: boolean;
    paid_enabled: boolean;
  };
  creator: { display_name: string; creator_verified?: boolean };
  created_at: string;
  approved_at?: string;
  /** 后端 sibling A 在补：详情可能携带 Skill 列表，无则降级。 */
  skills?: { id: string; category?: string; name: string; description?: string }[];
  capability?: {
    id: string;
    agent_id: string;
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
    summary: string;
    version: number;
    published_at: string;
    updated_at: string;
  };
  examples?: {
    id: string;
    agent_id: string;
    title: string;
    input_json: Record<string, unknown>;
    expected_output_json?: Record<string, unknown>;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }[];
}

type SkillBenchmarkStatus = "verified" | "pending" | "failed" | "not_run";

interface SkillScoreItem {
  skill_id: string;
  skill_name?: string;
  status: SkillBenchmarkStatus;
  average_score?: number;
  pass_count: number;
  total_count: number;
  verified_at?: string;
  updated_at: string;
}

async function fetchAgent(slug: string): Promise<AgentDetail> {
  return apiFetch<AgentDetail>(
    `/api/v1/agents/${encodeURIComponent(slug)}`,
  );
}

async function fetchSkillScores(slug: string): Promise<SkillScoreItem[]> {
  try {
    const res = await apiFetch<{ items: SkillScoreItem[] }>(
      `/api/v1/agents/${encodeURIComponent(slug)}/skill-scores`,
    );
    return res.items ?? [];
  } catch {
    return [];
  }
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          market: "市场",
          currentFree: "当前免费调用",
          price: (price: string) => `$${price} / 次（展示价格预留，当前免费）`,
          unknownLabel: "未验证",
          unknownHint: "Agent 还没有真实运行记录。",
          intro: "功能介绍",
          tagCount: (n: number) => `共 ${n} 个标签`,
          scope: "权限范围",
          scopeValue: "只读上下文 · 沙箱执行",
          pricing: "价格状态",
          availability: "可用性",
          integration: "集成方式",
          availabilityHint: "可用性提示",
          checked: "最近检查：",
          failures: (n: number) => ` · 连续失败 ${n} 次`,
          examples: "调用示例",
          exampleCount: (n: number) => `${n} 条`,
          tryExample: "用此示例试用",
          viewOnlyTitle: "该 Agent 当前不可调用，示例仅供查看。",
          viewOnly: "示例仅供查看",
          unavailableKicker: "agent detail unavailable",
          unavailableTitle: "Agent 详情暂时不可用",
          unavailableLead:
            "当前数据源暂时无法访问。页面外壳和导航保持可用，你可以稍后重试或回到市场继续浏览。",
          retryHint: "不可用的 Agent 标识",
          backToMarket: "回到市场",
        }
      : {
          home: "Home",
          market: "Market",
          currentFree: "Free access now",
          price: (price: string) => `$${price} / run (display price reserved; current runs are free)`,
          unknownLabel: "Unverified",
          unknownHint: "This Agent does not have real run evidence yet.",
          intro: "Overview",
          tagCount: (n: number) => `${n} tags`,
          scope: "Permission scope",
          scopeValue: "Read-only context · sandbox execution",
          pricing: "Price status",
          availability: "Availability",
          integration: "Integration",
          availabilityHint: "Availability Note",
          checked: "Last checked: ",
          failures: (n: number) => ` · ${n} consecutive failures`,
          examples: "Examples",
          exampleCount: (n: number) => `${n} items`,
          tryExample: "Try this example",
          viewOnlyTitle: "This Agent is not callable right now. The example is view-only.",
          viewOnly: "View-only example",
          unavailableKicker: "agent detail unavailable",
          unavailableTitle: "Agent detail is temporarily unavailable",
          unavailableLead:
            "The data source is not reachable right now. The page shell and navigation remain available; try again later or return to Market.",
          retryHint: "Unavailable Agent slug",
          backToMarket: "Back to Market",
        };

  let agent: AgentDetail;
  try {
    agent = await fetchAgent(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <>
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-6 py-6">
          <nav className="flex items-center gap-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
            <Link href="/" className="hover:text-[color:var(--ol-ink)]">
              {copy.home}
            </Link>
            <span className="text-[color:var(--ol-subtle)]">/</span>
            <Link href="/market" className="hover:text-[color:var(--ol-ink)]">
              {copy.market}
            </Link>
            <span className="text-[color:var(--ol-subtle)]">/</span>
            <span className="text-[color:var(--ol-ink)]">{slug}</span>
          </nav>

          <div className="ol-page-head mt-6">
            <div className="ol-page-title">
              <div className="ol-kicker">{copy.unavailableKicker}</div>
              <h1>{copy.unavailableTitle}</h1>
              <p>{copy.unavailableLead}</p>
            </div>
          </div>

          <section className="ol-panel ol-panel-pad mt-6">
            <div className="ol-kicker">{copy.retryHint}</div>
            <p className="mt-2 break-all text-[14px] font-bold text-[color:var(--ol-ink)]">
              {slug}
            </p>
            <Link href="/market" className="ol-mini-btn ol-mini-btn-primary mt-5">
              {copy.backToMarket}
            </Link>
          </section>
        </main>
      </>
    );
  }

  const scores = await fetchSkillScores(slug);
  const scoreBySkill = new Map(scores.map((s) => [s.skill_id, s]));
  const skillsWithStatus = (agent.skills ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: (scoreBySkill.get(s.id)?.status ?? "not_run") as SkillBenchmarkStatus,
  }));

  const priceUSD = (agent.price_per_call_cents / 100).toFixed(3);
  const billingDescription =
    agent.price_per_call_cents > 0
      ? copy.price(priceUSD)
      : copy.currentFree;
  const availability = agent.availability ?? {
    status: "unknown" as const,
    label: copy.unknownLabel,
    hint: copy.unknownHint,
    consecutive_failures: 0,
  };
  const availabilityLabel = availabilityStatusLabel(availability.status, locale, availability.label);
  const availabilityHintText = availabilityStatusHint(availability.status, locale, availability.hint);
  const callable = agent.readiness?.callable ?? availability.status === "healthy";

  return (
    <>
      <Topbar />

      <main className="mx-auto min-w-0 w-full max-w-7xl px-6 py-6">
        {/* 面包屑 */}
        <nav className="flex min-w-0 flex-wrap items-center gap-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          <Link href="/" className="hover:text-[color:var(--ol-ink)]">
            {copy.home}
          </Link>
          <span className="text-[color:var(--ol-subtle)]">/</span>
          <Link href="/market" className="hover:text-[color:var(--ol-ink)]">
            {copy.market}
          </Link>
          <span className="text-[color:var(--ol-subtle)]">/</span>
          <span className="min-w-0 break-words text-[color:var(--ol-ink)]">{agent.name}</span>
        </nav>

        {/* 3 列 detail-layout */}
        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,330px)_minmax(0,1fr)_minmax(0,320px)]">
          {/* 左：hero */}
          <AgentHero
            slug={agent.slug}
            name={agent.name}
            description={agent.description}
            totalCalls={agent.total_calls}
            creator={agent.creator}
            certified={agent.certification_status === "certified"}
            tags={agent.tags}
            createdAt={agent.created_at}
            availabilityLabel={availabilityLabel}
            locale={locale}
            readiness={agent.readiness}
            skills={skillsWithStatus}
          />

          {/* 中部主区 */}
          <section className="flex min-w-0 flex-col gap-4">
            {/* 功能介绍 */}
            <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
                  {copy.intro}
                </strong>
                <span className="shrink-0 text-[12px] text-[color:var(--ol-muted)]">
                  {copy.tagCount(agent.tags.length)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-[color:var(--ol-ink)]">
                {agent.description}
              </p>
              {agent.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="ol-chip ol-chip-mint h-7 px-2.5 text-[12px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 价格与计费（4 卡） */}
            <div className="ol-panel min-w-0 overflow-hidden px-4 py-4">
              <div className="grid min-w-0 grid-cols-1 gap-3 text-[12px] text-[color:var(--ol-muted)] sm:grid-cols-2 lg:grid-cols-4">
                <MetaCell label={copy.scope} value={copy.scopeValue} />
                <MetaCell label={copy.pricing} value={billingDescription} />
                <MetaCell label={copy.availability} value={`${availabilityLabel} · ${availabilityStatusSummary(availability.status, locale)}`} />
                <MetaCell label={copy.integration} value="API · Agent Node · MCP" />
              </div>
            </div>

            {availability.status !== "healthy" ? (
              <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
                    {copy.availabilityHint}
                  </strong>
                  <span className={`ol-chip ${availabilityChipClass(availability.status)}`}>
                    {availabilityLabel}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
                  {availabilityHintText}
                </p>
                {availability.last_checked_at ? (
                  <p className="mt-2 text-[12px] text-[color:var(--ol-subtle)]">
                    {copy.checked}{new Date(availability.last_checked_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
                    {availability.consecutive_failures > 0
                      ? copy.failures(availability.consecutive_failures)
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {agent.capability ? (
              <CapabilityPanel capability={agent.capability} locale={locale} />
            ) : null}

            {agent.examples && agent.examples.length > 0 ? (
              <ExamplesPanel
                slug={agent.slug}
                examples={agent.examples}
                callable={callable}
                locale={locale}
              />
            ) : null}

            {/* 用户评价空状态 */}
            <ReviewEmpty locale={locale} />
          </section>

          {/* 右：action */}
          <ActionPanel
            agentID={agent.id}
            slug={agent.slug}
            pricePerCallCents={agent.price_per_call_cents}
            callable={callable}
            availabilityHint={availabilityHintText}
            sampleInput={agent.examples?.[0]?.input_json}
            locale={locale}
          />
        </div>
      </main>
    </>
  );
}

function availabilityChipClass(status: NonNullable<AgentDetail["availability"]>["status"]) {
  if (status === "healthy") return "ol-chip-green";
  if (status === "degraded" || status === "unreachable") return "ol-chip-amber";
  return "ol-chip-mint";
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <b className="block text-[13px] font-black text-[color:var(--ol-ink)]">
        {label}
      </b>
      <span className="mt-1 block break-words text-[12px] text-[color:var(--ol-muted)]">
        {value}
      </span>
    </div>
  );
}

function CapabilityPanel({
  capability,
  locale = "zh",
}: {
  capability: NonNullable<AgentDetail["capability"]>;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? { title: "能力声明", input: "输入", output: "输出" }
      : { title: "Capability Declaration", input: "Input", output: "Output" };

  return (
    <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
        <span className="shrink-0 text-[12px] text-[color:var(--ol-muted)]">
          v{capability.version} · JSON Schema
        </span>
      </div>
      {capability.summary ? (
        <p className="mt-3 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-[color:var(--ol-ink)]">
          {capability.summary}
        </p>
      ) : null}
      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <SchemaBlock title={copy.input} schema={capability.input_schema} />
        <SchemaBlock title={copy.output} schema={capability.output_schema} />
      </div>
    </div>
  );
}

function SchemaBlock({
  title,
  schema,
}: {
  title: string;
  schema: Record<string, unknown>;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
      <b className="block text-[12.5px] font-black text-[color:var(--ol-ink)]">
        {title}
      </b>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11.5px] leading-5 text-[color:var(--ol-ink)]">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}

function ExamplesPanel({
  slug,
  examples,
  callable,
  locale = "zh",
}: {
  slug: string;
  examples: NonNullable<AgentDetail["examples"]>;
  callable: boolean;
  locale?: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          title: "调用示例",
          count: (n: number) => `${n} 条`,
          try: "用此示例试用",
          viewOnlyTitle: "该 Agent 当前不可调用，示例仅供查看。",
          viewOnly: "示例仅供查看",
          input: "输入",
          expectedOutput: "预期输出",
        }
      : {
          title: "Examples",
          count: (n: number) => `${n} items`,
          try: "Try this example",
          viewOnlyTitle: "This Agent is not callable right now. The example is view-only.",
          viewOnly: "View-only example",
          input: "Input",
          expectedOutput: "Expected output",
        };

  return (
    <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
        <span className="shrink-0 text-[12px] text-[color:var(--ol-muted)]">
          {copy.count(examples.length)}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {examples.map((example) => (
          <div
            key={example.id}
            className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--ol-line)] p-3"
          >
            <b className="block break-words text-[13px] font-black text-[color:var(--ol-ink)]">
              {example.title}
            </b>
            {callable ? (
              <Link
                href={`/playground/${encodeURIComponent(slug)}?example=${encodeURIComponent(example.id)}`}
                className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-[color:var(--ol-mint)] px-3 text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:bg-[color:var(--ol-primary)] hover:text-white"
              >
                {copy.try}
              </Link>
            ) : (
              <span
                className="mt-2 inline-flex h-8 items-center justify-center rounded-lg bg-[color:var(--ol-amber-soft)] px-3 text-[12px] font-black text-[color:var(--ol-amber)]"
                title={copy.viewOnlyTitle}
              >
                {copy.viewOnly}
              </span>
            )}
            <div className="mt-2 grid min-w-0 gap-2 lg:grid-cols-2">
              <SchemaBlock title={copy.input} schema={example.input_json} />
              {example.expected_output_json ? (
                <SchemaBlock
                  title={copy.expectedOutput}
                  schema={example.expected_output_json}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// SEO：title + description（截 160 字）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const agent = await fetchAgent(slug);
    return {
      title: agent.name,
      description: agent.description.slice(0, 160),
    };
  } catch {
    return { title: "Agent Detail" };
  }
}
