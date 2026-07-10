/**
 * 设置页（Server Component）。
 *
 * 视觉来自 prototype/openlinker-flow-23-settings.png + #flow-settings：
 *   1. <Topbar />
 *   2. ol-page-head：kicker + h1 + 副标题 + 退出登录
 *   3. settings-layout 2 列：
 *      - 左 240px <SettingsSidebarNav />
 *      - 右自适应：<AccountSection /> + <SecuritySection /> + <NotificationsSection />
 *
 * 行为：
 *   - 通过 ?tab=account/security/notifications 做功能分页。
 *   - 拉 GET /api/v1/me 显示真实 email + display_name
 *   - 后端不可用：fallback 用 session 数据，页面仍能渲染，不崩
 *   - 路由保护由 proxy.ts 兜，未登录跳 /login；这里 defensive redirect。
 */

import { redirect } from "next/navigation";

import { Topbar } from "@/components/layout/topbar";
import { AccountSection } from "@/components/settings/account-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SecuritySection } from "@/components/settings/security-section";
import { SettingsSidebarNav } from "@/components/settings/sidebar-nav";
import { SettingsSignOutButton } from "@/components/settings/sign-out-button";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface MeResponse {
  user_id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  is_admin: boolean;
  has_password?: boolean;
  is_oauth_user?: boolean;
  oauth_provider?: string;
  auth_method?: string;
}

type SettingsTab = "account" | "security" | "notifications";

function normalizeSettingsTab(value?: string): SettingsTab {
  if (value === "security" || value === "notifications") {
    return value;
  }
  return "account";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/settings");
  const activeTab = normalizeSettingsTab((await searchParams).tab);
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "设置",
          heading: "账户、安全与通知",
          lead: "管理登录资料、密码、站内告警和运行投递/回调入口。Agent 自注册邀请在接入 Agent 流程和 Agent 管理的注册邀请页维护。",
        }
      : {
          kicker: "settings",
          heading: "Account, Security, and Notifications",
          lead: "Manage profile details, password, in-app alerts, and run delivery/callback entry points. Agent self-registration invites live in the Connect Agent flow and Agent Console.",
        };

  let me: MeResponse | null = null;
  try {
    me = await apiFetchAuthed<MeResponse>("/api/v1/me");
  } catch {
    // 后端不可用 → 用 session 兜底，页面仍可展示设置框架
    me = null;
  }

  const email = me?.email ?? session.user?.email ?? "";
  const displayName = me?.display_name || session.user?.name || email;

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        {/* page-head */}
        <div className="ol-page-head ol-settings-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
          <SettingsSignOutButton locale={locale} />
        </div>

        {/* settings-layout 2 列 */}
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SettingsSidebarNav active={activeTab} locale={locale} />

          <div className="min-w-0">
            {activeTab === "account" ? (
              <AccountSection email={email} displayName={displayName} locale={locale} />
            ) : null}
            {activeTab === "security" ? (
              <SecuritySection
                locale={locale}
                hasPassword={me?.has_password}
                isOAuthUser={me?.is_oauth_user}
                oauthProvider={me?.oauth_provider}
              />
            ) : null}
            {activeTab === "notifications" ? <NotificationsSection locale={locale} /> : null}
          </div>
        </div>
      </main>
    </>
  );
}
