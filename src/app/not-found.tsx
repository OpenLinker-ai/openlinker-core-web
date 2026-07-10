import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "未找到",
          kicker: "页面未找到",
          heading: "找不到这个页面",
          lead: "链接可能无效、已经过期，或对应资源已被移除。你可以回到 Agent 库，或前往开发者中心查看接入方式。",
          registry: "打开 Agent 库",
          connect: "查看开发者文档",
        }
      : {
          home: "Home",
          current: "Not found",
          kicker: "not found",
          heading: "Page not found",
          lead: "The link may be invalid or expired, or the resource may have been removed. Continue from Registry or open Developer Center for connection guidance.",
          registry: "Open Registry",
          connect: "View developer docs",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/">{copy.home}</Link>
          <span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/registry" className="ol-mini-btn ol-mini-btn-primary">
            {copy.registry}
          </Link>
          <Link href="/connect" className="ol-mini-btn">
            {copy.connect}
          </Link>
        </div>
      </main>
    </>
  );
}
