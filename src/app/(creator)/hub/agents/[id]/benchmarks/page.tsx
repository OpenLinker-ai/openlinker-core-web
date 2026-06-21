import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
import { getLocale } from "@/lib/i18n-server";

interface CreatorAgent {
  id: string;
  slug: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "disabled";
  endpoint_url: string;
}

type AgentsPayload = CreatorAgent[] | { items?: CreatorAgent[] };

interface AgentDetailWithSkills {
  skills?: DeclaredSkill[];
}

function normalizeAgents(payload: AgentsPayload): CreatorAgent[] {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

export default async function AgentBenchmarksPage({
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
          title: "能力测评",
          lead: "平台对每个 Skill 跑一组测试用例 + LLM 评分。平均分 ≥ 75 → verified；如果运行能力未就绪，这里只展示历史结果。",
          back: "返回接入",
        }
      : {
          hub: "Creator Hub",
          title: "Capability Benchmark",
          lead: "The platform runs test cases and LLM judging for each Skill. Average score >= 75 becomes verified. If runtime capability is not ready, only historical results are shown.",
          back: "Back to onboarding",
        };

  const { id: slugParam } = await params;

  let agent: BenchmarkAgent | null = null;
  try {
    const payload = await apiFetchAuthed<AgentsPayload>("/api/v1/creator/agents");
    const agents = normalizeAgents(payload);
    const found = agents.find((a) => a.slug === slugParam || a.id === slugParam) ?? null;
    if (found) agent = { id: found.id, slug: found.slug, name: found.name };
  } catch {
    agent = null;
  }

  if (!agent) {
    notFound();
  }

  // 已声明的 skill 列表（决定哪些可以跑 benchmark）
  const declared = await apiFetchAuthed<AgentDetailWithSkills>(
    `/api/v1/agents/${encodeURIComponent(agent.slug)}`,
  )
    .then((r) => r.skills ?? [])
    .catch(() => [] as DeclaredSkill[]);

  // 当前评分快照
  const scores = await apiFetchAuthed<{ items: SkillScoreItem[] }>(
    `/api/v1/creator/agents/${agent.id}/skill-scores`,
  )
    .then((r) => r.items ?? [])
    .catch(() => [] as SkillScoreItem[]);

  const runtimeStatus = await apiFetchAuthed<BenchmarkRuntimeStatus>("/api/v1/benchmark/status")
    .then((r) => r)
    .catch(
      () =>
        ({
          can_run: false,
          reasons: ["status_unavailable"],
          message: "Benchmark runtime status is unavailable.",
        }) satisfies BenchmarkRuntimeStatus,
    );

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/hub">{copy.hub}</Link>
          <span className="sep">/</span>
          <span>Agent</span>
          <span className="sep">/</span>
          <span className="current">Benchmark</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">skill benchmark</div>
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
