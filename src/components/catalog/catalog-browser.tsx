"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { getApiBaseUrlForPath } from "@/lib/api-root";
import { catalogErrorText } from "@/lib/catalog-errors";
import type { Locale } from "@/lib/i18n";
import {
  catalogEntryPath,
  catalogQueryKey,
  catalogFilePath,
  catalogListPath,
  draftErrorKey,
  entryModeKey,
  importPayload,
  licenseText,
  registrationPayload,
  remoteTransportKey,
  serverCard,
  type CatalogKind,
} from "@/lib/catalog.mjs";
import { catalogMessages } from "@/messages/catalog";
import {
  CatalogPublisher,
  EntryActions,
  ReviewBadge,
  useCatalogMe,
} from "@/components/catalog/catalog-publisher";

type Registry = { name: string; audience: string; personalized: boolean };
type SkillItem = {
  namespace: string;
  name: string;
  description?: string;
  mode?: string;
  status?: string;
  latest_version?: string | null;
};
type ServerItem = {
  name: string;
  mode?: string;
  status?: string;
  version?: string;
  server?: { title?: string; description?: string };
};
type SkillVersion = {
  version: string;
  mode?: string;
  core_compatible?: boolean;
  yanked?: unknown;
  files?: { path: string; size: number }[];
  license?: { kind?: string; id?: string; approved?: boolean };
  artifact?: { digest?: string };
  content_access?: { full_text?: boolean };
  source_url?: string;
  locator?: { kind?: string } | null;
};
type Review = { review?: { state?: string; reason?: string } };
type SkillDetail = SkillItem &
  Review & {
    claimed?: boolean;
    upstream?: string;
    versions?: { version: string; yanked?: boolean }[];
  };
type Draft = {
  server: string;
  version: string;
  name: string;
  slug: string;
  description: string;
  endpoint_url: string;
  mcp_transport: string;
  endpoint_auth_header_name: string;
  remotes: { type: string; url: string }[];
};

const inputClass =
  "w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 py-2 text-sm";
const primaryClass =
  "ol-mini-btn bg-[color:var(--ol-primary)]! text-white! disabled:cursor-not-allowed disabled:opacity-50";

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

type InitialQuery = {
  registry: string;
  q: string;
  entry: { namespace: string; name: string } | null;
};

export function CatalogBrowser(props: {
  locale: Locale;
  kind: CatalogKind;
  registries: Registry[];
  initial?: InitialQuery;
}) {
  const { data, status } = useSession();
  const viewer = status === "loading" ? "" : (data?.user?.id ?? "anonymous");
  if (!viewer) return null;
  return (
    <CatalogView
      key={`${viewer}:${catalogQueryKey(props.initial)}`}
      viewer={viewer}
      {...props}
    />
  );
}

function CatalogView({
  viewer,
  locale,
  kind,
  registries,
  initial,
}: {
  viewer: string;
  locale: Locale;
  kind: CatalogKind;
  registries: Registry[];
  initial?: InitialQuery;
}) {
  const copy = catalogMessages[locale];
  const known = registries.some((r) => r.name === initial?.registry);
  const [registry, setRegistry] = useState(
    known ? initial!.registry : (registries[0]?.name ?? ""),
  );
  const [draftQuery, setDraftQuery] = useState(initial?.q ?? "");
  const [query, setQuery] = useState(initial?.q ?? "");
  const [selected, setSelected] = useState<{
    namespace: string;
    name: string;
  } | null>(known ? (initial?.entry ?? null) : null);
  const { fetch, isAuthenticated, isLoading } = useApi();
  const me = useCatalogMe(registry, viewer);
  const list = useInfiniteQuery({
    queryKey: ["catalog", viewer, kind, registry, query],
    enabled: Boolean(registry) && !isLoading,
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      fetch<{
        skills?: SkillItem[];
        servers?: ServerItem[];
        next_cursor?: string;
        metadata?: { nextCursor?: string };
      }>(catalogListPath(registry, kind, { q: query, cursor: pageParam }), {
        cache: "no-store",
        signOutOnUnauthorized: false,
      }),
    getNextPageParam: (last) =>
      last.next_cursor || last.metadata?.nextCursor || undefined,
  });
  const items = (list.data?.pages ?? []).flatMap((p) =>
    kind === "skills"
      ? (p.skills ?? []).map((s) => ({
          namespace: s.namespace,
          name: s.name,
          title: s.name,
          description: s.description,
          mode: s.mode,
          status: s.status,
        }))
      : (p.servers ?? []).flatMap((s) => {
          const card = serverCard(s);
          return card ? [card] : [];
        }),
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="space-y-4" aria-label={copy.tab}>
        {me.data && (
          <CatalogPublisher
            key={`${registry}/${kind}`}
            locale={locale}
            kind={kind}
            registry={registry}
            viewer={viewer}
            me={me.data}
          />
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draftQuery.trim());
            setSelected(null);
          }}
        >
          {registries.length > 1 && (
            <select
              aria-label={copy.tab}
              className={`${inputClass} max-w-40`}
              value={registry}
              onChange={(e) => {
                setRegistry(e.target.value);
                setSelected(null);
              }}
            >
              {registries.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <input
            className={inputClass}
            value={draftQuery}
            placeholder={copy.search}
            aria-label={copy.search}
            onChange={(e) => setDraftQuery(e.target.value)}
          />
          <button
            className="ol-mini-btn"
            type="submit"
            aria-label={copy.search}
          >
            <Search size={15} />
          </button>
        </form>
        {list.isError && (
          <p className="text-sm text-[color:var(--ol-muted)]">
            {copy.unavailable}
          </p>
        )}
        {list.isSuccess && items.length === 0 && (
          <p className="text-sm text-[color:var(--ol-muted)]">{copy.empty}</p>
        )}
        <ul className="space-y-2">
          {items.map((item) => {
            const active =
              selected?.namespace === item.namespace &&
              selected?.name === item.name;
            const mode = entryModeKey(item);
            return (
              <li key={`${item.namespace}/${item.name}`}>
                <button
                  type="button"
                  aria-pressed={active}
                  className={`ol-panel w-full p-4 text-left ${active ? "ring-2 ring-[color:var(--ol-primary)]" : ""}`}
                  onClick={() =>
                    setSelected({ namespace: item.namespace, name: item.name })
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{item.title}</span>
                    {mode && <span className="ol-chip">{copy[mode]}</span>}
                    {(item.status === "deprecated" ||
                      item.status === "deleted") && (
                      <span className="ol-chip">{copy[item.status]}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--ol-muted)]">
                    {item.namespace}
                  </div>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--ol-muted)]">
                      {item.description}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {list.hasNextPage && (
          <button
            className="ol-mini-btn"
            type="button"
            disabled={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
          >
            {copy.more}
          </button>
        )}
      </section>
      <section aria-live="polite">
        {selected &&
          (kind === "skills" ? (
            <SkillPanel
              key={`${registry}/${selected.namespace}/${selected.name}`}
              locale={locale}
              registry={registry}
              entry={selected}
              signedIn={isAuthenticated}
              viewer={viewer}
              onMoved={setSelected}
            />
          ) : (
            <ServerPanel
              key={`${registry}/${selected.namespace}/${selected.name}`}
              locale={locale}
              registry={registry}
              entry={selected}
              signedIn={isAuthenticated}
              viewer={viewer}
            />
          ))}
      </section>
    </div>
  );
}

function SkillPanel({
  locale,
  registry,
  entry,
  signedIn,
  viewer,
  onMoved,
}: {
  locale: Locale;
  registry: string;
  entry: { namespace: string; name: string };
  signedIn: boolean;
  viewer: string;
  onMoved: (entry: { namespace: string; name: string }) => void;
}) {
  const copy = catalogMessages[locale];
  const { fetch, token } = useApi();
  const [version, setVersion] = useState("");
  const [file, setFile] = useState("");
  const [providers, setProviders] = useState<string[]>(["codex"]);
  const [imported, setImported] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const detail = useQuery({
    queryKey: [viewer, "catalog-skill", registry, entry.namespace, entry.name],
    queryFn: () =>
      fetch<SkillDetail>(
        catalogEntryPath(registry, "skills", entry.namespace, entry.name),
        { cache: "no-store", signOutOnUnauthorized: false },
      ),
  });
  const versions = (detail.data?.versions ?? []).filter((v) => !v.yanked);
  const current =
    version || detail.data?.latest_version || versions[0]?.version || "";
  const ver = useQuery({
    queryKey: [
      viewer,
      "catalog-skill-version",
      registry,
      entry.namespace,
      entry.name,
      current,
    ],
    enabled: Boolean(current),
    queryFn: () =>
      fetch<SkillVersion>(
        catalogEntryPath(
          registry,
          "skills",
          entry.namespace,
          entry.name,
          current,
        ),
        { cache: "no-store", signOutOnUnauthorized: false },
      ),
  });
  const text = useQuery({
    queryKey: [
      viewer,
      "catalog-skill-file",
      registry,
      entry.namespace,
      entry.name,
      current,
      file,
    ],
    enabled: Boolean(current && file),
    queryFn: async () => {
      const path = catalogFilePath(
        registry,
        entry.namespace,
        entry.name,
        current,
        file,
      );
      const res = await window.fetch(
        `${getApiBaseUrlForPath(path, "GET")}${path}`,
        {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      if (!res.ok) throw new Error(copy.content);
      return res.text();
    },
  });
  if (detail.isError)
    return (
      <p className="text-sm text-[color:var(--ol-muted)]">{copy.unavailable}</p>
    );
  if (!detail.data) return null;
  const v = ver.data;
  const license = v ? licenseText(v.license) : null;
  const redistributable =
    v?.license?.kind === "spdx" ||
    (v?.license?.kind === "custom" && v.license.approved);
  const runImport = async () => {
    if (!v?.artifact?.digest) return;
    setBusy(true);
    try {
      const res = await fetch<{ id: string }>(
        "/api/v1/creator/skill-packages/registry-imports",
        {
          method: "POST",
          body: importPayload({
            registry,
            namespace: entry.namespace,
            name: entry.name,
            version: current,
            digest: v.artifact.digest,
            providers,
          }),
        },
      );
      setImported(res.id);
      toast.success(copy.imported);
    } catch (error) {
      toast.error(catalogErrorText(error, locale, copy.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="ol-panel space-y-5 p-6">
      <header>
        <h2 className="text-xl font-black">{detail.data.name}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ol-muted)]">
          {entry.namespace}
          <ReviewBadge locale={locale} entry={detail.data} />
        </div>
        {detail.data.description && (
          <p className="mt-3 text-sm text-[color:var(--ol-muted)]">
            {detail.data.description}
          </p>
        )}
      </header>
      {versions.length > 0 && (
        <select
          className={`${inputClass} max-w-48`}
          aria-label={copy.versions}
          value={current}
          onChange={(e) => {
            setVersion(e.target.value);
            setFile("");
            setImported("");
          }}
        >
          {versions.map((x) => (
            <option key={x.version} value={x.version}>
              {x.version}
            </option>
          ))}
        </select>
      )}
      {ver.isError && (
        <p className="text-sm text-[color:var(--ol-muted)]">
          {copy.unavailable}
        </p>
      )}
      {v && (
        <>
          <div className="flex flex-wrap gap-2">
            {entryModeKey(v) && (
              <span className="ol-chip">{copy[entryModeKey(v)!]}</span>
            )}
            <span className="ol-chip">
              {license ? `${copy.license}: ${license}` : copy.licenseUnknown}
            </span>
            {v.core_compatible === false && (
              <span className="ol-chip">{copy.incompatible}</span>
            )}
            {v.source_url && (
              <a
                className="ol-chip"
                href={v.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.source}
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
          {(v.files ?? []).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">{copy.files}</h3>
              <ul className="flex flex-wrap gap-2">
                {(v.files ?? []).map((f) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      className={`ol-chip ${file === f.path ? "active" : ""}`}
                      onClick={() => setFile(f.path)}
                      disabled={!v.content_access?.full_text}
                    >
                      {f.path}
                    </button>
                  </li>
                ))}
              </ul>
              {file && (
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-[color:var(--ol-surface-2,#f6f7f9)] p-4 text-xs whitespace-pre-wrap">
                  {text.isError ? copy.content : (text.data ?? "")}
                </pre>
              )}
            </div>
          )}
          <div className="space-y-3 border-t border-[color:var(--ol-line)] pt-4">
            {!signedIn ? (
              <p className="text-sm text-[color:var(--ol-muted)]">
                {copy.signIn}
              </p>
            ) : imported ? (
              <Link className={primaryClass} href={`/hub/skills/${imported}`}>
                {copy.openLibrary}
                <ArrowUpRight size={15} />
              </Link>
            ) : (
              <>
                <fieldset className="flex gap-4 text-sm">
                  <legend className="sr-only">{copy.providers}</legend>
                  {["codex", "claude"].map((p) => (
                    <label key={p} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={providers.includes(p)}
                        onChange={(e) =>
                          setProviders(
                            e.target.checked
                              ? [...providers, p]
                              : providers.filter((x) => x !== p),
                          )
                        }
                      />
                      {p === "codex" ? "Codex" : "Claude"}
                    </label>
                  ))}
                </fieldset>
                {!redistributable && (
                  <p className="text-xs text-[color:var(--ol-muted)]">
                    {copy.privateOnly}
                  </p>
                )}
                <button
                  className={primaryClass}
                  type="button"
                  disabled={
                    busy ||
                    providers.length === 0 ||
                    v.core_compatible === false ||
                    Boolean(v.yanked)
                  }
                  onClick={runImport}
                >
                  {busy ? copy.importing : copy.import}
                </button>
              </>
            )}
          </div>
        </>
      )}
      {signedIn && (
        <EntryActions
          locale={locale}
          registry={registry}
          viewer={viewer}
          kind="skills"
          entry={entry}
          detail={{ ...detail.data, locator: ver.data?.locator }}
          onMoved={onMoved}
        />
      )}
    </article>
  );
}

function ServerPanel({
  locale,
  registry,
  entry,
  signedIn,
  viewer,
}: {
  locale: Locale;
  registry: string;
  entry: { namespace: string; name: string };
  signedIn: boolean;
  viewer: string;
}) {
  const copy = catalogMessages[locale];
  const { fetch } = useApi();
  const [form, setForm] = useState({
    slug: "",
    name: "",
    tags: "",
    toolName: "",
    credential: "",
  });
  const [tools, setTools] = useState<string[]>([]);
  const [agentId, setAgentId] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = useQuery({
    queryKey: [viewer, "catalog-server", registry, entry.namespace, entry.name],
    queryFn: () =>
      fetch<{
        version: string;
        status: string;
        review?: { state?: string; reason?: string };
        server: {
          title?: string;
          description?: string;
          remotes?: { type: string; url: string }[];
          packages?: unknown[];
        };
      }>(
        catalogEntryPath(
          registry,
          "mcp",
          entry.namespace,
          entry.name,
          "latest",
        ),
        { cache: "no-store", signOutOnUnauthorized: false },
      ),
  });
  const draft = useQuery({
    queryKey: [
      viewer,
      "catalog-draft",
      registry,
      entry.namespace,
      entry.name,
      latest.data?.version,
      signedIn,
    ],
    enabled: signedIn && Boolean(latest.data?.version),
    retry: false,
    queryFn: async () => {
      const d = await fetch<Draft>(
        `${catalogEntryPath(registry, "mcp", entry.namespace, entry.name, latest.data!.version)}/registration-draft`,
        { cache: "no-store" },
      );
      setForm((f) => ({
        ...f,
        slug: f.slug || d.slug,
        name: f.name || d.name,
      }));
      return d;
    },
  });
  if (latest.isError)
    return (
      <p className="text-sm text-[color:var(--ol-muted)]">{copy.unavailable}</p>
    );
  if (!latest.data) return null;
  const s = latest.data.server;
  const inactive =
    latest.data.status === "deprecated" || latest.data.status === "deleted";
  const draftCode = errorCode(draft.error);
  const base = catalogEntryPath(
    registry,
    "mcp",
    entry.namespace,
    entry.name,
    latest.data.version,
  );
  const discover = async () => {
    if (!draft.data) return;
    try {
      const res = await fetch<{ tools: { name: string }[] }>(
        "/api/v1/creator/agents/mcp-tools/discover",
        {
          method: "POST",
          body: {
            endpoint_url: draft.data.endpoint_url,
            mcp_transport: draft.data.mcp_transport,
            endpoint_auth_header: form.credential.trim(),
            endpoint_auth_header_name: draft.data.endpoint_auth_header_name,
          },
        },
      );
      setTools(res.tools.map((t) => t.name));
      if (!form.toolName && res.tools[0])
        setForm((f) => ({ ...f, toolName: res.tools[0].name }));
    } catch (error) {
      toast.error(catalogErrorText(error, locale, copy.failed));
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch<{ agent: { id: string } }>(
        `${base}/registrations`,
        { method: "POST", body: registrationPayload(form) },
      );
      setAgentId(res.agent.id);
      toast.success(copy.registered);
    } catch (error) {
      toast.error(catalogErrorText(error, locale, copy.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="ol-panel space-y-5 p-6">
      <header>
        <h2 className="text-xl font-black">
          {s.title || `${entry.namespace}/${entry.name}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ol-muted)]">
          {entry.namespace}/{entry.name} · {latest.data.version}
          <ReviewBadge locale={locale} entry={latest.data} />
        </div>
        {s.description && (
          <p className="mt-3 text-sm text-[color:var(--ol-muted)]">
            {s.description}
          </p>
        )}
      </header>
      <ul className="space-y-2 text-sm">
        {(s.remotes ?? []).map((r) => {
          const t = remoteTransportKey(r.type);
          return (
            <li
              key={`${r.type}-${r.url}`}
              className="flex flex-wrap items-center gap-2"
            >
              {t && <span className="ol-chip">{copy[t]}</span>}
              <code className="break-all">{r.url}</code>
            </li>
          );
        })}
      </ul>
      {inactive && <p className="text-sm font-bold">{copy.inactive}</p>}
      {!inactive && draft.isError && (
        <p className="text-sm text-[color:var(--ol-muted)]">
          {copy[draftErrorKey(draftCode)]}
        </p>
      )}
      <div className="space-y-3 border-t border-[color:var(--ol-line)] pt-4">
        {!signedIn ? (
          <p className="text-sm text-[color:var(--ol-muted)]">{copy.signIn}</p>
        ) : agentId ? (
          <Link
            className={primaryClass}
            href={`/hub/agents/${agentId}/settings`}
          >
            {copy.openAgent}
            <ArrowUpRight size={15} />
          </Link>
        ) : draft.data && !inactive ? (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              className={inputClass}
              aria-label={copy.slug}
              placeholder={copy.slug}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
            <input
              className={inputClass}
              aria-label={copy.name}
              placeholder={copy.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={inputClass}
              aria-label={copy.tags}
              placeholder={copy.tags}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              required
            />
            {draft.data.endpoint_auth_header_name && (
              <input
                className={inputClass}
                type="password"
                autoComplete="off"
                aria-label={`${copy.credential} (${draft.data.endpoint_auth_header_name})`}
                placeholder={`${draft.data.endpoint_auth_header_name}`}
                value={form.credential}
                onChange={(e) =>
                  setForm({ ...form, credential: e.target.value })
                }
              />
            )}
            <div className="flex gap-2">
              <input
                className={inputClass}
                list={`tools-${entry.name}`}
                aria-label={copy.tool}
                placeholder={copy.tool}
                value={form.toolName}
                onChange={(e) => setForm({ ...form, toolName: e.target.value })}
                required
              />
              <datalist id={`tools-${entry.name}`}>
                {tools.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <button
                className="ol-mini-btn shrink-0"
                type="button"
                onClick={discover}
              >
                {copy.discover}
              </button>
            </div>
            <button className={primaryClass} type="submit" disabled={busy}>
              {busy ? copy.registering : copy.submit}
            </button>
          </form>
        ) : null}
      </div>
      {signedIn && (
        <EntryActions
          locale={locale}
          registry={registry}
          viewer={viewer}
          kind="mcp"
          entry={entry}
          detail={undefined}
        />
      )}
    </article>
  );
}
