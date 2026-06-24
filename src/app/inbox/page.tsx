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

export const metadata = {
  title: "Inbox",
  description: "OpenLinker inbox",
};

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/inbox");
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          my: "我的",
          current: "通知中心",
          heading: "审核、运行、权益和投递事件",
          lead: "所有需要你回看的站内事件集中在这里，可以按类型筛选、标记已读并跳到对应详情。",
        }
      : {
          my: "My",
          current: "Inbox",
          heading: "Review, run, plan, and delivery events",
          lead: "Review in-app events here, filter by type, mark them as read, and jump to the related detail page.",
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
            <div className="ol-kicker">inbox</div>
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
