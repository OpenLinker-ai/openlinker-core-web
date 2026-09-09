/**
 * Playground 页（Server Component）。
 *
 * 数据：
 *   - GET /api/v1/agents/:slug   公开接口，agent 详情
 *   - 公开接口 404 时，GET /api/v1/creator/agents/by-slug/:slug 兜底查询自己的 private Agent
 *
 * 鉴权：proxy.ts 已经做了未登录跳转，这里仍 defensive 走一遍 auth() 兜底，
 *       并把 callbackUrl 带回，使登录后能跳回当前 playground。
 *
 * 视觉：参考 prototype/openlinker-flow-10-playground.png
 *   - 顶部 Topbar
 *   - 面包屑：首页 / Registry / [Agent 名] / Playground
 *   - page-head：kicker + h1 + 副标题
 *   - <PlaygroundRunner /> 渲染会话、Trace 和结果主区
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { PlaygroundRunner } from "@/components/playground/runner";
import { ApiError, apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
} from "@/lib/i18n-labels";
import { getLocale } from "@/lib/i18n-server";

interface AgentDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags: string[];
  visibility?: string;
  availability?: {
    status?: "unknown" | "healthy" | "degraded" | "unreachable" | string;
    label?: string;
    hint?: string;
    last_successful_run_at?: string;
  };
  readiness?: {
    callable?: boolean;
  };
  creator: { display_name: string };
  capability?: {
    input_schema: Record<string, unknown>;
    version: number;
  };
  examples?: {
    id: string;
    title: string;
    input_json: Record<string, unknown>;
  }[];
}

export default async function PlaygroundPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    prefill?: string;
    example?: string;
    autorun?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { prefill, example, autorun } = query;

  const session = await auth();
  if (!session) {
    const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    const callback = `/playground/${encodeURIComponent(slug)}${params.size ? `?${params}` : ""}`;
    redirect(`/login?${new URLSearchParams({ callbackUrl: callback })}`);
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          market: "Agent 库",
          myAgent: "我的 Agent",
          playground: "试用台",
          heading: "试用 Agent",
          lead: "会话保存在本机，刷新可继续；登出不清除，多标签页可能互相覆盖。",
          unavailableTitle: "试用台暂不可用",
          unavailableLead: "该 Agent 暂不可调用，或还没有成功通过健康检查。请稍后重试，或在 Agent 管理中运行健康检查。",
          back: "返回",
        }
      : {
          home: "Home",
          market: "Registry",
          myAgent: "My Agent",
          playground: "Playground",
          heading: "Try the Agent",
          lead: "Chats stay in this browser after refresh and sign-out. Multiple tabs may overwrite each other.",
          unavailableTitle: "Playground unavailable",
          unavailableLead: "This Agent is not callable yet or has not passed a health check. Try again later, or run a health check from Agent Console.",
          back: "Back",
        };

  const agent = await fetchPlaygroundAgent(slug, session.jwt);
  const isPrivateOwnerAgent = agent.visibility === "private";
  const collectionHref = isPrivateOwnerAgent ? "/hub/agents" : "/registry";
  const collectionLabel = isPrivateOwnerAgent ? copy.myAgent : copy.market;
  const callable = isPlaygroundAgentCallable(agent);
  const availabilityStatus = agent.availability?.status ?? "unknown";
  const availabilityLabel = availabilityStatusLabel(
    availabilityStatus,
    locale,
    agent.availability?.label,
  );
  const availabilityHint = availabilityStatusHint(
    availabilityStatus,
    locale,
    agent.availability?.hint,
  );

  if (!callable) {
    return (
      <>
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-6 py-6">
          <nav className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--ol-muted)]">
            <Link href="/" className="hover:text-[color:var(--ol-ink)]">
              {copy.home}
            </Link>
            <span className="text-[color:var(--ol-subtle)]">/</span>
            <Link href={collectionHref} className="hover:text-[color:var(--ol-ink)]">
              {collectionLabel}
            </Link>
            <span className="text-[color:var(--ol-subtle)]">/</span>
            <span className="text-[color:var(--ol-ink)]">{copy.playground}</span>
          </nav>
          <section className="ol-panel ol-panel-pad mt-6 max-w-2xl">
            <div className="ol-kicker">{availabilityLabel}</div>
            <h1 className="mt-2 text-[28px] font-black text-[color:var(--ol-ink)]">
              {copy.unavailableTitle}
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-[color:var(--ol-muted)]">
              {availabilityHint || copy.unavailableLead}
            </p>
            <Link href={collectionHref} className="ol-mini-btn ol-mini-btn-primary mt-5">
              {copy.back} {collectionLabel}
            </Link>
          </section>
        </main>
      </>
    );
  }

  const selectedExample = example
    ? agent.examples?.find((item) => item.id === example)
    : undefined;

  return (
    <>
      <Topbar />
      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 xl:h-[calc(100dvh-84px)] xl:grid-rows-[auto_auto_minmax(0,1fr)] xl:overflow-hidden">
        {/* 面包屑 */}
        <nav className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--ol-muted)]">
          <Link href="/" className="hover:text-[color:var(--ol-ink)]">
            {copy.home}
          </Link>
          <span className="text-[color:var(--ol-subtle)]">/</span>
          <Link href={collectionHref} className="hover:text-[color:var(--ol-ink)]">
            {collectionLabel}
          </Link>
          <span className="text-[color:var(--ol-subtle)]">/</span>
          {isPrivateOwnerAgent ? (
            <span className="text-[color:var(--ol-muted)]">{agent.name}</span>
          ) : (
            <Link
              href={`/agents/${agent.slug}`}
              className="hover:text-[color:var(--ol-ink)]"
            >
              {agent.name}
            </Link>
          )}
          <span className="text-[color:var(--ol-subtle)]">/</span>
          <span className="text-[color:var(--ol-ink)]">{copy.playground}</span>
        </nav>

        <header className="ol-page-title">
          <div className="ol-kicker">{copy.playground}</div>
          <h1>{copy.heading}</h1>
          <p>{copy.lead}</p>
        </header>

        <div className="min-h-0">
          <PlaygroundRunner
            key={`${session.user?.id ?? ""}:${agent.id}:${example ?? ""}:${prefill ?? ""}`}
            userId={session.user?.id}
            agent={agent}
            prefill={prefill}
            selectedExample={selectedExample?.input_json}
            examples={agent.examples ?? []}
            inputSchema={agent.capability?.input_schema}
            autorun={autorun === "1"}
            locale={locale}
          />
        </div>
      </main>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  return { title: `${locale === "zh" ? "试用台" : "Playground"} · ${slug}` };
}

async function fetchPlaygroundAgent(slug: string, token?: string): Promise<AgentDetail> {
  const encodedSlug = encodeURIComponent(slug);
  try {
    return await apiFetch<AgentDetail>(`/api/v1/agents/${encodedSlug}`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404 && token)) {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }
  }

  try {
    return await apiFetch<AgentDetail>(
      `/api/v1/creator/agents/by-slug/${encodedSlug}`,
      { token },
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

function isPlaygroundAgentCallable(agent: AgentDetail): boolean {
  return (
    agent.readiness?.callable ??
    (agent.availability?.status === "healthy" ||
      (Boolean(agent.availability?.last_successful_run_at) &&
        agent.availability?.status !== "unreachable"))
  );
}
