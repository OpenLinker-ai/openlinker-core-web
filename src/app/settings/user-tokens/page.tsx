import Link from "next/link";
import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { SettingsSidebarNav } from "@/components/settings/sidebar-nav";
import { SettingsSignOutButton } from "@/components/settings/sign-out-button";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "User Tokens",
  description: "User Token status for this OpenLinker Core instance",
};

const SCOPES = ["agents:read", "agents:run", "runs:read", "tasks:write"];

export default async function UserTokensPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/settings/user-tokens");

  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "User Token · 实现状态",
          heading: "User Token 契约与状态",
          lead: "Core 已确定 User Token 的正式契约，用于用户侧 REST、SDK、MCP 与 A2A 调用。",
          status: "本地签发与验证实现中",
          statusBody: "当前页面先明确凭据边界和计划中的 scope，不提供创建或撤销操作。已配置外部兼容验证器的部署仍可使用现有 ol_user_* Token。",
          userToken: "User Token",
          userTokenBody: "代表用户或自动化调用方，以最小 scope 访问 Agent、Run、任务和协议入口。",
          agentToken: "Agent Token",
          agentTokenBody: "只用于 Agent 首次注册和运行身份，不能代替 User Token 调用 MCP 或普通 API。",
          scopes: "计划支持的首批 scope",
          docs: "查看 MCP / API 调用说明",
          agentAccess: "管理 Agent 接入凭证",
        }
      : {
          kicker: "User Token · implementation status",
          heading: "User Token contract and status",
          lead: "Core defines User Tokens as the credential contract for user-side REST, SDK, MCP, and A2A calls.",
          status: "Local issuance and verification are in progress",
          statusBody: "This page currently documents the credential boundary and planned scopes; it does not offer create or revoke actions yet. Deployments with the external compatibility verifier can keep using existing ol_user_* tokens.",
          userToken: "User Token",
          userTokenBody: "Represents a user or automation caller and grants the minimum scopes needed for Agents, Runs, tasks, and protocol entry points.",
          agentToken: "Agent Token",
          agentTokenBody: "Used only for Agent registration and runtime identity. It cannot replace a User Token for MCP or regular API calls.",
          scopes: "Initial planned scopes",
          docs: "Read the MCP / API guide",
          agentAccess: "Manage Agent access credentials",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head ol-settings-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
          <SettingsSignOutButton locale={locale} />
        </div>

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SettingsSidebarNav active="user-tokens" locale={locale} />

          <div className="min-w-0 space-y-4">
            <section className="ol-panel ol-panel-pad">
              <div className="ol-kicker">{locale === "zh" ? "当前状态" : "Current status"}</div>
              <h2 className="mt-1 text-[20px] font-black text-[color:var(--ol-ink)]">{copy.status}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">{copy.statusBody}</p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <CredentialCard title={copy.userToken} body={copy.userTokenBody} />
              <CredentialCard title={copy.agentToken} body={copy.agentTokenBody} />
            </section>

            <section className="ol-panel ol-panel-pad">
              <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">{copy.scopes}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCOPES.map((scope) => (
                  <code key={scope} className="ol-chip ol-chip-mint px-3 py-1.5">{scope}</code>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/connect?tab=mcp" className="ol-btn">{copy.docs}</Link>
                <Link href="/hub/access" className="ol-mini-btn">{copy.agentAccess}</Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function CredentialCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="ol-panel ol-panel-pad">
      <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">{title}</h2>
      <p className="mt-2 text-[12.5px] font-semibold leading-relaxed text-[color:var(--ol-muted)]">{body}</p>
    </section>
  );
}
