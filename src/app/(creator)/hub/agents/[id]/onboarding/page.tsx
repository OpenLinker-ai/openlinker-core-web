import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  AgentOnboardingPanel,
  type OnboardingAgent,
  type OnboardingResponse,
  type OnboardingSkill,
} from "@/components/creator/agent-onboarding-panel";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface CreatorAgent {
  id: string;
  slug: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "disabled";
  lifecycle_status: "active" | "disabled";
  visibility: "public" | "unlisted" | "private";
  certification_status: "unreviewed" | "pending" | "certified" | "rejected";
  endpoint_url: string;
  connection_mode?: "direct_http" | "mcp_server" | "runtime_ws" | "runtime_pull";
  mcp_tool_name?: string;
}

type AgentsPayload = CreatorAgent[] | { items?: CreatorAgent[] };

interface AgentDetailWithSkills {
  skills?: OnboardingSkill[];
}

function normalizeAgents(payload: AgentsPayload): CreatorAgent[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function toOnboardingAgent(agent: CreatorAgent): OnboardingAgent {
  return {
    ...agent,
    connection_mode: agent.connection_mode ?? "direct_http",
  };
}

export default async function AgentOnboardingPage({
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
          current: "接入",
          kicker: "Agent 接入 / 能力声明",
          title: "接入配置",
          lead: "维护能力声明、示例输入输出和 dry-run 状态，让平台可以更准确地匹配与调用。",
          back: "返回创作者中心",
        }
      : {
          hub: "Creator Hub",
          current: "Onboarding",
          kicker: "Agent onboarding / capability declaration",
          title: "Onboarding settings",
          lead: "Maintain capability declarations, example inputs and outputs, and dry-run status so the platform can match and invoke the Agent more accurately.",
          back: "Back to Creator Hub",
        };

  const { id: slugParam } = await params;

  let agent: OnboardingAgent | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents");
    const agents = normalizeAgents(payload);
    const found = agents.find((a) => a.slug === slugParam || a.id === slugParam);
    agent = found ? toOnboardingAgent(found) : null;
  } catch {
    agent = null;
  }

  if (!agent) {
    notFound();
  }

  const onboarding = await apiFetchAuthed<OnboardingResponse>(
    `/api/v1/creator/agents/${agent.id}/onboarding`,
  ).catch(() => null);

  if (!onboarding) {
    notFound();
  }

  const skills = await apiFetchAuthed<AgentDetailWithSkills>(
    `/api/v1/agents/${encodeURIComponent(agent.slug)}`,
  )
    .then((r) => r.skills ?? [])
    .catch(() => [] as OnboardingSkill[]);

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

        <AgentOnboardingPanel
          agent={agent}
          initialOnboarding={onboarding}
          initialSkills={skills}
          locale={locale}
        />
      </main>
    </>
  );
}
