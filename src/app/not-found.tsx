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
          kicker: "not found",
          heading: "这个页面暂时不可用",
          lead: "链接可能已过期，或当前数据源没有返回对应资源。你可以回到 Registry 或接入中心继续操作。",
          registry: "打开 Registry",
          connect: "查看接入文档",
        }
      : {
          home: "Home",
          current: "Not found",
          kicker: "not found",
          heading: "This page is not available",
          lead: "The link may have expired, or the current data source did not return this resource. You can continue from Registry or Connect.",
          registry: "Open Registry",
          connect: "View Connect docs",
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
