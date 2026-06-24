import Link from "next/link";

import { A2AConformancePanel } from "@/components/a2a/a2a-conformance-panel";
import { A2AConsole, type ChildrenPayload } from "@/components/a2a/a2a-console";
import {
  ParentRunDirectory,
  type ParentRunListPayload,
} from "@/components/a2a/parent-run-directory";
import { Topbar } from "@/components/layout/topbar";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "A2A Collaboration",
  description: "OpenLinker multi-Agent collaboration entry",
};

export default async function A2APage({
  searchParams,
}: {
  searchParams: Promise<{ run_id?: string; parent_page?: string }>;
}) {
  const { run_id: runId, parent_page: parentPageParam } = await searchParams;
  const session = await auth();
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "A2A 协作",
          h1: "A2A 调用闭环",
          lead: "从 Parent 目录进入真实调用链，查看 Agent 自注册、Skill 能力、MCP 入口与 Agent 绑定调用如何串成闭环。",
          readError: "无法读取该调用链",
        }
      : {
          home: "Home",
          current: "A2A Collaboration",
          h1: "A2A Invocation Loop",
          lead: "Open a real call chain from the Parent directory and inspect how Agent self-registration, Skills, MCP entry points, and bound Agent calls connect.",
          readError: "Unable to read this call chain",
        };
  if (!session) {
    return <A2APublicIntro callbackUrl={a2aCallbackUrl(runId, parentPageParam)} locale={locale} />;
  }

  const parentPage = Math.max(1, Number(parentPageParam ?? "1") || 1);
  const parentPageSize = 10;
  const parentResult = await apiFetchAuthed<ParentRunListPayload>(
    `/api/v1/a2a/parents?page=${parentPage}&size=${parentPageSize}`,
  )
    .then((data) => ({
      data: normalizeParentRunList(data, parentPage, parentPageSize),
      failed: false,
    }))
    .catch(() => ({
      data: {
        items: [],
        total: 0,
        page: parentPage,
        size: parentPageSize,
      } satisfies ParentRunListPayload,
      failed: true,
    }));

  let initialData: ChildrenPayload | null = null;
  let initialError = "";
  if (runId) {
    try {
      initialData = await apiFetchAuthed<ChildrenPayload>(
        `/api/v1/runs/${encodeURIComponent(runId)}/children`,
      );
    } catch {
      initialError = copy.readError;
    }
  }
  const parentItems = Array.isArray(parentResult.data.items) ? parentResult.data.items : [];
  const activeParent = runId
    ? parentItems.find((item) => item.parent_run_id === runId)
    : undefined;

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">agent to agent</div>
            <h1>{copy.h1}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <ParentRunDirectory
            locale={locale}
            data={parentResult.data}
            activeRunId={runId}
            failed={parentResult.failed}
          />
          <div className="mt-5">
            <A2AConformancePanel
              locale={locale}
              initialSlug={activeParent?.caller_agent_slug ?? ""}
            />
          </div>
          <A2AConsole
            key={runId ?? "no-parent-selected"}
            locale={locale}
            initialRunId={runId}
            initialData={initialData}
            initialError={initialError}
            activeParent={activeParent}
          />
        </div>
      </main>
    </>
  );
}

function a2aCallbackUrl(runId?: string, parentPage?: string): string {
  const params = new URLSearchParams();
  if (runId) params.set("run_id", runId);
  if (parentPage) params.set("parent_page", parentPage);
  const query = params.toString();
  return query ? `/a2a?${query}` : "/a2a";
}

function normalizeParentRunList(
  data: ParentRunListPayload,
  fallbackPage: number,
  fallbackSize: number,
): ParentRunListPayload {
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number.isFinite(data.total) ? data.total : items.length;
  const page = Number.isFinite(data.page) && data.page > 0 ? data.page : fallbackPage;
  const size = Number.isFinite(data.size) && data.size > 0 ? data.size : fallbackSize;
  return { items, total, page, size };
}

function A2APublicIntro({ callbackUrl, locale }: { callbackUrl: string; locale: "zh" | "en" }) {
  const authQuery = new URLSearchParams({ callbackUrl }).toString();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "A2A 协作",
          h1: "A2A 调用闭环",
          lead: "查看父 Agent 如何委派子 Agent、运行记录如何串联，以及 Skill、MCP 和运行事件如何形成一条可追踪的协作链。",
          login: "登录后查看调用链",
          publicTitle: "A2A 公开说明",
          privateChip: "登录后读取个人运行记录",
          step1: "父 Agent 发起委派",
          step1Desc: "Agent 在一次运行中拿到 parent_run_id，并用绑定令牌请求平台调用目标 Agent。",
          step2: "平台创建子运行",
          step2Desc: "OpenLinker 记录子运行、调用方、目标、原因、计费模式与运行事件。",
          step3: "调用链可追踪",
          step3Desc: "登录后可以按父运行查看子调用、状态、Skill 标签和关联运行详情。",
          visible: "登录后可见内容",
          caps: [
            "我的父调用链目录",
            "父运行到子运行的关系图",
            "子运行状态、耗时和免费委派字段",
            "跳转运行详情排查失败或查看产物",
          ],
          start: "开始接入",
          guideConnect: ["接入中心", "查看 MCP、API 与 A2A 在同一运行链上的关系。"],
          guideSkill: ["消费 Agent Skill", "读取 Agent 调用示例和所需权限范围。"],
          guideMarket: ["浏览 Agent", "先从可调用 Agent 理解运行入口。"],
          reason: "需要登录的原因",
          reasonBody: "A2A 控制台会展示你的运行 ID、Agent 委派关系和子运行详情。公开页只展示协议说明，个人调用链和运行记录需要登录后读取。",
        }
      : {
          home: "Home",
          current: "A2A Collaboration",
          h1: "A2A Invocation Loop",
          lead: "See how a Parent Agent delegates to Child Agents, how run records are linked, and how Skills, MCP, and run events create a traceable collaboration chain.",
          login: "Sign in to view call chains",
          publicTitle: "A2A Public Overview",
          privateChip: "Personal run records load after sign-in",
          step1: "Parent delegates",
          step1Desc: "During a run, an Agent receives a parent run_id and uses a bound token to ask OpenLinker to invoke a target Agent.",
          step2: "OpenLinker creates a child run",
          step2Desc: "OpenLinker records the child run, caller, target, reason, billing_mode, and run events.",
          step3: "The chain is traceable",
          step3Desc: "After sign-in, you can inspect child calls, status, Skill tags, and linked run details by Parent.",
          visible: "Available after sign-in",
          caps: [
            "My Parent call-chain directory",
            "Parent-to-child run relationship map",
            "Child-run status, duration, and free-delegation fields",
            "Jump to run detail for failures or artifacts",
          ],
          start: "Start connecting",
          guideConnect: ["Connect center", "See how MCP, API, and A2A share one run chain."],
          guideSkill: ["Consume Agent Skill", "Read Agent invocation examples and required scopes."],
          guideMarket: ["Browse Agents", "Start with callable Agents to understand the run entry."],
          reason: "Why sign-in is required",
          reasonBody: "The A2A console shows your run IDs, Agent delegation links, and child run details. The public page only explains the protocol; personal call chains and run records require sign-in.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">agent to agent</div>
            <h1>{copy.h1}</h1>
            <p>{copy.lead}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/login?${authQuery}`} className="ol-btn">
              {copy.login}
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="ol-panel overflow-hidden">
            <div className="ol-panel-head">
              <strong>{copy.publicTitle}</strong>
              <span className="ol-chip ol-chip-mint">{copy.privateChip}</span>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              <IntroStep
                step="1"
                title={copy.step1}
                desc={copy.step1Desc}
              />
              <IntroStep
                step="2"
                title={copy.step2}
                desc={copy.step2Desc}
              />
              <IntroStep
                step="3"
                title={copy.step3}
                desc={copy.step3Desc}
              />
            </div>
            <div className="border-t border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/70 p-5">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">
                {copy.visible}
              </h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {copy.caps.map((label) => (
                  <Capability key={label} label={label} />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="ol-panel ol-panel-pad">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.start}</h2>
              <div className="mt-4 grid gap-2">
                <GuideLink href="/connect" title={copy.guideConnect[0]} desc={copy.guideConnect[1]} />
                <GuideLink href="/skill/consume-agent" title={copy.guideSkill[0]} desc={copy.guideSkill[1]} />
                <GuideLink href="/registry" title={copy.guideMarket[0]} desc={copy.guideMarket[1]} />
              </div>
            </div>
            <div className="ol-panel ol-panel-pad">
              <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.reason}</h2>
              <p className="mt-3 text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">
                {copy.reasonBody}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function IntroStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ol-primary)] text-[11px] font-black text-white">
          {step}
        </span>
        <strong className="text-[13px] text-[color:var(--ol-ink)]">{title}</strong>
      </div>
      <p className="mt-3 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
        {desc}
      </p>
    </div>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
      {label}
    </div>
  );
}

function GuideLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3 hover:border-[color:var(--ol-primary)]/40"
    >
      <span className="block text-[12.5px] font-black text-[color:var(--ol-ink)]">{title}</span>
      <span className="mt-1 block text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
        {desc}
      </span>
    </Link>
  );
}
