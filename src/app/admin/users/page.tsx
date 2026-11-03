import Link from "next/link";

import { LocalRunTime } from "@/components/a2a/local-run-time";
import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import { createUserAction, updateUserFlagsAction } from "../actions";
import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminSearchParams,
  type AdminUserList,
  EmptyState,
  ErrorBox,
  ForbiddenAdmin,
  Pagination,
  adminCopy,
  buildQuery,
  formatNumber,
  getAdminContext,
  offsetForPage,
  pageFromParams,
  pageHref,
  searchValue,
  shortID,
} from "../_components/shared";

const fieldClassName =
  "mt-1 h-10 w-full rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] outline-none focus:border-[color:var(--ol-primary)]";

function oauthProviderLabel(provider?: string) {
  if (!provider) return "";
  const normalized = provider.trim();
  if (!normalized) return "";
  const known: Record<string, string> = {
    github: "GitHub",
    google: "Google",
  };
  return known[normalized.toLowerCase()] ?? normalized;
}

function messageFromError(error: unknown, locale: "zh" | "en", fallback: string): string {
  return localizedErrorMessage(error, locale, fallback);
}

async function loadUsers(params: AdminSearchParams, page: number, locale: "zh" | "en") {
  const usersPath = `/api/v1/admin/users${buildQuery({
    q: params.q,
    role: params.role,
    limit: ADMIN_PAGE_SIZE,
    offset: offsetForPage(page),
  })}`;
  try {
    return {
      users: await apiFetchAuthed<AdminUserList>(usersPath, { cache: "no-store" }),
      error: null,
    };
  } catch (error) {
    return {
      users: { items: [], total: 0, limit: ADMIN_PAGE_SIZE, offset: offsetForPage(page) },
      error: messageFromError(
        error,
        locale,
        locale === "zh" ? "用户列表加载失败" : "Failed to load user list",
      ),
    };
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/users${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = adminCopy(locale);
  const { users, error } = await loadUsers(params, page, locale);
  const returnTo = pageHref("/admin/users", params, page);

  return (
    <AdminShell active="users" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="ol-panel-head items-start gap-4">
          <div>
            <strong>{copy.addUser}</strong>
            <p>{copy.addUserLead}</p>
          </div>
        </div>
        <form action={createUserAction} className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.9fr)_auto]">
          <input type="hidden" name="return_to" value={returnTo} />
          <label className="text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.email}
            <input
              required
              type="email"
              name="email"
              maxLength={120}
              autoComplete="off"
              className={fieldClassName}
            />
          </label>
          <label className="text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.displayName}
            <input
              required
              name="display_name"
              minLength={2}
              maxLength={50}
              autoComplete="off"
              className={fieldClassName}
            />
          </label>
          <label className="text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.initialPassword}
            <input
              required
              type="password"
              name="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className={fieldClassName}
            />
          </label>
          <div className="flex flex-wrap items-end gap-3 xl:justify-end">
            <label className="inline-flex h-10 items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
              <input type="checkbox" name="is_admin" value="true" />
              {copy.adminFlag}
            </label>
            <label className="inline-flex h-10 items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
              <input type="checkbox" name="is_creator" value="true" />
              {copy.creatorFlag}
            </label>
            <label className="inline-flex h-10 items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
              <input type="checkbox" name="creator_verified" value="true" />
              {copy.verifiedFlag}
            </label>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-4 text-[12px] font-black text-white">
              <Icon name="users" size="sm" />
              {copy.createUser}
            </button>
          </div>
        </form>
      </section>

      <section className="ol-panel ol-panel-pad mt-6">
        <div className="ol-panel-head items-start gap-4">
          <div>
            <strong>{copy.users}</strong>
            <p>
              {formatNumber(users.total)} {copy.items}
            </p>
          </div>
          <form className="flex flex-wrap gap-2" action="/admin/users">
            <input
              name="q"
              defaultValue={searchValue(params.q)}
              placeholder={copy.searchUsers}
              className="h-9 w-[220px] rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] outline-none focus:border-[color:var(--ol-primary)]"
            />
            <select
              name="role"
              defaultValue={searchValue(params.role)}
              className="h-9 rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-bold text-[color:var(--ol-ink)] outline-none"
            >
              <option value="">{copy.allRoles}</option>
              <option value="admin">{copy.admins}</option>
              <option value="creator">{copy.creators}</option>
              <option value="creator_verified">{copy.verifiedCreators}</option>
              <option value="regular">{copy.regular}</option>
            </select>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
              <Icon name="refresh" size="sm" />
              {copy.apply}
            </button>
            <Link className="ol-mini-btn" href="/admin/users">
              {copy.reset}
            </Link>
          </form>
        </div>

        {error ? <ErrorBox message={error} /> : null}
        {!error && users.items.length === 0 ? <EmptyState title={copy.noUsers} body={copy.noUsersBody} /> : null}
        {!error && users.items.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] border-separate border-spacing-y-2 text-left text-[13px]">
                <thead className="text-[11px] uppercase text-[color:var(--ol-muted)]">
                  <tr>
                    <th className="px-3 py-2">{copy.userCol}</th>
                    <th className="px-3 py-2">{copy.roleCol}</th>
                    <th className="px-3 py-2">{copy.authCol}</th>
                    <th className="px-3 py-2">{copy.activityCol}</th>
                    <th className="px-3 py-2">{copy.createdCol}</th>
                    <th className="px-3 py-2">{copy.actionCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.items.map((user) => (
                    <tr key={user.id} className="bg-white align-top shadow-sm">
                      <td className="rounded-l-2xl border-y border-l border-[color:var(--ol-line)] px-3 py-3">
                        <div className="font-black text-[color:var(--ol-ink)]">{user.display_name}</div>
                        <div className="mt-1 text-[12px] text-[color:var(--ol-muted)]">{user.email}</div>
                        <div className="mt-1 font-mono text-[11px] text-[color:var(--ol-subtle)]" title={user.id}>
                          {shortID(user.id)}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {user.is_admin ? <span className="ol-chip ol-chip-blue">{copy.adminFlag}</span> : null}
                          {user.is_creator ? <span className="ol-chip ol-chip-mint">{copy.creatorFlag}</span> : null}
                          {user.creator_verified ? <span className="ol-chip ol-chip-green">{copy.verifiedFlag}</span> : null}
                          {!user.is_admin && !user.is_creator ? <span className="ol-chip">{copy.regular}</span> : null}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {user.has_password ? <span className="ol-chip ol-chip-green">{copy.passwordAuth}</span> : null}
                          {user.is_oauth_user ? (
                            <span className="ol-chip ol-chip-blue">
                              {copy.oauthAuth}
                              {oauthProviderLabel(user.oauth_provider) ? ` · ${oauthProviderLabel(user.oauth_provider)}` : ""}
                            </span>
                          ) : null}
                          {!user.has_password && !user.is_oauth_user ? <span className="ol-chip">{copy.unknownAuth}</span> : null}
                        </div>
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3 text-[12px] text-[color:var(--ol-muted)]">
                        <div>
                          {copy.taskCount}: {formatNumber(user.task_count)}
                        </div>
                        <div>
                          {copy.runCount}: {formatNumber(user.run_count)}
                        </div>
                        <div>
                          {copy.agentCount}: {formatNumber(user.active_agent_count)} / {formatNumber(user.agent_count)}
                        </div>
                        {user.last_task_at ? <div>{copy.lastTask}: <LocalRunTime value={user.last_task_at} locale={locale} /></div> : null}
                        {user.last_run_at ? <div>{copy.lastRun}: <LocalRunTime value={user.last_run_at} locale={locale} /></div> : null}
                      </td>
                      <td className="border-y border-[color:var(--ol-line)] px-3 py-3 text-[color:var(--ol-muted)]">
                        <LocalRunTime value={user.created_at} locale={locale} />
                      </td>
                      <td className="rounded-r-2xl border-y border-r border-[color:var(--ol-line)] px-3 py-3">
                        <form action={updateUserFlagsAction} className="flex min-w-[430px] flex-wrap items-center gap-3">
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          {user.id === me.user_id && user.is_admin ? (
                            <input type="hidden" name="is_admin" value="true" />
                          ) : null}
                          <label className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
                            <input
                              type="checkbox"
                              name="is_admin"
                              value="true"
                              defaultChecked={user.is_admin}
                              disabled={user.id === me.user_id && user.is_admin}
                            />
                            {copy.adminFlag}
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
                            <input type="checkbox" name="is_creator" value="true" defaultChecked={user.is_creator} />
                            {copy.creatorFlag}
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
                            <input
                              type="checkbox"
                              name="creator_verified"
                              value="true"
                              defaultChecked={user.creator_verified}
                            />
                            {copy.verifiedFlag}
                          </label>
                          <button className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white">
                            <Icon name="check" size="sm" />
                            {copy.save}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination path="/admin/users" params={params} page={page} total={users.total} limit={users.limit} locale={locale} />
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
