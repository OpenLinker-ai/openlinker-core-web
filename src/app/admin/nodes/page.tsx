import Link from "next/link";

import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import { drainRuntimeNodeAction, revokeRuntimeNodeAction } from "../actions";
import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminRuntimeNode,
  type AdminRuntimeNodeList,
  type AdminSearchParams,
  EmptyState,
  ErrorBox,
  ForbiddenAdmin,
  Pagination,
  buildQuery,
  formatNumber,
  getAdminContext,
  offsetForPage,
  pageFromParams,
  pageHref,
} from "../_components/shared";

async function loadNodes(page: number, locale: "zh" | "en") {
  try {
    return {
      nodes: await apiFetchAuthed<AdminRuntimeNodeList>(
        `/api/v1/admin/runtime/nodes${buildQuery({
          limit: ADMIN_PAGE_SIZE,
          offset: offsetForPage(page),
        })}`,
        { cache: "no-store" },
      ),
      error: null,
    };
  } catch (error) {
    return {
      nodes: {
        items: [],
        total: 0,
        limit: ADMIN_PAGE_SIZE,
        offset: offsetForPage(page),
        current_contract_id: "",
        current_contract_digest: "",
        database_time: new Date().toISOString(),
      } satisfies AdminRuntimeNodeList,
      error: localizedErrorMessage(
        error,
        locale,
        locale === "zh" ? "运行节点列表加载失败" : "Failed to load runtime nodes",
      ),
    };
  }
}

export default async function AdminRuntimeNodesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/nodes${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = locale === "zh"
    ? {
        title: "运行节点",
        lead: "查看负责执行私有 Agent 的 Node。先排空再维护；撤销会立即让设备身份和现有连接失效。",
        total: "节点总数",
        active: "正常接单",
        draining: "正在排空",
        revoked: "已撤销",
        capacity: "总容量",
        inflight: "执行中",
        noData: "还没有登记运行节点",
        noDataBody: "使用 Core 的 runtime-node issue 命令签发并登记第一台 Node。",
        identity: "节点",
        state: "状态与容量",
        runtime: "Runtime",
        seen: "最近连接",
        actions: "操作",
        sessions: "活跃 Session",
        agents: "已连接 Agent",
        protocol: "协议",
        nodeVersion: "Node version",
        nodeIdTechnical: "node_id",
        contractIdTechnical: "runtime_contract_id",
        contractDigestTechnical: "runtime_contract_digest",
        features: "能力",
        contractMatch: "契约一致",
        contractMismatch: "契约不一致",
        contractMismatchBody: "这台 Node 的 Runtime contract 与当前 Core 不一致。升级 Node 后重新签发或重新连接，不要继续派发新运行。",
        drain: "开始排空",
        drainingDone: "正在排空，不会再接收新运行。",
        revoke: "撤销节点",
        revokeReason: "填写可审计的撤销原因",
        revokedAt: "撤销时间",
        lastSeen: "最后连接",
        neverSeen: "尚未连接",
        registered: "登记时间",
        inspect: "查看完整身份",
        openRunbook: "查看签发说明",
        confirmRevoke: "撤销后设备证书和现有 Session 都会失效。请确认原因无误。",
      }
    : {
        title: "Runtime Nodes",
        lead: "Review the Nodes that execute private Agents. Drain before maintenance; revocation immediately invalidates the device identity and existing connections.",
        total: "Total nodes",
        active: "Accepting runs",
        draining: "Draining",
        revoked: "Revoked",
        capacity: "Total capacity",
        inflight: "In flight",
        noData: "No runtime nodes are enrolled",
        noDataBody: "Use Core's runtime-node issue command to enroll the first Node.",
        identity: "Node",
        state: "State and capacity",
        runtime: "Runtime",
        seen: "Last connection",
        actions: "Actions",
        sessions: "Active sessions",
        agents: "Connected Agents",
        protocol: "Protocol",
        nodeVersion: "Node version",
        nodeIdTechnical: "node_id",
        contractIdTechnical: "runtime_contract_id",
        contractDigestTechnical: "runtime_contract_digest",
        features: "Features",
        contractMatch: "Contract matches",
        contractMismatch: "Contract mismatch",
        contractMismatchBody: "This Node's Runtime contract does not match the current Core. Upgrade the Node and re-enroll or reconnect it before dispatching more runs.",
        drain: "Start draining",
        drainingDone: "Draining; no new runs will be assigned.",
        revoke: "Revoke Node",
        revokeReason: "Enter an auditable revocation reason",
        revokedAt: "Revoked at",
        lastSeen: "Last connected",
        neverSeen: "Never connected",
        registered: "Enrolled",
        inspect: "View full identity",
        openRunbook: "Open enrollment guide",
        confirmRevoke: "Revocation invalidates the device certificate and every existing session. Confirm the reason before continuing.",
      };

  const { nodes, error } = await loadNodes(page, locale);
  const active = nodes.items.filter((node) => node.status === "active").length;
  const draining = nodes.items.filter((node) => node.status === "draining").length;
  const revoked = nodes.items.filter((node) => node.status === "revoked").length;
  const capacity = nodes.items.reduce((sum, node) => sum + node.capacity, 0);
  const inflight = nodes.items.reduce((sum, node) => sum + node.inflight, 0);
  const returnTo = pageHref("/admin/nodes", params, page);
  const referenceTime = nodes.database_time ? new Date(nodes.database_time) : new Date();

  return (
    <AdminShell active="nodes" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <strong className="text-[18px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[color:var(--ol-muted)]">{copy.lead}</p>
          </div>
          <Link className="ol-mini-btn" href="https://github.com/OpenLinker-ai/openlinker-core#runtime-node-certificate-provisioning">
            {copy.openRunbook}
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label={copy.total} value={formatNumber(nodes.total)} />
          <Metric label={copy.active} value={formatNumber(active)} tone="green" />
          <Metric label={copy.draining} value={formatNumber(draining)} tone="amber" />
          <Metric label={copy.capacity} value={formatNumber(capacity)} />
          <Metric label={copy.inflight} value={formatNumber(inflight)} tone={inflight > 0 ? "blue" : undefined} />
        </div>

        {revoked > 0 ? (
          <p className="mt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.revoked}: {formatNumber(revoked)}
          </p>
        ) : null}
        {error ? <ErrorBox message={error} /> : null}
        {!error && nodes.items.length === 0 ? <EmptyState title={copy.noData} body={copy.noDataBody} /> : null}
      </section>

      {!error && nodes.items.length > 0 ? (
        <section className="mt-5 grid gap-4">
          {nodes.items.map((node) => (
            <NodeCard
              key={node.node_id}
              node={node}
              locale={locale}
              copy={copy}
              referenceTime={referenceTime}
              returnTo={returnTo}
            />
          ))}
          <Pagination
            path="/admin/nodes"
            params={params}
            page={page}
            total={nodes.total}
            limit={nodes.limit}
            locale={locale}
          />
        </section>
      ) : null}
    </AdminShell>
  );
}

function NodeCard({
  node,
  locale,
  copy,
  referenceTime,
  returnTo,
}: {
  node: AdminRuntimeNode;
  locale: "zh" | "en";
  copy: Record<string, string>;
  referenceTime: Date;
  returnTo: string;
}) {
  const contractMatches = node.contract_match === true;
  const statusLabel = node.status === "active"
    ? copy.active
    : node.status === "draining"
      ? copy.draining
      : node.status === "revoked"
        ? copy.revoked
        : node.status;
  const statusTone = node.status === "active"
    ? "ol-chip-green"
    : node.status === "draining"
      ? "ol-chip-amber"
      : "";

  return (
    <article className="ol-panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(220px,.8fr)_minmax(260px,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">{node.display_name}</strong>
            <span className={`ol-chip ${statusTone}`}>{statusLabel}</span>
            <span className={`ol-chip ${contractMatches ? "ol-chip-green" : "ol-chip-amber"}`}>
              {contractMatches ? copy.contractMatch : copy.contractMismatch}
            </span>
          </div>
          <div className="mt-2 font-mono text-[11.5px] font-bold text-[color:var(--ol-subtle)]" title={node.node_id}>
            {node.node_id}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NodeDatum label={copy.capacity} value={String(node.capacity)} />
            <NodeDatum label={copy.inflight} value={String(node.inflight)} />
            <NodeDatum label={copy.sessions} value={String(node.active_session_count ?? 0)} />
            <NodeDatum label={copy.agents} value={String(node.active_agent_count ?? 0)} />
          </div>
        </div>

        <div className="grid content-start gap-2 text-[12px] text-[color:var(--ol-muted)]">
          <NodeDatum label={copy.protocol} value={`v${node.protocol_version}`} />
          <NodeDatum label={copy.nodeVersion} value={node.node_version} />
          <NodeDatum
            label={copy.lastSeen}
            value={node.last_seen_at ? relativeTime(node.last_seen_at, referenceTime, locale) : copy.neverSeen}
          />
          <NodeDatum label={copy.registered} value={formatTime(node.created_at, locale)} />
        </div>

        <div className="grid content-start gap-3">
          {node.status === "active" ? (
            <form action={drainRuntimeNodeAction}>
              <input type="hidden" name="node_id" value={node.node_id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 text-[12px] font-black text-amber-950 hover:bg-amber-100">
                {copy.drain}
              </button>
            </form>
          ) : node.status === "draining" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
              {copy.drainingDone}
            </p>
          ) : null}

          {node.status !== "revoked" ? (
            <form action={revokeRuntimeNodeAction} className="rounded-[14px] border border-rose-200 bg-rose-50 p-3">
              <input type="hidden" name="node_id" value={node.node_id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="return_to" value={returnTo} />
              <p className="text-[11.5px] leading-5 text-rose-900">{copy.confirmRevoke}</p>
              <input
                name="reason"
                required
                maxLength={500}
                placeholder={copy.revokeReason}
                className="mt-2 h-9 w-full rounded-xl border border-rose-200 bg-white px-3 text-[12px] outline-none focus:border-rose-400"
              />
              <button className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl bg-rose-700 px-3 text-[12px] font-black text-white hover:bg-rose-800">
                {copy.revoke}
              </button>
            </form>
          ) : (
            <div className="rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 text-[12px] text-[color:var(--ol-muted)]">
              <div>{copy.revokedAt}: {node.revoked_at ? formatTime(node.revoked_at, locale) : "—"}</div>
              {node.revoke_reason ? <div className="mt-1">{node.revoke_reason}</div> : null}
            </div>
          )}
        </div>
      </div>

      {!contractMatches ? (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-[12.5px] leading-5 text-amber-950">
          <strong>{copy.contractMismatch}</strong>
          <span className="ml-2">{copy.contractMismatchBody}</span>
        </div>
      ) : null}

      <details className="border-t border-[color:var(--ol-line)] bg-[#fbfcfe] px-5 py-3">
        <summary className="cursor-pointer text-[12px] font-black text-[color:var(--ol-muted)]">{copy.inspect}</summary>
        <dl className="mt-3 grid gap-2 text-[11.5px] md:grid-cols-2">
          <IdentityDatum label={copy.nodeIdTechnical} value={node.node_id} />
          <IdentityDatum label={copy.contractIdTechnical} value={node.runtime_contract_id} />
          <IdentityDatum label={copy.contractDigestTechnical} value={node.runtime_contract_digest} />
          <IdentityDatum label={copy.features} value={node.features.join(", ") || "—"} />
        </dl>
      </details>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "blue" }) {
  const toneClass = tone === "green"
    ? "text-emerald-700"
    : tone === "amber"
      ? "text-amber-800"
      : tone === "blue"
        ? "text-[color:var(--ol-blue)]"
        : "text-[color:var(--ol-ink)]";
  return (
    <div className="rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3">
      <div className="text-[10.5px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">{label}</div>
      <div className={`mt-1 text-[22px] font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function NodeDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[11px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
      <div className="text-[10.5px] font-black uppercase tracking-[0.04em] text-[color:var(--ol-subtle)]">{label}</div>
      <div className="mt-1 break-all text-[12px] font-black text-[color:var(--ol-ink)]">{value}</div>
    </div>
  );
}

function IdentityDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
      <dt className="font-mono text-[10.5px] text-[color:var(--ol-subtle)]">{label}</dt>
      <dd className="mt-1 break-all font-mono text-[11px] font-bold text-[color:var(--ol-ink)]">{value}</dd>
    </div>
  );
}

function formatTime(value: string, locale: "zh" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function relativeTime(value: string, reference: Date, locale: "zh" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || Number.isNaN(reference.getTime())) return "—";
  const seconds = Math.round((date.getTime() - reference.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}
