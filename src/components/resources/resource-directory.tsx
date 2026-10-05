import Link from "next/link";
import { resourceMetadataMessages } from "@/messages/resource-metadata";
import {
  resourceReturnPath,
  withResourceReturn,
} from "@/lib/resource-sharing.mjs";
import { resourceUseMessages } from "@/messages/resource-use";
import { Package, Plug, ArrowUpRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { SkillPackage } from "@/lib/skill-packages";
import { resourceSharingMessages } from "@/messages/resource-sharing";
type Entry = SkillPackage & { slug?: string; mcp_tool_name?: string };
export async function ResourceDirectory({
  locale,
  mcp = false,
  query = "",
  page = 1,
  provider = "",
  capability = "",
  tag = "",
  sort = "newest",
  invalidFilters = false,
}: {
  locale: Locale;
  mcp?: boolean;
  query?: string;
  page?: number;
  provider?: string;
  capability?: string;
  tag?: string;
  sort?: string;
  invalidFilters?: boolean;
}) {
  const c = resourceSharingMessages[locale];
  const m = resourceMetadataMessages[locale];
  const filtered = Boolean(query || provider || capability || tag);
  const filters = { capability, sort, ...(mcp ? { tag } : { provider }) };
  const u = resourceUseMessages[locale];
  const current =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const params = new URLSearchParams({
    ...filters,
    q: query,
    page: String(current),
    size: "12",
  });
  let data: {
    items: Entry[];
    total: number;
    page: number;
    size: number;
  } | null = null;
  try {
    if (!invalidFilters)
      data = await apiFetch(
        mcp
          ? `/api/v1/mcp-services?${params}`
          : `/api/v1/skill-packages?${params}`,
        { cache: "no-store" },
      );
  } catch {}
  const path = mcp ? "/mcps" : "/skills";
  const pageURL = (n: number) =>
    `${path}?${new URLSearchParams({ ...(!mcp ? { tab: "packages" } : {}), ...filters, q: query, page: String(n) })}`;
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-[color:var(--ol-muted)]">
          {mcp ? c.mcpLead : c.lead}
        </p>
        <Link className="ol-mini-btn" href={mcp ? "/publish" : "/hub/skills"}>
          {mcp ? c.register : c.manage}
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {mcp && (
        <Link
          href={withResourceReturn(
            "/mcps/platform",
            resourceReturnPath(pageURL(current), true),
          )}
          className="ol-panel flex items-center gap-5 p-6"
        >
          <Plug className="shrink-0 text-[color:var(--ol-primary)]" size={30} />
          <div>
            <h2 className="font-bold">{c.platform}</h2>
            <p className="mt-1 text-sm text-[color:var(--ol-muted)]">
              {c.platformHint}
            </p>
          </div>
          <ArrowUpRight className="ml-auto shrink-0" size={18} />
        </Link>
      )}
      <form
        action={path}
        className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(180px,1fr)_auto_minmax(180px,1fr)_auto_auto_auto]"
      >
        {!mcp && <input type="hidden" name="tab" value="packages" />}
        <label className="col-span-2 min-w-0 lg:col-span-1">
          <span className="sr-only">{c.query}</span>
          <input
            key={query}
            name="q"
            defaultValue={query}
            placeholder={c.query}
            maxLength={200}
            className="w-full rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-3 text-sm"
          />
        </label>
        {!mcp && (
          <label className="min-w-0 space-y-1">
            <span className="block text-xs">{m.provider}</span>
            <select
              key={provider}
              name="provider"
              defaultValue={provider}
              className="rounded-xl border border-[color:var(--ol-line)] p-3 text-sm"
            >
              <option value="">{m.all}</option>
              <option value="codex">{m.codex}</option>
              <option value="claude">{m.claude}</option>
            </select>
          </label>
        )}
        <label className="min-w-0 space-y-1">
          <span className="block text-xs">{m.capability}</span>
          <input
            name="capability"
            key={capability}
            defaultValue={capability}
            maxLength={200}
            placeholder={m.capabilityExample}
            className="w-full rounded-xl border border-[color:var(--ol-line)] p-3 text-sm"
          />
        </label>
        {mcp && (
          <label className="min-w-0 space-y-1">
            <span className="block text-xs">{m.tag}</span>
            <input
              key={tag}
              name="tag"
              defaultValue={tag}
              maxLength={100}
              className="w-full rounded-xl border border-[color:var(--ol-line)] p-3 text-sm"
            />
          </label>
        )}
        <label className="min-w-0 space-y-1">
          <span className="block text-xs">{m.sort}</span>
          <select
            key={sort}
            name="sort"
            defaultValue={sort}
            className="rounded-xl border border-[color:var(--ol-line)] p-3 text-sm"
          >
            <option value="newest">{m.newest}</option>
            <option value="name">{m.name}</option>
          </select>
        </label>
        <button className="ol-mini-btn shrink-0">{c.search}</button>
        {(filtered || invalidFilters || sort !== "newest") && (
          <Link
            href={mcp ? "/mcps" : "/skills?tab=packages"}
            className="ol-mini-btn shrink-0"
          >
            {m.reset}
          </Link>
        )}
      </form>
      <p className="text-xs text-[color:var(--ol-muted)]">{m.filterHint}</p>
      {invalidFilters ? (
        <div className="ol-panel p-8" role="alert">
          <p>{m.invalidFilters}</p>
        </div>
      ) : !data ? (
        <div className="ol-panel p-8" role="alert">
          <p>{c.failed}</p>
          <Link className="ol-mini-btn mt-4" href={pageURL(current)}>
            {c.retry}
          </Link>
        </div>
      ) : !data.items.length ? (
        <div className="ol-panel p-10 text-center">
          <h2 className="text-lg font-bold">
            {filtered || current > 1 ? u.noResults : mcp ? c.mcpEmpty : c.empty}
          </h2>
          <p className="mt-3 text-sm text-[color:var(--ol-muted)]">
            {filtered || current > 1
              ? u.noResultsHint
              : mcp
                ? c.mcpEmptyHint
                : c.emptyHint}
          </p>
          {(filtered || current > 1) && (
            <Link
              href={mcp ? "/mcps" : "/skills?tab=packages"}
              className="ol-mini-btn mt-4"
            >
              {c.returnDirectory}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={withResourceReturn(
                mcp
                  ? `/mcps/services/${encodeURIComponent(item.slug ?? "")}`
                  : `/skills/packages/${item.id}`,
                resourceReturnPath(pageURL(current), mcp),
              )}
              className="ol-panel min-w-0 p-6 transition hover:border-[color:var(--ol-primary)]"
            >
              <div className="mb-5 flex items-center justify-between">
                {mcp ? <Plug size={23} /> : <Package size={23} />}
                <span className="ol-chip">
                  {mcp ? "MCP" : item.versions[0]?.version}
                </span>
              </div>
              <h2 className="break-words text-lg font-bold">{item.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--ol-muted)]">
                {item.description}
              </p>
              {!mcp && item.metadata?.publisher_name && (
                <p className="mt-3 break-words text-xs text-[color:var(--ol-muted)]">
                  {m.publisher_name}: {item.metadata.publisher_name}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {mcp && item.mcp_tool_name && (
                  <code className="break-all text-xs text-[color:var(--ol-muted)]">
                    {item.mcp_tool_name}
                  </code>
                )}
                {!mcp &&
                  item.versions[0]?.providers.map((p) => (
                    <span key={p} className="ol-chip">
                      {p}
                    </span>
                  ))}
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--ol-primary)]">
                {c.detail}
                <ArrowUpRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      )}
      {data && data.total > 12 && (
        <nav
          aria-label={mcp ? u.mcpBrowse : c.browse}
          className="flex items-center justify-between"
        >
          {current > 1 ? (
            <Link className="ol-mini-btn" href={pageURL(current - 1)}>
              {c.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm">
            {current} / {Math.ceil(data.total / 12)}
          </span>
          {current * 12 < data.total ? (
            <Link className="ol-mini-btn" href={pageURL(current + 1)}>
              {c.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
