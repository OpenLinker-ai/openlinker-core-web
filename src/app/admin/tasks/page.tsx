import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminSearchParams,
  type AdminTaskList,
  EmptyState,
  ErrorBox,
  ForbiddenAdmin,
  Pagination,
  adminCopy,
  buildQuery,
  formatDate,
  formatNumber,
  getAdminContext,
  offsetForPage,
  pageFromParams,
  searchValue,
  shortID,
  adminDeliveryVisibilityLabel,
  adminStatusLabel,
  statusChip,
} from "../_components/shared";

function messageFromError(error: unknown, locale: "zh" | "en", fallback: string): string {
  return localizedErrorMessage(error, locale, fallback);
}

async function loadTasks(params: AdminSearchParams, page: number, locale: "zh" | "en") {
  const tasksPath = `/api/v1/admin/tasks${buildQuery({
    q: params.q,
    visibility: params.visibility,
    delivery_status: params.delivery_status,
    status: params.task_status,
    limit: ADMIN_PAGE_SIZE,
    offset: offsetForPage(page),
  })}`;
  try {
    return {
      tasks: await apiFetchAuthed<AdminTaskList>(tasksPath, { cache: "no-store" }),
      error: null,
    };
  } catch (error) {
    return {
      tasks: { items: [], total: 0, limit: ADMIN_PAGE_SIZE, offset: offsetForPage(page) },
      error: messageFromError(
        error,
        locale,
        locale === "zh" ? "任务列表加载失败" : "Failed to load task list",
      ),
    };
  }
}

function Filter({
  name,
  value,
  options,
}: {
  name: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      name={name}
      defaultValue={searchValue(value)}
      className="h-9 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-bold text-[color:var(--ol-ink)] outline-none"
    >
      {options.map((option) => (
        <option key={option.value || "all"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/tasks${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = adminCopy(locale);
  const { tasks, error } = await loadTasks(params, page, locale);
  const allLabel = copy.all;
  const taskStatusOptions = [
    { value: "", label: allLabel },
    { value: "open", label: copy.openStatus },
    { value: "matched", label: copy.matched },
    { value: "in_progress", label: copy.in_progress },
    { value: "completed", label: copy.completed },
    { value: "accepted", label: copy.accepted },
    { value: "revision_requested", label: copy.revision_requested },
    { value: "needs_agent", label: copy.needs_agent },
  ];
  const visibilityOptions = [
    { value: "", label: allLabel },
    { value: "private", label: copy.private },
    { value: "public", label: copy.public },
  ];
  const deliveryOptions = [
    { value: "", label: allLabel },
    { value: "pending", label: copy.pending },
    { value: "submitted", label: copy.submitted },
    { value: "revision_requested", label: copy.revision_requested },
    { value: "accepted", label: copy.accepted },
    { value: "failed", label: copy.failed },
  ];

  return (
    <AdminShell active="tasks" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="ol-panel-head items-start gap-4">
          <div>
            <strong>{copy.tasks}</strong>
            <p>
              {formatNumber(tasks.total)} {copy.items}
            </p>
          </div>
          <form className="flex flex-wrap gap-2" action="/admin/tasks">
            <input
              name="q"
              defaultValue={searchValue(params.q)}
              placeholder={copy.searchTasks}
              className="h-9 w-[260px] rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] outline-none focus:border-[color:var(--ol-primary)]"
            />
            <Filter name="visibility" value={params.visibility} options={visibilityOptions} />
            <Filter name="task_status" value={params.task_status} options={taskStatusOptions} />
            <Filter name="delivery_status" value={params.delivery_status} options={deliveryOptions} />
            <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
              <Icon name="refresh" size="sm" />
              {copy.apply}
            </button>
            <Link className="ol-mini-btn" href="/admin/tasks">
              {copy.reset}
            </Link>
          </form>
        </div>

        {error ? <ErrorBox message={error} /> : null}
        {!error && tasks.items.length === 0 ? <EmptyState title={copy.noTasks} body={copy.noTasksBody} /> : null}
        {!error && tasks.items.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1280px] border-separate border-spacing-y-2 text-left text-[13px]">
                <thead className="text-[11px] uppercase text-[color:var(--ol-muted)]">
                  <tr>
                    <th className="px-3 py-2">{copy.taskCol}</th>
                    <th className="px-3 py-2">{copy.ownerCol}</th>
                    <th className="px-3 py-2">{copy.stateCol}</th>
                    <th className="px-3 py-2">{copy.matchCol}</th>
                    <th className="px-3 py-2">{copy.deliveryCol}</th>
                    <th className="px-3 py-2">{copy.createdCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.items.map((task) => (
                    <tr key={task.id} className="bg-white align-top shadow-sm">
                      <td className="rounded-l-2xl border-y border-l border-[color:var(--ol-line)] px-3 py-3">
                        <div className="max-w-[360px] font-black leading-5 text-[color:var(--ol-ink)]">{task.query}</div>
                        {task.public_summary ? (
                          <div className="mt-2 max-w-[360px] text-[12px] leading-5 text-[color:var(--ol-muted)]">
                            {task.public_summary}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.parsed_skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="ol-chip">
                              {skill}
                            </span>
                          ))}
                          {task.mcp_tools.slice(0, 3).map((tool) => (
                            <span key={tool} className="ol-chip ol-chip-blue">
                              {tool}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 font-mono text-[11px] text-[color:var(--ol-subtle)]" title={task.id}>
                          {shortID(task.id)}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="font-bold text-[color:var(--ol-ink)]">{task.user?.display_name ?? "-"}</div>
                        <div className="mt-1 text-[12px] text-[color:var(--ol-muted)]">{task.user?.email ?? "-"}</div>
                        <div className="mt-1 font-mono text-[11px] text-[color:var(--ol-subtle)]" title={task.user_id}>
                          {shortID(task.user_id)}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={statusChip(task.status)}>{adminStatusLabel(task.status, locale)}</span>
                          <span className={statusChip(task.visibility)}>{adminStatusLabel(task.visibility, locale)}</span>
                          <span className={statusChip(task.delivery_status)}>{adminStatusLabel(task.delivery_status, locale)}</span>
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3 text-[12px] text-[color:var(--ol-muted)]">
                        <div>
                          {copy.recommended}: {formatNumber(task.recommended_agent_count)}
                        </div>
                        {task.chosen_agent ? (
                          <div className="mt-1">
                            {copy.chosen}: /{task.chosen_agent.slug}
                          </div>
                        ) : null}
                        {task.claimed_agent ? (
                          <div className="mt-1">
                            {copy.claimed}: /{task.claimed_agent.slug}
                          </div>
                        ) : null}
                        {task.claimed_by ? <div className="mt-1">{task.claimed_by.email}</div> : null}
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3 text-[12px] text-[color:var(--ol-muted)]">
                        <div>{adminDeliveryVisibilityLabel(task.delivery_visibility, locale)}</div>
                        {task.completion_summary ? (
                          <div className="mt-1 max-w-[260px] leading-5">{task.completion_summary}</div>
                        ) : null}
                        {task.revision_note ? <div className="mt-1 max-w-[260px] leading-5">{task.revision_note}</div> : null}
                        {task.completion_run_id ? (
                          <div className="mt-1 font-mono" title={task.completion_run_id}>
                            {copy.run}: {shortID(task.completion_run_id)}
                          </div>
                        ) : null}
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-[color:var(--ol-line)] px-3 py-3 text-[12px] text-[color:var(--ol-muted)]">
                        <div>{formatDate(task.created_at, locale)}</div>
                        {task.published_at ? <div className="mt-1">{formatDate(task.published_at, locale)}</div> : null}
                        {task.completed_at ? <div className="mt-1">{formatDate(task.completed_at, locale)}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination path="/admin/tasks" params={params} page={page} total={tasks.total} limit={tasks.limit} locale={locale} />
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
