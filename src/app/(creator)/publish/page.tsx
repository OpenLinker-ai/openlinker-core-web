/**
 * 创作者发布 Agent 页（Server Component）。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png：
 *   - <Topbar /> 顶部导航
 *   - page-head：kicker + h1 + 副标题 + 右侧进度 filter-pills（仅"基础信息"active）
 *   - <PublishForm /> 渲染 ol-publish-layout 2 列（左表单 + 右预览）
 *
 * 流程：
 *   1. await auth()：proxy.ts 已经守住了未登录跳转，但这里仍 defensive 检查
 *   2. apiFetchAuthed("/api/v1/me") 拿当前用户的 is_creator + display_name
 *   3. is_creator=true → <PublishForm creatorName={...} />
 *      is_creator=false → <BecomeCreatorPrompt /> 引导一键开通
 *   4. 后端不可用 → 显示降级提示，不抛错让 RSC tree 崩溃
 *
 * Agent 支持 HTTP Endpoint、Agent Node WebSocket、Runtime Pull fallback，以及已有 MCP Tool 包装；无人值守 Agent 可从这里进入自注册邀请。能力声明 / dry-run / 认证状态作为后续步骤展示。
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { BecomeCreatorPrompt } from "@/components/agent/become-creator-prompt";
import { PublishForm } from "@/components/agent/publish-form";
import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkills, type Skill } from "@/lib/skills";

interface MeResponse {
  user_id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  is_admin: boolean;
}

export default async function PublishPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/publish");
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? { loadFailed: "无法读取用户信息，请检查后端服务是否启动。" }
      : { loadFailed: "Unable to read user information. Check that the backend service is running." };

  let me: MeResponse | null = null;
  let loadFailed = false;
  try {
    me = await apiFetchAuthed<MeResponse>("/api/v1/me");
  } catch {
    loadFailed = true;
  }

  // Skill 目录公开接口；失败时降级为空数组（表单内不显示该分区）。
  let skills: Skill[] = [];
  try {
    skills = await fetchSkills();
  } catch {
    skills = [];
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <PublishHead activePill={me?.is_creator ? "basic" : null} locale={locale} />
        <MyWorkspaceSwitcher className="mt-6" locale={locale} />

        {loadFailed ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {copy.loadFailed}
          </div>
        ) : me?.is_creator ? (
          <>
            <SelfRegistrationEntry locale={locale} />
            <div id="manual-publish-form" className="scroll-mt-28">
              <PublishForm creatorName={me.display_name || me.email} skills={skills} locale={locale} />
            </div>
          </>
        ) : (
          <BecomeCreatorPrompt locale={locale} />
        )}
      </main>
    </>
  );
}

function SelfRegistrationEntry({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          kicker: "发布方式",
          title: "无人值守 Agent 可先生成接入凭证",
          body: "如果你正在手动发布一个公网 Endpoint 或 MCP 工具，继续填写下方表单。若是本地脚本、CLI、内网服务或 Agent Node 需要自己完成首次注册，请生成一次性 Agent 接入凭证，再把启动包交给 Agent。",
          primary: "生成 Agent 接入凭证",
          secondary: "继续手动发布",
        }
      : {
          kicker: "Publishing mode",
          title: "Unattended Agents can start with an access credential",
          body: "Keep using the form below when you are manually publishing a public endpoint or MCP tool. For a local script, CLI, private service, or Agent Node that needs to register itself, create a one-time Agent access credential and pass the startup packet to the Agent.",
          primary: "Create Agent credential",
          secondary: "Continue manual publishing",
        };

  return (
    <section className="ol-panel ol-panel-pad mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="ol-kicker">{copy.kicker}</div>
          <h2 className="mt-1 text-[20px] font-black text-[color:var(--ol-ink)]">{copy.title}</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.body}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/hub/access"
            className="inline-flex h-10 items-center justify-center rounded-[13px] bg-[color:var(--ol-primary)] px-4 text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
          >
            {copy.primary}
          </Link>
          <a
            href="#manual-publish-form"
            className="inline-flex h-10 items-center justify-center rounded-[13px] border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
          >
            {copy.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * page-head：左 kicker + h1 + 副标题；右 4 段进度 filter-pills。
 *
 * Phase 1：仅"基础信息"active，其他 disabled。
 */
function PublishHead({ activePill, locale }: { activePill: string | null; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          kicker: "我的 / 发布 Agent",
          heading: "发布你的 Agent",
          lead: "手动发布可配置公网 HTTPS、Agent Node WebSocket、Runtime Pull 或 MCP 工具包装；无人值守 Agent 可先生成接入凭证，让 Agent 自己完成注册。",
          later: "后续步骤",
          progressAria: "发布进度",
          pills: [
            { id: "basic", label: "基础信息" },
            { id: "skills", label: "能力声明" },
            { id: "examples", label: "示例" },
            { id: "certification", label: "认证" },
          ],
        }
      : {
          kicker: "My / Publish Agent",
          heading: "Publish your Agent",
          lead: "Publish manually with HTTPS, Agent Node WebSocket, Runtime Pull, or an MCP tool wrapper. For unattended Agents, create an access credential first so the Agent can register itself.",
          later: "Later step",
          progressAria: "Publishing progress",
          pills: [
            { id: "basic", label: "Basics" },
            { id: "skills", label: "Capability claims" },
            { id: "examples", label: "Examples" },
            { id: "certification", label: "Certification" },
          ],
        };

  return (
    <div className="ol-page-head">
      <div className="ol-page-title">
        <div className="ol-kicker">{copy.kicker}</div>
        <h1>{copy.heading}</h1>
        <p>{copy.lead}</p>
      </div>

      <div className="ol-filter-pills" role="tablist" aria-label={copy.progressAria}>
        {copy.pills.map((pill) => {
          const isActive = activePill === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ol-filter-pill${isActive ? " active" : ""}`}
              disabled={!isActive}
              title={isActive ? undefined : copy.later}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
