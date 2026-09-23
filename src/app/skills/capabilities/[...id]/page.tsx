import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SkillDirectoryTabs } from "@/components/skills/skill-directory-tabs";
import { getLocale } from "@/lib/i18n-server";
import { ApiError } from "@/lib/api";
import { localizedSkill, categoryLabel } from "@/lib/skills";
import {
  fetchCapability,
  fetchCapabilityAgents,
  capabilityPath,
} from "@/lib/skill-package-catalog";
import { skillPackageMessages } from "@/messages/skill-package";
const getCapability = cache(async (id: string) => {
  try {
    return await fetchCapability(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});
type Props = { params: Promise<{ id: string[] }> };
export async function generateMetadata({ params }: Props) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const item = await getCapability(id.join("/"));
  const display = localizedSkill(item, locale);
  return {
    title: display.name,
    description: display.description,
    alternates: { canonical: capabilityPath(item.id) },
  };
}
export default async function CapabilityPage({ params }: Props) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const identifier = id.join("/");
  const [skill, top] = await Promise.all([
    getCapability(identifier),
    fetchCapabilityAgents(identifier).catch(() => null),
  ]);
  const display = localizedSkill(skill, locale);
  const copy = skillPackageMessages[locale];
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <SkillDirectoryTabs locale={locale} />
        <article className="ol-panel p-8 md:p-12">
          <span className="ol-chip">
            {categoryLabel(skill.category, locale)}
          </span>
          <h1 className="mt-5 text-3xl font-black">{display.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-[color:var(--ol-muted)]">
            {display.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="ol-mini-btn bg-[color:var(--ol-primary)]! text-white!"
              href={`/registry?skill_ids=${encodeURIComponent(skill.id)}`}
            >
              {copy.findAgents}
            </Link>
            <Link className="ol-mini-btn" href="/hub/skills">
              {copy.publicAction}
            </Link>
          </div>
          <p className="mt-6 max-w-xl text-sm text-[color:var(--ol-muted)]">
            {copy.mappingHint}
          </p>
        </article>
        <section className="ol-panel mt-6 p-8">
          <h2 className="text-lg font-bold">{copy.verifiedAgents}</h2>
          {top === null ? (
            <p className="mt-3 text-sm">{copy.loadError}</p>
          ) : top.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--ol-muted)]">
              {copy.noVerifiedAgents}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {top.map((agent) => (
                <Link
                  key={agent.agent_id}
                  href={`/agents/${encodeURIComponent(agent.slug)}`}
                  className="rounded-xl border border-[color:var(--ol-line)] p-4"
                >
                  <h3 className="font-bold">{agent.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm">
                    {agent.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
