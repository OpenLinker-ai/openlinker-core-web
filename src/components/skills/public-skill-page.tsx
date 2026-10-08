import Link from "next/link";
import { SkillQuickInstall } from "@/components/skills/skill-quick-install";
import { skillInstallMessages } from "@/messages/skill-install";
import { ResourceNavigation, ResourceNextStep } from "@/components/resources/resource-navigation";
import { ResourceAnchorRedirect } from "@/components/resources/resource-anchor-redirect";
import { skillSectionHref, type SkillSection } from "@/lib/resource-journey";
import { resourceJourneyMessages } from "@/messages/resource-journey";
import { ResourceMetadataCard } from "@/components/resources/resource-metadata";
import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { PublicSkillActions } from "@/components/skills/public-skill-actions";
import { PublicSkillFiles } from "@/components/skills/public-skill-files";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import {
  skillVersionPath,
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
  contents: Omit<SkillPackageContents, "files"> & { files?: Record<string, string> };
  local_install_compatible?: boolean;
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
  section = "overview",
}: {
  packageId: string;
  versionId?: string;
  returnTo?: unknown;
  section?: SkillSection;
}) {
  const locale = await getLocale();
  const c = resourceSharingMessages[locale];
  const u = resourceUseMessages[locale];
  const install = skillInstallMessages[locale];
  const directory = resourceReturnPath(returnTo);
  const j = resourceJourneyMessages[locale];
  const href = (view: SkillSection, id = versionId!) => skillSectionHref(packageId, id, view, directory);
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
    `/api/v1/skill-packages/${encodeURIComponent(packageId)}/versions/${encodeURIComponent(versionId)}${section === "files" ? "" : "/metadata"}`,
  );
  const content = version.contents;
  const compatible = version.local_install_compatible === true;
  // Only explicit metadata crosses a client component boundary outside /files.
  const actionVersion: SkillPackageVersion = {
    id: version.id, version: version.version, digest: version.digest,
    providers: version.providers, capability_ids: version.capability_ids, created_at: version.created_at,
  };
  const quickInstall = <SkillQuickInstall key={version.id} repositoryUrl={version.publication_metadata?.repository_url} name={content.name} compatible={compatible} locale={locale} filesHref={href("files")} />;
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
          {section !== "use" && <Link className="ol-mini-btn ol-mini-btn-primary mt-5" href={href("use")}>{install.associate}</Link>}
          {item.versions.length > 1 && section !== "versions" && <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">{c.versions} · {version.version}</summary>
            <div className="mt-3 flex flex-wrap gap-2">{item.versions.map(v => <Link key={v.id} href={href(section, v.id)} aria-current={v.id === version.id ? "page" : undefined} className="ol-chip">{v.version}</Link>)}</div>
          </details>}
        </header>
        {section === "overview" && <ResourceAnchorRedirect targets={{
          "#use-version": href("use"), "#skill-files": href("files"), "#skill-versions": href("versions"),
        }} />}
        <ResourceNavigation locale={locale} links={([
          ["overview", j.overview], ["files", j.files], ["versions", j.versions], ["use", install.associate], ["install", install.title],
        ] as [SkillSection, string][]).map(([view, label]) => ({ href: href(view), label, current: section === view }))} />
        <div className="max-w-4xl space-y-6">
          {section === "overview" && <>
            {quickInstall}
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
              {!compatible && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  {install.incompatible}
                </p>
              )}
            </section>
            <ResourceMetadataCard
              metadata={version.publication_metadata}
              version={version.version}
              locale={locale}
            />
            <ResourceNextStep title={j.readFirst} hint={j.readHint} href={href("files")} label={j.files} />
          </>}
          {section === "files" && <>
            <div id="skill-files" className="scroll-mt-32">
              <PublicSkillFiles
                key={version.id}
                files={content.files ?? {}}
                locale={locale}
              />
            </div>
            <ResourceNextStep title={j.nextUse} hint={j.nextHint} href={href("use")} label={install.associate} />
          </>}
          {section === "versions" && <section
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
                    href={href(section, v.id)}
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
            </section>}
          {section === "install" && quickInstall}
          {section === "use" && <>
            <section id="use-version" className="ol-panel p-6">
              <h2 className="mb-5 text-lg font-bold">{install.associate}</h2>
              <PublicSkillActions key={version.id} packageId={item.id} version={actionVersion} locale={locale} associateOnly />
            </section>
            <ResourceNextStep title={install.title} hint={install.upstream} href={href("install")} label={install.title} />
          </>}
        </div>
      </main>
    </>
  );
}
