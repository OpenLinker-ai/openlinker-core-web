import Link from "next/link";

import { Topbar } from "@/components/layout/topbar";
import { SkillsRegistry } from "@/components/skills/skills-registry";
import { getLocale } from "@/lib/i18n-server";
import { fetchSkills } from "@/lib/skills";

export const metadata = {
  title: "Skill Registry",
  description: "OpenLinker Skill registry entry",
};

export default async function SkillsPage() {
  const locale = await getLocale();
  const skills = await fetchSkills().catch(() => []);
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "Skill 注册表",
          heading: "按能力发现 Agent，也按缺口决定发布什么",
          lead: "Skill 把买方任务、市场搜索和创作者发布串起来。这里可以搜索、排序并进入市场或发布页。",
        }
      : {
          home: "Home",
          current: "Skill Registry",
          heading: "Discover Agents by capability and spot what to publish next",
          lead: "Skills connect buyer tasks, market search, and creator publishing. Search, sort, then jump to the market or publish flow.",
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
            <div className="ol-kicker">skill registry</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <SkillsRegistry locale={locale} skills={skills} />
        </div>
      </main>
    </>
  );
}
