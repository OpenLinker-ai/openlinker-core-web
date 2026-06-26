import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AgentSettingsPanel,
  type EditableAgent,
} from "@/components/creator/agent-settings-panel";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

type AgentsPayload = EditableAgent[] | { items?: EditableAgent[] };

function normalizeAgents(payload: AgentsPayload): EditableAgent[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function normalizeAgent(agent: EditableAgent): EditableAgent {
  return {
    ...agent,
    connection_mode: agent.connection_mode ?? "direct_http",
    tags: agent.tags ?? [],
  };
}

export default async function AgentSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/hub");
  }

  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "创作者中心",
          current: "设置",
          kicker: "Agent 设置 / 作者可编辑",
          title: "Agent 设置",
          lead: "编辑作者可维护的基础信息、连接方式和可见性。平台审核、认证、健康度和统计只在这里展示。",
          back: "返回创作者中心",
        }
      : {
          hub: "Creator Hub",
          current: "Settings",
          kicker: "Agent settings / Creator editable",
          title: "Agent settings",
          lead: "Edit creator-owned basic information, connection, and visibility. Platform review, certification, health, and metrics are read-only here.",
          back: "Back to Creator Hub",
        };

  const { id: slugParam } = await params;
  let agent: EditableAgent | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents");
    const agents = normalizeAgents(payload);
    const found = agents.find((item) => item.slug === slugParam || item.id === slugParam);
    agent = found ? normalizeAgent(found) : null;
  } catch {
    agent = null;
  }

  if (!agent) {
    notFound();
  }

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
            <h1>{agent.name} · {copy.title}</h1>
            <p>{copy.lead}</p>
          </div>
          <Link
            href="/hub"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.back}
          </Link>
        </div>

        <AgentSettingsPanel agent={agent} locale={locale} />
      </main>
    </>
  );
}
