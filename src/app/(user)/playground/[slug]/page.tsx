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
 *   - 面包屑：首页 / 市场 / [Agent 名] / Playground
 *   - page-head：kicker + h1 + 副标题
 *   - <PlaygroundRunner /> 渲染 3 列主区
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { PlaygroundRunner } from "@/components/playground/runner";
import { ApiError, apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface AgentDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags: string[];
  visibility?: string;
  creator: { display_name: string };
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
    task_id?: string;
  }>;
}) {
  const { slug } = await params;
  const { prefill, example, autorun, task_id: taskID } = await searchParams;

  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=/playground/${encodeURIComponent(slug)}`);
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          market: "市场",
          myAgent: "我的 Agent",
          heading: "Playground 让调用过程透明",
          lead: "输入任务，实时查看 Agent 调用了哪些工具、耗时多久、最终结果是什么；当前运行免费。",
        }
      : {
          home: "Home",
          market: "Market",
          myAgent: "My Agent",
          heading: "Playground makes each run transparent",
          lead: "Enter a task, watch what the Agent does, see timing, and inspect the final result. Runs are free in the current phase.",
        };

  const agent = await fetchPlaygroundAgent(slug, session.jwt);
  const isPrivateOwnerAgent = agent.visibility === "private";
  const collectionHref = isPrivateOwnerAgent ? "/hub?tab=agents" : "/market";
  const collectionLabel = isPrivateOwnerAgent ? copy.myAgent : copy.market;

  const selectedExample = example
    ? agent.examples?.find((item) => item.id === example)
    : undefined;

  return (
    <>
      <Topbar />
      <main className="mx-auto w-full max-w-7xl px-6 py-6">
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
          <span className="text-[color:var(--ol-ink)]">Playground</span>
        </nav>

        {/* page-head */}
        <header className="mt-6">
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
            step 3 / run
          </div>
          <h1 className="mt-2 text-[34px] font-black leading-[1.15] text-[color:var(--ol-ink)] sm:text-[40px]">
            {copy.heading}
          </h1>
          <p className="mt-2.5 max-w-2xl text-[15px] leading-[1.55] text-[color:var(--ol-muted)]">
            {copy.lead}
          </p>
        </header>

        <MyWorkspaceSwitcher className="mt-6" />

        <div className="mt-6">
          <PlaygroundRunner
            agent={agent}
            prefill={prefill}
            initialInput={selectedExample?.input_json}
            autorun={autorun === "1"}
            taskId={taskID}
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
  return { title: `Playground · ${slug}` };
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
