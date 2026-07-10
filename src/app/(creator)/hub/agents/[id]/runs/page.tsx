import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import { Topbar } from "@/components/layout/topbar";
import { RunHistory, type Run } from "@/components/runs/run-history";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

type AgentsPayload = AgentResponse[] | { items?: AgentResponse[] };

interface RunListResp {
  items: Run[];
  total: number;
  page: number;
  size: number;
}

function normalizeAgents(payload: AgentsPayload): AgentResponse[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export default async function AgentRunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/hub");
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "Agent 管理",
          current: "调用记录",
          kicker: "Agent 管理 / Agent 调用记录",
          heading: "被调用记录",
          lead: "这里展示这个 Agent 被用户、访问凭证或 MCP 工具触发的运行记录。自注册 Agent 会绑定到生成 Agent 接入凭证的 Agent 所有者用户，因此也会出现在同一份列表里。",
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
          lead: "This shows runs triggered by users, access credentials, or MCP tools. Self-registered Agents are bound to the Agent-owner user that generated their Agent access credential, so those runs appear here too.",
          onboarding: "Onboarding",
          back: "Back to Agent Console",
          listTitle: "Run records",
          empty: "This Agent has no run records yet.",
          action: "Run once in Playground ->",
        };

  const [{ id: slugParam }, sp] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const size = 20;

  let agent: AgentResponse | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents");
    const agents = normalizeAgents(payload);
    agent = agents.find((a) => a.slug === slugParam || a.id === slugParam) ?? null;
  } catch {
    agent = null;
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
