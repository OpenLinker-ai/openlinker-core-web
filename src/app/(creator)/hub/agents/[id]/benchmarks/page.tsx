import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BenchmarkPanel,
  type BenchmarkAgent,
  type BenchmarkRuntimeStatus,
  type DeclaredSkill,
  type SkillScoreItem,
} from "@/components/creator/benchmark-panel";
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
  endpoint_url: string;
}

interface AgentDetailWithSkills {
  skills?: DeclaredSkill[];
}

export default async function AgentBenchmarksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id: slugParam }, session] = await Promise.all([params, auth()]);
  const callbackUrl = `/hub/agents/${encodeURIComponent(slugParam)}/benchmarks`;
  if (!session) {
    redirectCreatorAgentLogin(callbackUrl);
  }
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          hub: "Agent 管理",
          kicker: "能力测评",
          title: "能力测评",
          lead: "系统会按每个 Skill 运行测试用例，并用 LLM 评估输出。平均分达到 75 分时，测评状态显示为“已通过”；Agent 暂不可运行时，这里只显示历史结果。",
          back: "返回接入",
        }
      : {
          hub: "Agent Console",
          kicker: "Capability benchmark",
          title: "Capability Benchmark",
          lead: "The system runs test cases for each Skill and uses an LLM to assess the output. An average score of 75 or higher is shown as verified; when the Agent is unavailable, this page shows historical results only.",
          back: "Back to onboarding",
        };

  const runtimeStatusPromise = apiFetchAuthed<BenchmarkRuntimeStatus>(
    "/api/v1/benchmark/status",
  ).catch(
    () =>
      ({
        can_run: false,
        reasons: ["status_unavailable"],
        message: "Benchmark runtime status is unavailable.",
      }) satisfies BenchmarkRuntimeStatus,
  );

  let found: CreatorAgent | null;
  try {
    found = await fetchCreatorAgentByParam<CreatorAgent>(slugParam);
  } catch (error) {
    rethrowCreatorAgentPageError(error, callbackUrl);
  }
  let agent: BenchmarkAgent | null = null;
  if (found) agent = { id: found.id, slug: found.slug, name: found.name };

  if (!agent) {
    notFound();
  }

  // 已声明的 skill 列表（决定哪些可以跑 benchmark）
  const declaredPromise = apiFetchAuthed<AgentDetailWithSkills>(
    `/api/v1/agents/${encodeURIComponent(agent.slug)}`,
  )
    .then((r) => r.skills ?? [])
    .catch(() => [] as DeclaredSkill[]);

  // 当前评分快照
  const scoresPromise = apiFetchAuthed<{ items: SkillScoreItem[] }>(
    `/api/v1/creator/agents/${agent.id}/skill-scores`,
  )
    .then((r) => r.items ?? [])
    .catch(() => [] as SkillScoreItem[]);

  const [declared, scores, runtimeStatus] = await Promise.all([
    declaredPromise,
    scoresPromise,
    runtimeStatusPromise,
  ]);

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/hub">{copy.hub}</Link>
          <span className="sep">/</span>
          <span>Agent</span>
          <span className="sep">/</span>
          <span className="current">{copy.title}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{agent.name} · {copy.title}</h1>
            <p>{copy.lead}</p>
          </div>
          <Link
            href={`/hub/agents/${agent.slug || agent.id}/onboarding`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.back}
          </Link>
        </div>

        <BenchmarkPanel
          agent={agent}
          declared={declared}
          initialScores={scores}
          runtimeStatus={runtimeStatus}
          locale={locale}
        />
      </main>
    </>
  );
}
