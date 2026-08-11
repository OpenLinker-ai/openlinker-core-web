import Link from "next/link";
import { notFound } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { Topbar } from "@/components/layout/topbar";
import { RunHistory, type Run } from "@/components/runs/run-history";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { fetchCreatorAgentByParam } from "@/lib/creator-agent";
import { redirectCreatorAgentLogin, rethrowCreatorAgentPageError } from "@/lib/creator-agent-page";
import { getLocale } from "@/lib/i18n-server";

interface RunListResp {
  items: Run[];
  total: number;
  page: number;
  size: number;
}

export default async function AgentRunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id: slugParam }, sp, session] = await Promise.all([params, searchParams, auth()]);
  const callbackPath = `/hub/agents/${encodeURIComponent(slugParam)}/runs`;
  const callbackUrl = sp.page
    ? `${callbackPath}?${new URLSearchParams({ page: sp.page })}`
    : callbackPath;
  if (!session) {
    redirectCreatorAgentLogin(callbackUrl);
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "Agent 管理",
          current: "调用记录",
          kicker: "Agent 管理 / Agent 调用记录",
          heading: "被调用记录",
          lead: "这里展示这个 Agent 被用户、User Token 或 MCP 工具触发的运行记录。自注册 Agent 会绑定到签发 Agent Token 的所有者，因此也会出现在同一份列表里。",
          onboarding: "接入配置",
          back: "返回 Agent 管理",
          listTitle: "被调用记录",
          empty: "这个 Agent 还没有被调用记录。",
          action: "去试用台测一次 →",
        }
      : {
          hub: "Agent Console",
          current: "Run Records",
          kicker: "Agent Console / Agent runs",
          heading: "Run records",
          lead: "This shows runs triggered by users, User Tokens, or MCP tools. Self-registered Agents are bound to the owner who issued their Agent Token, so those runs appear here too.",
          onboarding: "Onboarding",
          back: "Back to Agent Console",
          listTitle: "Run records",
          empty: "This Agent has no run records yet.",
          action: "Run once in Playground ->",
        };

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const size = 20;

  let agent: AgentResponse | null;
  try {
    agent = await fetchCreatorAgentByParam<AgentResponse>(slugParam);
  } catch (error) {
    rethrowCreatorAgentPageError(error, callbackUrl);
  }

  if (!agent) {
    notFound();
  }

  const runs = await apiFetchAuthed<RunListResp>(
    `/api/v1/creator/agents/${agent.id}/runs?page=${page}&size=${size}`,
  ).catch(() => ({ items: [], total: 0, page, size }) satisfies RunListResp);

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/hub">{copy.hub}</Link>
          <span className="sep">/</span>
          <span>Agent</span>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{agent.name} · {copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/hub/agents/${agent.slug}/onboarding`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            >
              {copy.onboarding}
            </Link>
            <Link
              href="/hub"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
            >
              {copy.back}
            </Link>
          </div>
        </div>

        <section className="mt-6">
          <RunHistory
            items={runs.items}
            total={runs.total}
            page={runs.page}
            size={runs.size}
            title={copy.listTitle}
            emptyText={copy.empty}
            emptyHref={`/playground/${agent.slug}`}
            emptyActionLabel={copy.action}
            locale={locale}
          />
        </section>
      </main>
    </>
  );
}
