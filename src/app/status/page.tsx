import { Topbar } from "@/components/layout/topbar";
import { StatusDashboard } from "@/components/status/status-dashboard";
import { getLocale } from "@/lib/i18n-server";

export const metadata = {
  title: "Platform Status",
  description: "OpenLinker platform status",
};

export default async function StatusPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "平台状态",
          heading: "服务状态、事件记录和接入侧影响",
          lead: "把 API、Registry、运行链路和外部投递放在同一个视图里，方便定位调用失败或投递延迟。",
        }
      : {
          home: "Home",
          current: "Platform Status",
          heading: "Service status, incidents, and integration impact",
          lead: "API, Registry, run chains, and external delivery are shown together so run failures or delivery delays are easier to diagnose.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">status</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <StatusDashboard locale={locale} />
        </div>
      </main>
    </>
  );
}
