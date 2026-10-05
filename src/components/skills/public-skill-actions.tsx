"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { AuthLink } from "@/components/auth/auth-link";
import { CopyContent } from "@/components/resources/copy-content";
import { skillPackageErrorText } from "@/lib/skill-packages";
import {
  parseSkillReference,
  skillVersionPath,
} from "@/lib/resource-sharing.mjs";
import type {
  SkillPackage,
  SkillPackageVersion,
  SkillPackageContents,
} from "@/lib/skill-packages";
import type { Locale } from "@/lib/i18n";
import { resourceSharingMessages } from "@/messages/resource-sharing";
const inputClass =
  "w-full rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] px-3 py-2 text-sm";
const subscribe = () => () => {};
export function useBrowserOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}
export function PublicSkillActions({
  packageId,
  version,
  locale,
}: {
  packageId: string;
  version: SkillPackageVersion;
  locale: Locale;
}) {
  const c = resourceSharingMessages[locale];
  const origin = useBrowserOrigin();
  const path = skillVersionPath(packageId, version.id);
  const apiBase = `/api/v1/skill-packages/${packageId}/versions/${version.id}`;
  return (
    <div className="space-y-5">
      <ImportVersion
        locale={locale}
        reference={{
          source_package_id: packageId,
          source_version_id: version.id,
          expected_digest: version.digest,
        }}
      />
      <p className="text-xs text-[color:var(--ol-muted)]">{c.importHint}</p>
      <CopyContent
        locale={locale}
        label={c.copyReference}
        value={origin ? `${origin}${path}#sha256=${version.digest}` : ""}
      />
      <CopyContent
        locale={locale}
        compact
        label={c.copyLink}
        value={origin ? `${origin}${path}` : ""}
      />
      <div className="flex flex-wrap gap-2">
        <a className="ol-mini-btn" href={`${apiBase}/archive.zip`} download>
          {c.zip}
        </a>
        <a className="ol-mini-btn" href={`${apiBase}/bundle.json`} download>
          {c.bundle}
        </a>
      </div>
      <CopyContent
        locale={locale}
        compact
        label={c.copyRaw}
        value={origin ? `${origin}${apiBase}/files/SKILL.md` : ""}
      />
    </div>
  );
}
type Reference = ReturnType<typeof parseSkillReference>;
function ImportVersion({
  locale,
  reference,
}: {
  locale: Locale;
  reference: Reference;
}) {
  const c = resourceSharingMessages[locale];
  const api = useApi();
  const router = useRouter();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!api.isAuthenticated)
    return (
      <AuthLink href="/login" className="ol-mini-btn bg-[color:var(--ol-primary)]! text-white!">
        {c.login}
      </AuthLink>
    );
  return (
    <div>
      <button
        className="ol-mini-btn bg-[color:var(--ol-primary)]! text-white!"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await api.fetch<{ id: string }>(
              "/api/v1/creator/skill-packages/imports",
              { method: "POST", body: reference },
            );
            await cache.invalidateQueries({ queryKey: ["skill-packages"] });
            toast.success(c.imported);
            router.push(`/hub/skills/${result.id}`);
          } catch (e) {
            setError(skillPackageErrorText(e, locale, c.failed));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? c.importing : c.import}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
export function SkillReferenceImport({ locale }: { locale: Locale }) {
  const c = resourceSharingMessages[locale];
  const [value, setValue] = useState("");
  const [reference, setReference] = useState<Reference | null>(null);
  const [error, setError] = useState("");
  return (
    <details className="rounded-xl border border-[color:var(--ol-line)] p-4">
      <summary className="cursor-pointer font-bold">{c.referenceTitle}</summary>
      <p className="my-3 text-sm text-[color:var(--ol-muted)]">
        {c.referenceHint}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            setReference(parseSkillReference(value, window.location.origin));
            setError("");
          } catch {
            setReference(null);
            setError(c.referenceInvalid);
          }
        }}
        className="flex flex-wrap gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{c.referenceTitle}</span>
          <input
            required
            className={inputClass}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setReference(null);
              setError("");
            }}
          />
        </label>
        <button className="ol-mini-btn">{c.detail}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {reference && (
        <div className="mt-4 space-y-3">
          <Link
            className="underline"
            href={skillVersionPath(
              reference.source_package_id,
              reference.source_version_id,
            )}
          >
            {c.detail}
          </Link>
          <ImportVersion locale={locale} reference={reference} />
        </div>
      )}
    </details>
  );
}
export function SkillPublicationControls({
  item,
  version,
  contents,
  locale,
}: {
  item: SkillPackage;
  version: SkillPackageVersion;
  contents: SkillPackageContents;
  locale: Locale;
}) {
  const c = resourceSharingMessages[locale];
  const api = useApi();
  const cache = useQueryClient();
  const [visibility, setVisibility] = useState(item.visibility ?? "private");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api.fetch(path, { method, body });
      await cache.invalidateQueries({ queryKey: ["skill-packages"] });
      setConfirmed(false);
    } catch (e) {
      setError(skillPackageErrorText(e, locale, c.failed));
    } finally {
      setBusy(false);
    }
  }
  const base = `/api/v1/creator/skill-packages/${item.id}`;
  return (
    <section className="space-y-4 rounded-xl border border-[color:var(--ol-line)] p-5">
      <h2 className="font-bold">{c.visibility}</h2>
      {item.source_package_id && version.source_version_id && (
        <div className="text-sm">
          <Link className="underline" href={skillVersionPath(item.source_package_id, version.source_version_id)}>{c.importedFrom}</Link>
          <p className="mt-1 text-xs text-[color:var(--ol-muted)]">{c.sourceHint}</p>
        </div>
      )}
      <p className="text-sm text-[color:var(--ol-muted)]">{c.publishHint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="sr-only">{c.visibility}</span>
          <select
            className={inputClass}
            value={visibility}
            disabled={busy}
            onChange={(e) => {
              setVisibility(e.target.value as typeof visibility);
              setConfirmed(false);
            }}
          >
            {(["private", "unlisted", "public"] as const).map((v) => (
              <option key={v} value={v}>
                {c[v]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ol-mini-btn"
          disabled={
            busy ||
            visibility === (item.visibility ?? "private") ||
            (visibility !== "private" && !confirmed)
          }
          onClick={() => void mutate(base, "PATCH", { visibility })}
        >
          {busy ? c.publishing : c.save}
        </button>
      </div>
      <p className="text-sm font-semibold">
        {version.version} · {version.published_at ? c.published : c.unpublished}
      </p>
      <details>
        <summary className="cursor-pointer text-sm">
          {c.publishedFiles} ({Object.keys(contents.files).length})
        </summary>
        <ul className="mt-2 list-disc pl-5 text-xs">
          {Object.keys(contents.files)
            .sort()
            .map((f) => (
              <li key={f}>{f}</li>
            ))}
        </ul>
      </details>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        {c.confirm}
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="ol-mini-btn"
          disabled={busy || (!version.published_at && !confirmed)}
          onClick={() =>
            void mutate(
              `${base}/versions/${version.id}/publication`,
              version.published_at ? "DELETE" : "PUT",
              version.published_at ? undefined : {},
            )
          }
        >
          {version.published_at ? c.withdraw : c.publish}
        </button>
        {version.published_at && item.visibility !== "private" && (
          <Link
            className="ol-mini-btn"
            href={skillVersionPath(item.id, version.id)}
          >
            {c.openPublic}
          </Link>
        )}
      </div>
      <p className="text-xs text-[color:var(--ol-muted)]">{c.withdrawHint}</p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
