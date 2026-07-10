"use client";

import { Copy, KeyRound, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { CreateUserTokenDialog } from "@/components/settings/create-user-token-dialog";
import { TightenUserTokenDialog } from "@/components/settings/tighten-user-token-dialog";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { coreUserTokenMessages } from "@/messages/user-token";

import {
  AGENT_SCOPED_PERMISSIONS,
  normalizeCorePermission,
  tokenIsExpired,
  type AgentOption,
  type CorePermission,
  type UserTokenGrant,
  type UserTokenItem,
  type UserTokenListResponse,
} from "./user-token-types";

type Props = {
  initialItems: UserTokenItem[];
  initialTotal: number;
  initialLimit?: number;
  initialOffset?: number;
  loadError?: boolean;
  agentOptions: AgentOption[];
  locale: Locale;
};

export function UserTokensContent({
  initialItems,
  initialTotal,
  initialLimit = 10,
  initialOffset = 0,
  loadError = false,
  agentOptions,
  locale,
}: Props) {
  const copy = coreUserTokenMessages[locale];
  const { fetch: apiFetch, isAuthenticated, isLoading: sessionLoading } = useApi();
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(loadError);
  const [createOpen, setCreateOpen] = useState(false);
  const [replacementOf, setReplacementOf] = useState<UserTokenItem | null>(null);
  const [tightening, setTightening] = useState<UserTokenItem | null>(null);
  const [revokingID, setRevokingID] = useState("");
  const limit = initialLimit;

  const agentNames = useMemo(
    () => new Map(agentOptions.map((agent) => [agent.id, agent.name])),
    [agentOptions],
  );

  const ensureSession = useCallback(() => {
    if (sessionLoading) {
      toast.error(copy.sessionLoading);
      return false;
    }
    if (!isAuthenticated) {
      toast.error(copy.sessionMissing);
      return false;
    }
    return true;
  }, [copy.sessionLoading, copy.sessionMissing, isAuthenticated, sessionLoading]);

  const loadPage = useCallback(
    async (nextOffset = offset) => {
      if (!ensureSession()) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(nextOffset),
          sort_by: "created_at",
          sort_dir: "desc",
        });
        const response = await apiFetch<UserTokenListResponse>(
          `/api/v1/user-tokens?${params.toString()}`,
        );
        setItems(Array.isArray(response.items) ? response.items : []);
        setTotal(Number.isFinite(response.total) ? response.total : 0);
        setOffset(Number.isFinite(response.offset) ? response.offset : nextOffset);
        setPageError(false);
      } catch (error) {
        setPageError(true);
        toast.error(localizedErrorMessage(error, locale, copy.loadError));
      } finally {
        setLoading(false);
      }
    }, [apiFetch, copy.loadError, ensureSession, limit, locale, offset],
  );

  const afterMutation = () => {
    void loadPage(offset);
  };

  const revoke = async (token: UserTokenItem) => {
    if (!ensureSession() || token.revoked_at) return;
    if (!window.confirm(copy.revokeConfirm(token.name))) return;
    setRevokingID(token.id);
    try {
      await apiFetch(`/api/v1/user-tokens/${encodeURIComponent(token.id)}`, {
        method: "DELETE",
      });
      toast.success(copy.revokedToast);
      const nextOffset = items.length <= 1 && offset > 0
        ? Math.max(0, offset - limit)
        : offset;
      await loadPage(nextOffset);
    } catch (error) {
      toast.error(localizedErrorMessage(error, locale, copy.revokeFailed));
    } finally {
      setRevokingID("");
    }
  };

  const copyPrefix = async (prefix: string) => {
    try {
      await navigator.clipboard.writeText(prefix);
      toast.success(copy.prefixCopied);
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = total === 0 ? 0 : Math.min(offset + items.length, total);
  const canPrevious = offset > 0 && !loading;
  const canNext = offset + limit < total && !loading;

  return (
    <>
      <section className="ol-panel min-w-0 overflow-hidden">
        <div className="ol-panel-head flex-wrap gap-3">
          <div>
            <strong>{copy.managerTitle}</strong>
            <span className="ml-2 text-[12px] font-bold text-[color:var(--ol-muted)]">
              {copy.recordCount(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="ol-mini-btn"
              onClick={() => void loadPage(offset)}
              disabled={loading}
              aria-label={copy.loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              className="ol-mini-btn ol-mini-btn-primary"
              onClick={() => {
                setReplacementOf(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-3.5" /> {copy.create}
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] font-bold text-amber-900">
            {copy.loadError}
          </div>
        ) : null}

        {items.length === 0 && !loading ? (
          <div className="px-6 py-12 text-center">
            <KeyRound className="mx-auto size-7 text-[color:var(--ol-subtle)]" />
            <strong className="mt-3 block text-[15px] text-[color:var(--ol-ink)]">
              {copy.emptyTitle}
            </strong>
            <p className="mx-auto mt-1 max-w-lg text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
              {copy.emptyBody}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            {items.map((token) => {
              const status = tokenStatus(token);
              const grants = token.grants ?? [];
              const knownPermissions = uniqueKnownPermissions(grants);
              const unknownPermissions = Array.from(
                new Set(grants.map((grant) => grant.permission)),
              ).filter((permission) => !normalizeCorePermission(permission));
              return (
                <article
                  key={token.id}
                  className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-[14px] text-[color:var(--ol-ink)]">
                          {token.name}
                        </strong>
                        <span className={statusClass(status)}>
                          {status === "active"
                            ? copy.active
                            : status === "expired"
                              ? copy.expired
                              : copy.revoked}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyPrefix(token.prefix)}
                        title={copy.copyPrefix}
                        className="mt-1 inline-flex max-w-full items-center gap-1.5 text-left text-[11.5px] text-[color:var(--ol-muted)] hover:text-[color:var(--ol-primary-dark)]"
                      >
                        <code className="truncate">{token.prefix}…</code>
                        <Copy className="size-3 shrink-0" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {status === "active" ? (
                        <button
                          type="button"
                          className="ol-mini-btn"
                          onClick={() => setTightening(token)}
                        >
                          <ShieldCheck className="size-3.5" /> {copy.tighten}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ol-mini-btn"
                        onClick={() => {
                          setReplacementOf(token);
                          setCreateOpen(true);
                        }}
                      >
                        {copy.replacement}
                      </button>
                      {status === "active" ? (
                        <button
                          type="button"
                          className="ol-mini-btn"
                          disabled={revokingID === token.id}
                          onClick={() => void revoke(token)}
                        >
                          {revokingID === token.id ? copy.revoking : copy.revoke}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
                        {copy.permissions}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {knownPermissions.map((permission) => (
                          <span key={permission} className="ol-chip ol-chip-mint px-2 py-1 text-[10.5px]">
                            {copy.permissionCopy[permission].label}
                          </span>
                        ))}
                        {unknownPermissions.map((permission) => (
                          <code key={permission} className="ol-chip px-2 py-1 text-[10.5px]">
                            {permission}
                          </code>
                        ))}
                      </div>
                      <AgentResourceSummary
                        grants={grants}
                        permissions={knownPermissions}
                        agentNames={agentNames}
                        locale={locale}
                      />
                      <FixedResourceSummary grants={grants} permissions={knownPermissions} locale={locale} />
                    </div>
                    <dl className="grid grid-cols-2 gap-2 rounded-xl bg-[color:var(--ol-soft)] p-3 text-[11.5px]">
                      <Meta label={copy.expires} value={formatDate(token.expires_at, locale, copy.never)} />
                      <Meta label={copy.lastUsed} value={formatDate(token.last_used_at, locale, copy.notUsed)} />
                      <Meta label={copy.createdAt} value={formatDate(token.created_at, locale, "-")} />
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ol-line)] px-4 py-3">
            <span className="text-[11.5px] font-bold text-[color:var(--ol-muted)]">
              {copy.pageSummary(pageStart, pageEnd, total)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="ol-mini-btn"
                disabled={!canPrevious}
                onClick={() => void loadPage(Math.max(0, offset - limit))}
              >
                {copy.previous}
              </button>
              <button
                type="button"
                className="ol-mini-btn"
                disabled={!canNext}
                onClick={() => void loadPage(offset + limit)}
              >
                {copy.next}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <CreateUserTokenDialog
          open
          onOpenChange={(next) => {
            setCreateOpen(next);
            if (!next) setReplacementOf(null);
          }}
          onCreated={afterMutation}
          locale={locale}
          agentOptions={agentOptions}
          replacementOf={replacementOf}
        />
      ) : null}
      {tightening ? (
        <TightenUserTokenDialog
          open
          onOpenChange={(next) => {
            if (!next) setTightening(null);
          }}
          onUpdated={afterMutation}
          locale={locale}
          token={tightening}
          agentOptions={agentOptions}
        />
      ) : null}
    </>
  );
}

function tokenStatus(token: UserTokenItem): "active" | "expired" | "revoked" {
  if (token.revoked_at) return "revoked";
  if (tokenIsExpired(token)) return "expired";
  return "active";
}

function statusClass(status: "active" | "expired" | "revoked") {
  if (status === "active") return "ol-chip ol-chip-mint px-2 py-1 text-[10.5px]";
  if (status === "expired") return "ol-chip px-2 py-1 text-[10.5px] text-amber-800";
  return "ol-chip px-2 py-1 text-[10.5px] text-red-700";
}

function uniqueKnownPermissions(grants: UserTokenGrant[]): CorePermission[] {
  const permissions: CorePermission[] = [];
  for (const grant of grants) {
    const permission = normalizeCorePermission(grant.permission);
    if (permission && !permissions.includes(permission)) permissions.push(permission);
  }
  return permissions;
}

function AgentResourceSummary({
  grants,
  permissions,
  agentNames,
  locale,
}: {
  grants: UserTokenGrant[];
  permissions: CorePermission[];
  agentNames: Map<string, string>;
  locale: Locale;
}) {
  const copy = coreUserTokenMessages[locale];
  const scoped = permissions.filter((permission) => AGENT_SCOPED_PERMISSIONS.has(permission));
  if (scoped.length === 0) return null;
  return (
    <div className="mt-3 grid gap-1.5 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
      {scoped.map((permission) => {
        const permissionGrants = grants.filter((grant) => grant.permission === permission);
        const wildcard = permissionGrants.some((grant) => !grant.resource_id);
        const ids = permissionGrants.flatMap((grant) =>
          grant.resource_id ? [grant.resource_id] : [],
        );
        return (
          <div key={permission} className="flex flex-wrap gap-1.5">
            <span>{copy.permissionCopy[permission].label}:</span>
            <span className="text-[color:var(--ol-ink)]">
              {wildcard
                ? permission === "agents:run" ? copy.allCallableAgents : copy.allOwnedAgents
                : ids.length > 0
                  ? `${copy.selectedAgents(ids.length)} · ${ids
                      .map((id) => agentNames.get(id) ?? `${copy.unknownAgent} ${id.slice(0, 8)}`)
                      .join(", ")}`
                  : copy.selectedAgents(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FixedResourceSummary({ grants, permissions, locale }: {
  grants: UserTokenGrant[];
  permissions: CorePermission[];
  locale: Locale;
}) {
  const copy = coreUserTokenMessages[locale];
  const scoped = permissions.filter((permission) =>
    !AGENT_SCOPED_PERMISSIONS.has(permission) &&
    grants.some((grant) => grant.permission === permission && grant.resource_id),
  );
  if (scoped.length === 0) return null;
  return (
    <div className="mt-3 grid gap-1.5 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
      {scoped.map((permission) => {
        const ids = grants.flatMap((grant) =>
          grant.permission === permission && grant.resource_id ? [grant.resource_id] : [],
        );
        return (
          <div key={permission} className="flex flex-wrap gap-1.5">
            <span>{copy.permissionCopy[permission].label}:</span>
            <span className="text-[color:var(--ol-ink)]">
              {copy.selectedResources(ids.length)} · {ids.map((id) => id.slice(0, 8)).join(", ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black text-[color:var(--ol-subtle)]">{label}</dt>
      <dd className="mt-0.5 font-bold text-[color:var(--ol-ink)]">{value}</dd>
    </div>
  );
}

function formatDate(
  value: string | null | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
