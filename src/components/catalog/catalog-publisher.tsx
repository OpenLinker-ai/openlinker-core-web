"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { catalogErrorText } from "@/lib/catalog-errors";
import type { Locale } from "@/lib/i18n";
import {
  REPORT_CATEGORIES,
  canClaim,
  catalogWritePath,
  handleNamespace,
  reportPayload,
  reviewKey,
  uploadContentType,
  type CatalogKind,
} from "@/lib/catalog.mjs";
import { catalogMessages } from "@/messages/catalog";

export type CatalogMe = {
  writes: boolean;
  github: boolean;
  namespaces: { name: string; role: string }[];
};

const inputClass =
  "w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 py-2 text-sm";
const primaryClass =
  "ol-mini-btn bg-[color:var(--ol-primary)]! text-white! disabled:cursor-not-allowed disabled:opacity-50";

export function useCatalogMe(registry: string, viewer: string) {
  const { fetch, isAuthenticated } = useApi();
  return useQuery({
    queryKey: [viewer, "catalog-me", registry],
    enabled: Boolean(registry) && isAuthenticated,
    retry: false,
    queryFn: () =>
      fetch<CatalogMe>(catalogWritePath(registry, "me"), {
        cache: "no-store",
        signOutOnUnauthorized: false,
      }),
  });
}

function publishable(me: CatalogMe) {
  return me.namespaces
    .filter((n) => n.role === "owner" || n.role === "publisher")
    .map((n) => n.name);
}

export function CatalogPublisher({
  locale,
  kind,
  registry,
  viewer,
  me,
}: {
  locale: Locale;
  kind: CatalogKind;
  registry: string;
  viewer: string;
  me: CatalogMe;
}) {
  const copy = catalogMessages[locale];
  const { fetch } = useApi();
  const client = useQueryClient();
  const spaces = publishable(me);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [login, setLogin] = useState("");
  const [namespace, setNamespace] = useState(spaces[0] ?? "");
  const [skill, setSkill] = useState({ name: "", version: "", license: "" });
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [preview, setPreview] = useState<{
    commit: string;
    tree_sha: string;
    name?: string;
  } | null>(null);
  const [serverJson, setServerJson] = useState("");
  const [indexed, setIndexed] = useState(false);
  const ns = namespace || spaces[0] || "";
  const refresh = () => client.invalidateQueries({ queryKey: [viewer] });
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      await refresh();
    } catch (error) {
      toast.error(catalogErrorText(error, locale, copy.failed));
    } finally {
      setBusy(false);
    }
  };
  const claimNamespace = (name: string | null) =>
    run(async () => {
      if (!name)
        throw Object.assign(new Error("handle"), {
          code: "CATALOG_NAMESPACE_NOT_CLAIMABLE",
        });
      await fetch(catalogWritePath(registry, "namespaces"), {
        method: "POST",
        body: { name },
      });
    }, copy.claimed);
  const hasHandle = me.namespaces.some((n) =>
    n.name.startsWith("ai.openlinker."),
  );
  const hasGithub = me.namespaces.some((n) => n.name.startsWith("io.github."));
  return (
    <details className="ol-panel p-4">
      <summary className="cursor-pointer text-sm font-bold">
        {copy.publish}
      </summary>
      <div className="mt-4 space-y-5">
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-[color:var(--ol-muted)]">
            {copy.myNamespaces}
          </h3>
          {me.namespaces.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {me.namespaces.map((n) => (
                <li key={n.name} className="ol-chip">
                  {n.name}
                </li>
              ))}
            </ul>
          )}
          {!hasHandle && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void claimNamespace(handleNamespace(handle));
              }}
            >
              <input
                className={inputClass}
                aria-label={copy.handle}
                placeholder={copy.handle}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
              <button
                className={primaryClass}
                type="submit"
                disabled={busy || !handle.trim()}
              >
                {copy.claimHandle}
              </button>
            </form>
          )}
          {me.github && !hasGithub && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = login.trim().toLowerCase();
                void claimNamespace(value ? `io.github.${value}` : null);
              }}
            >
              <input
                className={inputClass}
                aria-label={copy.githubLogin}
                placeholder={copy.githubLogin}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
              <button
                className="ol-mini-btn"
                type="submit"
                disabled={busy || !login.trim()}
              >
                {copy.githubNamespace}
              </button>
            </form>
          )}
        </section>
        {spaces.length > 0 && (
          <section className="space-y-3 border-t border-[color:var(--ol-line)] pt-4">
            {spaces.length > 1 && (
              <select
                className={inputClass}
                aria-label={copy.namespace}
                value={ns}
                onChange={(e) => setNamespace(e.target.value)}
              >
                {spaces.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            {kind === "skills" ? (
              <>
                <form
                  className="grid gap-2 sm:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const type = file ? uploadContentType(file.name) : null;
                    void run(async () => {
                      if (!file || !type)
                        throw Object.assign(new Error("type"), {
                          code: "CATALOG_CONTENT_TYPE",
                        });
                      await fetch(
                        catalogWritePath(registry, "upload", {
                          namespace: ns,
                          name: skill.name.trim(),
                          version: skill.version.trim(),
                          license: skill.license.trim(),
                        }),
                        {
                          method: "POST",
                          body: new Blob([await file.arrayBuffer()], { type }),
                        },
                      );
                    }, copy.published);
                  }}
                >
                  <input
                    className={inputClass}
                    aria-label={copy.skillName}
                    placeholder={copy.skillName}
                    value={skill.name}
                    onChange={(e) =>
                      setSkill({ ...skill, name: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label={copy.version}
                    placeholder={copy.version}
                    value={skill.version}
                    onChange={(e) =>
                      setSkill({ ...skill, version: e.target.value })
                    }
                  />
                  <input
                    className={inputClass}
                    aria-label={copy.licenseField}
                    placeholder={copy.licenseField}
                    value={skill.license}
                    onChange={(e) =>
                      setSkill({ ...skill, license: e.target.value })
                    }
                  />
                  <input
                    className="text-sm sm:col-span-2"
                    type="file"
                    aria-label={copy.uploadFile}
                    accept=".md,.tar,.tgz,.gz,.zip"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    className={primaryClass}
                    type="submit"
                    disabled={
                      busy ||
                      !file ||
                      !skill.name.trim() ||
                      !skill.version.trim()
                    }
                  >
                    {busy ? copy.uploading : copy.upload}
                  </button>
                </form>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const p = await fetch<{
                        commit: string;
                        tree_sha: string;
                        name?: string;
                      }>(
                        catalogWritePath(registry, "index-preview", {
                          namespace: ns,
                        }),
                        { method: "POST", body: { url: githubUrl.trim() } },
                      );
                      setPreview(p);
                    }, copy.preview);
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      aria-label={copy.githubUrl}
                      placeholder={copy.githubUrl}
                      value={githubUrl}
                      onChange={(e) => {
                        setGithubUrl(e.target.value);
                        setPreview(null);
                      }}
                    />
                    <button
                      className="ol-mini-btn"
                      type="submit"
                      disabled={busy || !githubUrl.trim()}
                    >
                      {copy.preview}
                    </button>
                  </div>
                  {preview && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ol-muted)]">
                      <span className="font-mono">
                        {preview.commit.slice(0, 12)}
                      </span>
                      {(["index", "github-import"] as const).map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={
                            action === "index" ? primaryClass : "ol-mini-btn"
                          }
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await fetch(
                                catalogWritePath(registry, action, {
                                  namespace: ns,
                                }),
                                {
                                  method: "POST",
                                  body: {
                                    url: githubUrl.trim(),
                                    commit: preview.commit,
                                    expected_tree_sha: preview.tree_sha,
                                  },
                                },
                              );
                              setPreview(null);
                            }, copy.published)
                          }
                        >
                          {action === "index" ? copy.indexIt : copy.hostIt}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await fetch(
                      catalogWritePath(registry, "mcp-publish", {
                        namespace: ns,
                        indexed,
                      }),
                      {
                        method: "POST",
                        body: new Blob([serverJson], {
                          type: "application/json",
                        }),
                      },
                    );
                  }, copy.published);
                }}
              >
                <textarea
                  className={`${inputClass} min-h-32 font-mono text-xs`}
                  aria-label={copy.serverJson}
                  placeholder={copy.serverJson}
                  value={serverJson}
                  onChange={(e) => setServerJson(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={indexed}
                    onChange={(e) => setIndexed(e.target.checked)}
                  />
                  {copy.indexedEntry}
                </label>
                <button
                  className={primaryClass}
                  type="submit"
                  disabled={busy || !serverJson.trim()}
                >
                  {copy.publishServer}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </details>
  );
}

export function ReviewBadge({
  locale,
  entry,
}: {
  locale: Locale;
  entry: { review?: { state?: string; reason?: string } } | undefined;
}) {
  const copy = catalogMessages[locale];
  const key = reviewKey(entry);
  if (!key) return null;
  return (
    <span className="ol-chip" title={entry?.review?.reason || undefined}>
      {copy[key]}
      {entry?.review?.reason ? ` · ${entry.review.reason}` : ""}
    </span>
  );
}

export function EntryActions({
  locale,
  registry,
  viewer,
  kind,
  entry,
  detail,
}: {
  locale: Locale;
  registry: string;
  viewer: string;
  kind: CatalogKind;
  entry: { namespace: string; name: string };
  detail: { mode?: string; claimed?: boolean } | undefined;
}) {
  const copy = catalogMessages[locale];
  const { fetch } = useApi();
  const client = useQueryClient();
  const me = useCatalogMe(registry, viewer);
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (!me.data) return null;
  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await client.invalidateQueries({ queryKey: [viewer] });
    } catch (error) {
      toast.error(catalogErrorText(error, locale, copy.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 border-t border-[color:var(--ol-line)] pt-4">
      {kind === "skills" && canClaim(detail, me.data) && (
        <button
          className="ol-mini-btn"
          type="button"
          disabled={busy}
          onClick={() =>
            void act(
              () =>
                fetch(catalogWritePath(registry, "claim", entry), {
                  method: "POST",
                  body: {},
                }),
              copy.claimed,
            )
          }
        >
          {copy.claim}
        </button>
      )}
      {done ? (
        <p className="text-sm text-[color:var(--ol-muted)]">{copy.reported}</p>
      ) : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await fetch(catalogWritePath(registry, "reports"), {
                method: "POST",
                body: reportPayload({
                  kind: kind === "mcp" ? "mcp" : "skill",
                  namespace: entry.namespace,
                  name: entry.name,
                  category,
                  details,
                }),
              });
              setDone(true);
            }, copy.reported);
          }}
        >
          <select
            className={`${inputClass} max-w-48`}
            aria-label={copy.report}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{copy.report}</option>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {copy[`category_${c}`]}
              </option>
            ))}
          </select>
          {category && (
            <input
              className={`${inputClass} max-w-64`}
              aria-label={copy.reportDetails}
              placeholder={copy.reportDetails}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          )}
          {category && (
            <button className="ol-mini-btn" type="submit" disabled={busy}>
              {copy.report}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
