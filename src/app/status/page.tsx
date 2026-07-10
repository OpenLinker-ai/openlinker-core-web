import { Topbar } from "@/components/layout/topbar";
import { StatusDashboard } from "@/components/status/status-dashboard";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata() {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "实例状态", description: "OpenLinker Core 实例状态" }
    : { title: "Instance Status", description: "OpenLinker Core instance status" };
}

export default async function StatusPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "实例状态",
          heading: "服务状态、事件记录和接入侧影响",
          lead: "把 API、Agent 目录、运行链路和外部投递放在同一个视图里，方便定位调用失败或投递延迟。",
        }
      : {
          home: "Home",
          current: "Instance Status",
          heading: "Service status, incidents, and integration impact",
          lead: "API, Registry, run chains, and external delivery are shown together so run failures or delivery delays are easier to diagnose.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.current}</div>
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
