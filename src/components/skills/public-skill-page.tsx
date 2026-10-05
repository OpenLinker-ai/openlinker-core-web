import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { PublicSkillActions } from "@/components/skills/public-skill-actions";
import { PublicSkillFiles } from "@/components/skills/public-skill-files";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import {
  skillVersionPath,
  skillLocalNameCompatible,
} from "@/lib/resource-sharing.mjs";
import type {
  SkillPackage,
  SkillPackageVersion,
  SkillPackageContents,
} from "@/lib/skill-packages";
import { resourceSharingMessages } from "@/messages/resource-sharing";
type Version = SkillPackageVersion & {
  contents: SkillPackageContents;
  visibility: string;
};
async function load<T>(path: string): Promise<T> {
  try {
    return await apiFetch<T>(path, { cache: "no-store" });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
export async function PublicSkillPage({
  packageId,
  versionId,
}: {
  packageId: string;
  versionId?: string;
}) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  const item = await load<SkillPackage>(
    `/api/v1/skill-packages/${encodeURIComponent(packageId)}`,
  );
  if (!versionId) {
    if (!item.versions.length) notFound();
    redirect(skillVersionPath(item.id, item.versions[0].id));
  }
  const version = await load<Version>(
    `/api/v1/skill-packages/${encodeURIComponent(packageId)}/versions/${encodeURIComponent(versionId)}`,
  );
  const content = version.contents;
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <Link
          href="/skills?tab=packages"
          className="text-sm text-[color:var(--ol-muted)]"
        >
          ← {c.returnDirectory}
        </Link>
        <header className="my-8 max-w-3xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="ol-chip">Skill</span>
            <span className="ol-chip">{version.version}</span>
            <span className="ol-chip">
              {item.visibility === "unlisted" ? c.unlisted : c.public}
            </span>
          </div>
          <h1 className="break-words text-3xl font-black md:text-4xl">
            {content.name}
          </h1>
          <p className="mt-4 text-[color:var(--ol-muted)]">
            {content.description}
          </p>
        <a className="ol-mini-btn mt-5 lg:hidden" href="#use-version">{c.use}</a>
        </header>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <PublicSkillFiles files={content.files} locale={locale} />
            <section className="ol-panel space-y-4 p-6">
              <h2 className="font-bold">{c.providers}</h2>
              <p>{version.providers.join(" / ")}</p>
              <h2 className="font-bold">{c.requirements}</h2>
              <p className="break-words text-sm">
                {content.required_commands?.join(", ") || c.none}
              </p>
              {version.capability_ids.length > 0 && (
                <>
                  <h2 className="font-bold">{c.capabilities}</h2>
                  <div className="flex flex-wrap gap-2">
                    {version.capability_ids.map((id) => (
                      <Link
                        className="ol-chip"
                        key={id}
                        href={`/skills/capabilities/${id.split("/").map(encodeURIComponent).join("/")}`}
                      >
                        {id}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <p className="text-sm text-[color:var(--ol-muted)]">
                {c.localHint}
              </p>
              {!skillLocalNameCompatible(content.name, content.description) && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  {c.incompatible}
                </p>
              )}
            </section>
          </div>
          <aside id="use-version" className="min-w-0 scroll-mt-40 space-y-6">
            <section className="ol-panel p-6">
              <h2 className="mb-5 text-lg font-bold">{c.use}</h2>
              <PublicSkillActions
                packageId={item.id}
                version={version}
                locale={locale}
              />
            </section>
            <section className="ol-panel space-y-4 p-6">
              <h2 className="font-bold">{c.versions}</h2>
              <div className="flex flex-wrap gap-2">
                {item.versions.map((v) => (
                  <Link
                    className="ol-chip"
                    aria-current={v.id === version.id ? "page" : undefined}
                    href={skillVersionPath(item.id, v.id)}
                    key={v.id}
                  >
                    {v.version}
                  </Link>
                ))}
              </div>
              <h2 className="font-bold">{c.digest}</h2>
              <code className="block break-all text-xs">{version.digest}</code>
              <p className="text-xs text-[color:var(--ol-muted)]">
                {c.digestHint}
              </p>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
