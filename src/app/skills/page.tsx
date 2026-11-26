import { resourceDirectoryQuery } from "@/lib/resource-sharing.mjs";
import { ResourceDirectory } from "@/components/resources/resource-directory";
import { skillPackageMessages } from "@/messages/skill-package";
import { SkillDirectoryTabs } from "@/components/skills/skill-directory-tabs";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { fetchCatalogRegistries } from "@/lib/catalog-server";
import { catalogMessages } from "@/messages/catalog";
import { Topbar } from "@/components/layout/topbar";
import { SkillsRegistry } from "@/components/skills/skills-registry";
import { getLocale } from "@/lib/i18n-server";
import type { Locale } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { fetchSkills } from "@/lib/skills";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  if ((await searchParams).tab === "packages")
    return {
      title: skillPackageMessages[locale].packages,
      description: skillPackageMessages[locale].publicDescription,
    };
  return locale === "zh"
    ? { title: "Skill 目录", description: "OpenLinker Skill 目录入口" }
    : {
        title: "Skill Directory",
        description: "OpenLinker Skill directory entry",
      };
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const sp = await searchParams;
  if (sp.tab === "catalog" || sp.tab === "packages")
    return <SkillTabView locale={locale} tab={sp.tab} query={sp} />;

  const [skills, registries] = await Promise.all([
    fetchSkills({ locale }).catch(() => []),
    fetchCatalogRegistries(),
  ]);
  const catalogAvailable = registries.length > 0;
  const copy =
    locale === "zh"
      ? {
          home: "首页",
          current: "Skill 目录",
          kicker: "当前实例 · Skill 目录",
          heading: "按能力发现 Agent",
          lead: "Skill 是当前实例描述 Agent 能力的统一标识，关联 Agent 声明、能力测评结果、MCP/A2A 运行记录和筛选。目录中没有的能力，可以提交 Skill 建议。",
        }
      : {
          home: "Home",
          current: "Skill directory",
          kicker: "This instance · Skill directory",
          heading: "Discover Agents by capability",
          lead: "Skills give this instance a shared vocabulary for Agent claims, benchmark results, MCP/A2A run records, and filters. If a capability is missing, you can propose a Skill here.",
        };

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">{copy.kicker}</div>
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
          </div>
        </div>

        <div className="mt-8">
          <SkillDirectoryTabs
            locale={locale}
            catalogAvailable={catalogAvailable}
          />
          <SkillsRegistry locale={locale} skills={skills} />
        </div>
      </main>
    </>
  );
}

async function SkillTabView({
  locale,
  tab,
  query,
}: {
  locale: Locale;
  tab: string;
  query: Record<string, string | string[] | undefined>;
}) {
  const registries = await fetchCatalogRegistries();
  const catalogAvailable = registries.length > 0;
  if (tab === "catalog" && !catalogAvailable) redirect("/skills");
  if (tab === "packages") {
    const copy = skillPackageMessages[locale];
    return (
      <>
        <Topbar />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="mb-6 text-3xl font-black">{copy.packages}</h1>
          <SkillDirectoryTabs
            locale={locale}
            packages
            catalogAvailable={catalogAvailable}
          />
          <ResourceDirectory
            locale={locale}
            {...resourceDirectoryQuery(query)}
          />
        </main>
      </>
    );
  }
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-black">
          {catalogMessages[locale].tab}
        </h1>
        <SkillDirectoryTabs locale={locale} catalog catalogAvailable />
        <CatalogBrowser locale={locale} kind="skills" registries={registries} />
      </main>
    </>
  );
}
