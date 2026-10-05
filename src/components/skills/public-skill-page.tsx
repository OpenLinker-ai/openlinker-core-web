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
  resourceReturnPath,
  withResourceReturn,
} from "@/lib/resource-sharing.mjs";
import type {
  SkillPackage,
  SkillPackageVersion,
  SkillPackageContents,
} from "@/lib/skill-packages";
import { resourceSharingMessages } from "@/messages/resource-sharing";
import { resourceUseMessages } from "@/messages/resource-use";
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
  returnTo,
}: {
  packageId: string;
  versionId?: string;
  returnTo?: unknown;
}) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  const u = resourceUseMessages[locale];
  const directory = resourceReturnPath(returnTo);
  const item = await load<SkillPackage>(
    `/api/v1/skill-packages/${encodeURIComponent(packageId)}`,
  );
  if (!versionId) {
    if (!item.versions.length) notFound();
    redirect(
      withResourceReturn(
        skillVersionPath(item.id, item.versions[0].id),
        directory,
      ),
    );
  }
  const version = await load<Version>(
    `/api/v1/skill-packages/${encodeURIComponent(packageId)}/versions/${encodeURIComponent(versionId)}`,
  );
  const content = version.contents;
  const published = version.published_at
    ? new Date(version.published_at)
    : null;
  const publishedDate =
    published && Number.isFinite(published.getTime())
      ? published.toISOString()
      : null;
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <Link href={directory} className="text-sm text-[color:var(--ol-muted)]">
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
          <a
            className="ol-mini-btn ol-mini-btn-primary mt-5"
            href="#use-version"
          >
            {c.use}
          </a>
        </header>
        <nav
          aria-label={u.navigation}
          className="mb-6 flex flex-wrap gap-4 border-b border-[color:var(--ol-line)] pb-4 text-sm font-semibold"
        >
          <a href="#skill-overview">{u.overview}</a>
          <a href="#skill-files">{c.files}</a>
          <a href="#skill-versions">{c.versions}</a>
          <a href="#use-version">{c.use}</a>
        </nav>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section
              id="skill-overview"
              className="ol-panel scroll-mt-32 space-y-4 p-6"
            >
              <h2 className="text-lg font-bold">{u.overview}</h2>
              <h3 className="font-bold">{c.providers}</h3>
              <p>{version.providers.join(" / ")}</p>
              <h3 className="font-bold">{c.requirements}</h3>
              <p className="break-words text-sm">
                {content.required_commands?.join(", ") || c.none}
              </p>
              {version.capability_ids.length > 0 && (
                <>
                  <h3 className="font-bold">{c.capabilities}</h3>
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
            <div id="skill-files" className="scroll-mt-32">
              <PublicSkillFiles
                key={version.id}
                files={content.files}
                locale={locale}
              />
            </div>
            <section
              id="skill-versions"
              className="ol-panel scroll-mt-32 space-y-4 p-6"
            >
              <h2 className="text-lg font-bold">{u.sourceTitle}</h2>
              <p className="text-xs leading-relaxed text-[color:var(--ol-muted)]">
                {u.sourceNote}
              </p>
              {publishedDate && (
                <p className="text-sm">
                  {u.publishedAt}:{" "}
                  <time dateTime={publishedDate}>
                    {publishedDate.slice(0, 16).replace("T", " ")}
                  </time>
                </p>
              )}
              <h3 className="font-bold">{c.versions}</h3>
              <div className="flex flex-wrap gap-2">
                {item.versions.map((v) => (
                  <Link
                    className="ol-chip"
                    aria-current={v.id === version.id ? "page" : undefined}
                    href={withResourceReturn(
                      skillVersionPath(item.id, v.id),
                      directory,
                    )}
                    key={v.id}
                  >
                    {v.version}
                  </Link>
                ))}
              </div>
              <h3 className="font-bold">{c.digest}</h3>
              <code className="block break-all text-xs">{version.digest}</code>
              <p className="text-xs text-[color:var(--ol-muted)]">
                {c.digestHint}
              </p>
            </section>
          </div>
          <aside id="use-version" className="min-w-0 scroll-mt-40 space-y-6">
            <section className="ol-panel p-6">
              <h2 className="mb-5 text-lg font-bold">{c.use}</h2>
              <PublicSkillActions
                key={version.id}
                packageId={item.id}
                version={version}
                locale={locale}
              />
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
