import { redirect } from "next/navigation";
import Link from "next/link";

import {
  InboxCenter,
  type AvailabilityAlert,
} from "@/components/inbox/inbox-center";
import { Topbar } from "@/components/layout/topbar";
import { MyWorkspaceSwitcher } from "@/components/my/workspace-switcher";
import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "通知中心", description: "OpenLinker 通知中心" }
    : { title: "Inbox", description: "OpenLinker inbox" };
}

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/inbox");
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          my: "我的",
          current: "通知中心",
          heading: "Agent 可用性告警",
          lead: "这里仅显示你所管理 Agent 的可用性告警。异常与恢复记录来自服务端巡检，可标记已读并进入对应 Agent 检查连接。",
        }
      : {
          my: "My",
          current: "Inbox",
          heading: "Agent availability alerts",
          lead: "This inbox only shows availability alerts for Agents you manage. Probe failures and recoveries can be marked as read and opened in the related Agent setup.",
        };
  const availabilityAlerts = await apiFetchAuthed<{
    items: AvailabilityAlert[];
    total: number;
    unread: number;
  }>("/api/v1/creator/availability-alerts").catch(() => ({
    items: [] as AvailabilityAlert[],
    total: 0,
    unread: 0,
  }));

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/my">{copy.my}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.current}</div>
            <h1>{copy.heading}</h1>
            <p>
              {copy.lead}
            </p>
          </div>
        </div>

        <MyWorkspaceSwitcher className="mt-6" locale={locale} />

        <div className="mt-8">
          <InboxCenter availabilityAlerts={availabilityAlerts.items} locale={locale} />
        </div>
      </main>
    </>
  );
}
