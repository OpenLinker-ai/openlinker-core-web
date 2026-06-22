/**
 * 设置页（Server Component）。
 *
 * 视觉来自 prototype/openlinker-flow-23-settings.png + #flow-settings：
 *   1. <Topbar />
 *   2. ol-breadcrumb 我的 / 设置
 *   3. ol-page-head：kicker + h1 + 副标题
 *   4. settings-layout 2 列：
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
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { AccountSection } from "@/components/settings/account-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SecuritySection } from "@/components/settings/security-section";
import { SettingsSidebarNav } from "@/components/settings/sidebar-nav";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

interface MeResponse {
  user_id: string;
  email: string;
  display_name: string;
  is_creator: boolean;
  is_admin: boolean;
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
          my: "我的",
          settings: "设置",
          kicker: "我的 / 设置",
          heading: "账户、安全与通知",
          lead: "管理登录资料、密码、站内告警和 Run Webhook 入口。Agent 自注册邀请在创作者中心的接入页维护。",
        }
      : {
          my: "My",
          settings: "Settings",
          kicker: "My / Settings",
          heading: "Account, Security, and Notifications",
          lead: "Manage profile details, password, in-app alerts, and Run Webhook entry points. Agent self-registration invites live in Creator Hub access.",
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
        {/* breadcrumb */}
        <div className="ol-breadcrumb">
          <span>{copy.my}</span>
          <span className="sep">/</span>
          <span className="current">{copy.settings}</span>
        </div>

        {/* page-head */}
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <MyWorkspaceSwitcher className="mt-6" locale={locale} />

        {/* settings-layout 2 列 */}
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <SettingsSidebarNav active={activeTab} locale={locale} />

          <div className="min-w-0">
            {activeTab === "account" ? (
              <AccountSection email={email} displayName={displayName} locale={locale} />
            ) : null}
            {activeTab === "security" ? <SecuritySection locale={locale} /> : null}
            {activeTab === "notifications" ? <NotificationsSection locale={locale} /> : null}
          </div>
        </div>
      </main>
    </>
  );
}
