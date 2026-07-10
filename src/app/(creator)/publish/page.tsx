/**
 * Agent 所有者接入 Agent 页（Server Component）。
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
 * Agent 支持 HTTP Endpoint、Agent Node WebSocket、Runtime Pull fallback，以及已有 MCP Tool 包装；无人值守 Agent 可从这里进入自注册邀请。创建后可继续补充能力声明、dry-run 与实例认证信息。
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
      ? { loadFailed: "账号信息暂时无法读取，请稍后重试。" }
      : { loadFailed: "Account information is temporarily unavailable. Try again later." };

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
          kicker: "接入方式",
          title: "无人值守 Agent 可先生成接入凭证",
          body: "如果你正在手动接入公网调用端点或 MCP 工具，继续填写下方表单。若是本地脚本、CLI、内网服务或 Agent Node 需要自己完成首次注册，请生成限时 Agent 接入凭证；明文只显示一次，注册后同一个 Token 继续作为运行身份。",
          primary: "生成 Agent 接入凭证",
          secondary: "继续手动接入",
        }
      : {
          kicker: "Connection method",
          title: "Unattended Agents can start with an access credential",
          body: "Keep using the form below when you are manually connecting a public endpoint or MCP tool. For unattended registration, create a time-limited Agent access credential whose plaintext is shown once; the same Token becomes the runtime identity after registration.",
          primary: "Create Agent credential",
          secondary: "Continue manual setup",
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
 * 基础信息是创建步骤；能力声明、示例与实例认证在创建后继续完善。
 */
function PublishHead({ activePill, locale }: { activePill: string | null; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          kicker: "我的 / 接入 Agent",
          heading: "把 Agent 接入当前实例",
          lead: "手动接入可配置公网 HTTPS、Agent Node WebSocket、Agent Node（长轮询）或 MCP 工具包装；无人值守 Agent 可先生成接入凭证，让 Agent 自己完成注册。",
          later: "创建后可继续",
          progressAria: "接入进度",
          pills: [
            { id: "basic", label: "基础信息" },
            { id: "skills", label: "能力声明" },
            { id: "examples", label: "示例" },
            { id: "certification", label: "实例认证" },
          ],
        }
      : {
          kicker: "My / Connect Agent",
          heading: "Connect an Agent to this instance",
          lead: "Connect manually with HTTPS, Agent Node WebSocket, Runtime Pull, or an MCP tool wrapper. For unattended Agents, create an access credential first so the Agent can register itself.",
          later: "Available after creation",
          progressAria: "Connection progress",
          pills: [
            { id: "basic", label: "Basics" },
            { id: "skills", label: "Capability claims" },
            { id: "examples", label: "Examples" },
            { id: "certification", label: "Instance certification" },
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
