import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export default async function AgentNotFound() {
  const locale = await getLocale();
  const copy = locale === "zh"
    ? {
        home: "首页",
        registry: "Agent 库",
        current: "Agent 未找到",
        kicker: "Agent 不存在",
        heading: "找不到这个 Agent",
        lead: "它可能已改名、下架或设为不可见。你可以回到 Agent 库继续查找可用 Agent。",
        action: "返回 Agent 库",
      }
    : {
        home: "Home",
        registry: "Registry",
        current: "Agent not found",
        kicker: "Agent unavailable",
        heading: "We could not find this Agent",
        lead: "It may have been renamed, removed, or made private. Return to Registry to find an available Agent.",
        action: "Back to Registry",
      };

  return (
    <>
      <Topbar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-16">
        <nav className="ol-breadcrumb" aria-label={locale === "zh" ? "面包屑" : "Breadcrumb"}>
          <Link href="/">{copy.home}</Link><span className="sep">/</span>
          <Link href="/registry">{copy.registry}</Link><span className="sep">/</span>
          <span className="current">{copy.current}</span>
        </nav>
        <section className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </section>
        <Link href="/registry" className="ol-mini-btn ol-mini-btn-primary mt-8">{copy.action}</Link>
      </main>
    </>
  );
}
