import Link from "next/link";
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
}: {
  locale: Locale;
  mcp?: boolean;
  query?: string;
  page?: number;
}) {
  const c = resourceSharingMessages[locale];
  const current =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const params = new URLSearchParams({
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
    data = await apiFetch(
      mcp
        ? `/api/v1/mcp-services?${params}`
        : `/api/v1/skill-packages?${params}`,
      { cache: "no-store" },
    );
  } catch {}
  const path = mcp ? "/mcps" : "/skills";
  const pageURL = (n: number) =>
    `${path}?${new URLSearchParams({ ...(!mcp ? { tab: "packages" } : {}), q: query, page: String(n) })}`;
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
          href="/mcps/platform"
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
      <form action={path} className="flex gap-3">
        {!mcp && <input type="hidden" name="tab" value="packages" />}
        <label className="min-w-0 flex-1">
          <span className="sr-only">{c.query}</span>
          <input
            name="q"
            defaultValue={query}
            placeholder={c.query}
            maxLength={200}
            className="w-full rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-surface)] p-3 text-sm"
          />
        </label>
        <button className="ol-mini-btn shrink-0">{c.search}</button>
      </form>
      {!data ? (
        <div className="ol-panel p-8" role="alert">
          <p>{c.failed}</p>
          <Link className="ol-mini-btn mt-4" href={pageURL(current)}>
            {c.retry}
          </Link>
        </div>
      ) : !data.items.length ? (
        <div className="ol-panel p-10 text-center">
          <h2 className="text-lg font-bold">{mcp ? c.mcpEmpty : c.empty}</h2>
          <p className="mt-3 text-sm text-[color:var(--ol-muted)]">
            {mcp ? c.mcpEmptyHint : c.emptyHint}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={
                mcp
                  ? `/mcps/services/${encodeURIComponent(item.slug ?? "")}`
                  : `/skills/packages/${item.id}`
              }
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
              <div className="mt-5 flex flex-wrap gap-2">
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
          aria-label={c.browse}
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
