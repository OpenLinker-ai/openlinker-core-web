import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AgentOnboardingPanel,
  type OnboardingAgent,
  type OnboardingResponse,
  type OnboardingSkill,
} from "@/components/creator/agent-onboarding-panel";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { fetchCreatorAgentByParam } from "@/lib/creator-agent";
import { redirectCreatorAgentLogin, rethrowCreatorAgentPageError } from "@/lib/creator-agent-page";
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
  connection_mode?: "direct_http" | "mcp_server" | "runtime";
  mcp_tool_name?: string;
}

interface AgentDetailWithSkills {
  skills?: OnboardingSkill[];
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
  const [{ id: slugParam }, session] = await Promise.all([params, auth()]);
  const callbackUrl = `/hub/agents/${encodeURIComponent(slugParam)}/onboarding`;
  if (!session) {
    redirectCreatorAgentLogin(callbackUrl);
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "Agent 管理",
          current: "接入",
          kicker: "Agent 接入 / 能力声明",
          title: "接入配置",
          lead: "维护能力声明、示例输入输出和 dry-run 状态，帮助当前实例更准确地匹配与调用。",
          back: "返回 Agent 管理",
        }
      : {
          hub: "Agent Console",
          current: "Onboarding",
          kicker: "Agent onboarding / capability declaration",
          title: "Onboarding settings",
          lead: "Maintain capability declarations, example inputs and outputs, and dry-run status so this instance can match and invoke the Agent more accurately.",
          back: "Back to Agent Console",
        };

  let found: CreatorAgent | null;
  try {
    found = await fetchCreatorAgentByParam<CreatorAgent>(slugParam);
  } catch (error) {
    rethrowCreatorAgentPageError(error, callbackUrl);
  }
  const agent = found ? toOnboardingAgent(found) : null;

  if (!agent) {
    notFound();
  }

  const onboardingPromise = apiFetchAuthed<OnboardingResponse>(
    `/api/v1/creator/agents/${agent.id}/onboarding`,
  ).catch(() => null);

  const skillsPromise = apiFetchAuthed<AgentDetailWithSkills>(
    `/api/v1/agents/${encodeURIComponent(agent.slug)}`,
  )
    .then((r) => r.skills ?? [])
    .catch(() => [] as OnboardingSkill[]);

  const [onboarding, skills] = await Promise.all([onboardingPromise, skillsPromise]);
  if (!onboarding) {
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
