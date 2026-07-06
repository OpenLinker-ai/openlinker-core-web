import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import { certifyAgentAction, rejectCertificationAction, updateAgentModerationAction } from "../actions";
import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminAgentList,
  type AdminSearchParams,
  EmptyState,
  ErrorBox,
  FilterSelect,
  ForbiddenAdmin,
  Pagination,
  Select,
  adminConnectionModeLabel,
  adminCertificationStatusLabel,
  adminStatusLabel,
  adminCopy,
  buildQuery,
  formatDate,
  formatNumber,
  formatUsd,
  getAdminContext,
  offsetForPage,
  pageFromParams,
  pageHref,
  searchValue,
  shortID,
  statusChip,
} from "../_components/shared";

function messageFromError(error: unknown, locale: "zh" | "en", fallback: string): string {
  return localizedErrorMessage(error, locale, fallback);
}

async function loadAgents(params: AdminSearchParams, page: number, locale: "zh" | "en") {
  const agentsPath = `/api/v1/admin/agents${buildQuery({
    q: params.q,
    lifecycle_status: params.lifecycle_status,
    visibility: params.visibility,
    certification_status: params.certification_status,
    limit: ADMIN_PAGE_SIZE,
    offset: offsetForPage(page),
  })}`;
  try {
    return {
      agents: await apiFetchAuthed<AdminAgentList>(agentsPath, { cache: "no-store" }),
      error: null,
    };
  } catch (error) {
    return {
      agents: { items: [], total: 0, limit: ADMIN_PAGE_SIZE, offset: offsetForPage(page) },
      error: messageFromError(
        error,
        locale,
        locale === "zh" ? "Agent 列表加载失败" : "Failed to load Agent list",
      ),
    };
  }
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/agents${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = adminCopy(locale);
  const { agents, error } = await loadAgents(params, page, locale);
  const returnTo = pageHref("/admin/agents", params, page);

  return (
    <AdminShell active="agents" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="ol-panel-head items-start gap-4">
          <div>
            <strong>{copy.agents}</strong>
            <p>
              {formatNumber(agents.total)} {copy.items}
            </p>
          </div>
          <form className="flex flex-wrap gap-2" action="/admin/agents">
            <input
              name="q"
              defaultValue={searchValue(params.q)}
              placeholder={copy.searchAgents}
              className="h-9 w-[220px] rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] outline-none focus:border-[color:var(--ol-primary)]"
            />
            <FilterSelect name="lifecycle_status" value={params.lifecycle_status} options={["", "active", "disabled"]} labels={copy} />
            <FilterSelect name="visibility" value={params.visibility} options={["", "public", "unlisted", "private"]} labels={copy} />
            <FilterSelect
              name="certification_status"
              value={params.certification_status}
              options={["", "unreviewed", "pending", "certified", "rejected"]}
              labels={copy}
            />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
              <Icon name="refresh" size="sm" />
              {copy.apply}
            </button>
            <Link className="ol-mini-btn" href="/admin/agents">
              {copy.reset}
            </Link>
          </form>
        </div>

        {error ? <ErrorBox message={error} /> : null}
        {!error && agents.items.length === 0 ? <EmptyState title={copy.noAgents} body={copy.noAgentsBody} /> : null}
        {!error && agents.items.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1260px] border-separate border-spacing-y-2 text-left text-[13px]">
                <thead className="text-[11px] uppercase text-[color:var(--ol-muted)]">
                  <tr>
                    <th className="px-3 py-2">{copy.agentCol}</th>
                    <th className="px-3 py-2">{copy.creatorCol}</th>
                    <th className="px-3 py-2">{copy.stateCol}</th>
                    <th className="px-3 py-2">{copy.metricsCol}</th>
                    <th className="px-3 py-2">{copy.actionCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.items.map((agent) => (
                    <tr key={agent.id} className="bg-white align-top shadow-sm">
                      <td className="rounded-l-2xl border-y border-l border-[color:var(--ol-line)] px-3 py-3">
                        <div className="font-black text-[color:var(--ol-ink)]">{agent.name}</div>
                        <div className="mt-1 font-mono text-[12px] text-[color:var(--ol-muted)]">/{agent.slug}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {agent.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="ol-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="font-bold text-[color:var(--ol-ink)]">{agent.creator?.display_name ?? "-"}</div>
                        <div className="mt-1 text-[12px] text-[color:var(--ol-muted)]">{agent.creator?.email ?? "-"}</div>
                        <div className="mt-1 font-mono text-[11px] text-[color:var(--ol-subtle)]" title={agent.creator_id}>
                          {shortID(agent.creator_id)}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={statusChip(agent.lifecycle_status)}>{adminStatusLabel(agent.lifecycle_status, locale)}</span>
                          <span className={statusChip(agent.visibility)}>{adminStatusLabel(agent.visibility, locale)}</span>
                          <span className={statusChip(agent.certification_status)}>{adminCertificationStatusLabel(agent.certification_status, locale)}</span>
                        </div>
                        {agent.rejection_reason ? (
                          <div className="mt-2 max-w-[260px] text-[12px] text-[color:var(--ol-muted)]">
                            {agent.rejection_reason}
                          </div>
                        ) : null}
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3 text-[12px] text-[color:var(--ol-muted)]">
                        <div>{formatNumber(agent.total_calls)} {copy.runCount}</div>
                        <div>{formatUsd(agent.total_revenue_cents)}</div>
                        <div>{adminConnectionModeLabel(agent.connection_mode, locale)}</div>
                        <div>
                          {copy.recommended}: {formatNumber(agent.recommended_task_count)}
                        </div>
                        <div>
                          {copy.chosen}: {formatNumber(agent.chosen_task_count)} · {copy.claimed}: {formatNumber(agent.claimed_task_count)}
                        </div>
                        <div>
                          {copy.completed}: {formatNumber(agent.completed_task_count)}
                        </div>
                        {agent.last_run_at ? <div>{copy.lastRun}: {formatDate(agent.last_run_at, locale)}</div> : null}
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-[color:var(--ol-line)] px-3 py-3">
                        <div className="grid min-w-[520px] gap-2">
                          <form action={updateAgentModerationAction} className="grid grid-cols-[1fr_1fr_1fr_1.4fr_auto] gap-2">
                            <input type="hidden" name="id" value={agent.id} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <Select name="lifecycle_status" value={agent.lifecycle_status} options={["active", "disabled"]} labels={copy} />
                            <Select name="visibility" value={agent.visibility} options={["public", "unlisted", "private"]} labels={copy} />
                            <Select
                              name="certification_status"
                              value={agent.certification_status}
                              options={["unreviewed", "pending", "certified", "rejected"]}
                              labels={copy}
                            />
                            <input
                              name="rejection_reason"
                              placeholder={copy.reason}
                              defaultValue={agent.certification_status === "rejected" ? (agent.rejection_reason ?? "") : ""}
                              className="h-9 min-w-0 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] outline-none focus:border-[color:var(--ol-primary)]"
                            />
                            <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
                              <Icon name="check" size="sm" />
                              {copy.save}
                            </button>
                          </form>
                          {agent.certification_status === "pending" ? (
                            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                              <form action={certifyAgentAction}>
                                <input type="hidden" name="id" value={agent.id} />
                                <input type="hidden" name="return_to" value={returnTo} />
                                <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
                                  <Icon name="check" size="sm" />
                                  {copy.pass}
                                </button>
                              </form>
                              <form action={rejectCertificationAction} className="contents">
                                <input type="hidden" name="id" value={agent.id} />
                                <input type="hidden" name="return_to" value={returnTo} />
                                <input
                                  required
                                  name="reason"
                                  maxLength={500}
                                  placeholder={copy.reasonPlaceholder}
                                  className="h-9 min-w-0 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] outline-none focus:border-rose-500"
                                />
                                <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[12px] font-black text-rose-700">
                                  <Icon name="x" size="sm" />
                                  {copy.reject}
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination path="/admin/agents" params={params} page={page} total={agents.total} limit={agents.limit} locale={locale} />
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
