/**
 * 创作者接入 Agent 页（Server Component）。
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
 * Agent 支持 HTTP Endpoint、Agent Node WebSocket、Runtime Pull fallback，以及已有 MCP Tool 包装；能力声明 / dry-run / 认证状态作为后续步骤展示。
 */

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
          <PublishForm creatorName={me.display_name || me.email} skills={skills} locale={locale} />
        ) : (
          <BecomeCreatorPrompt locale={locale} />
        )}
      </main>
    </>
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
          kicker: "我的 / 接入 Agent",
          heading: "选择接入方式并发布你的 Agent",
          lead: "公网 HTTPS 可直连；本地 / 内网 / NAT Agent 默认用 Agent Node WebSocket；Runtime Pull 只作降级。已有 MCP tool 可作为高级包装，不是 MCP Server 上架入口。",
          later: "后续步骤",
          pills: [
            { id: "basic", label: "基础信息" },
            { id: "skills", label: "能力声明" },
            { id: "examples", label: "示例" },
            { id: "certification", label: "认证" },
          ],
        }
      : {
          kicker: "My / Connect Agent",
          heading: "Choose a connection mode and publish your Agent",
          lead: "Use a public HTTPS endpoint when reachable. For local, private-network, or NAT Agents, use Agent Node WebSocket by default; Runtime Pull is only the fallback. Existing MCP tools can be wrapped as an advanced Agent source, not listed as MCP Servers here.",
          later: "Later step",
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

      <div className="ol-filter-pills" role="tablist" aria-label="发布进度">
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
