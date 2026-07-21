import Link from "next/link";

import { runtimeNodeActionPolicy } from "@/lib/runtime-node-admin-policy.mjs";

export interface AdminRuntimeNode {
  node_id: string;
  display_name: string;
  node_version: string;
  protocol_version: number;
  runtime_contract_id: string;
  runtime_contract_digest: string;
  contract_match: boolean;
  features: string[];
  capacity: number;
  inflight: number;
  status: "active" | "draining" | "revoked" | string;
  last_seen_at?: string | null;
  draining_at?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  created_at: string;
  updated_at: string;
  active_session_count: number;
  active_agent_count: number;
}

export interface AdminRuntimeNodeList {
  items: AdminRuntimeNode[];
  total: number;
  limit: number;
  offset: number;
  current_contract_id: string;
  current_contract_digest: string;
  database_time: string;
}

export type RuntimeNodeAdminAction = (formData: FormData) => void | Promise<void>;

export interface RuntimeNodeManagementProps {
  locale: "zh" | "en";
  nodes: AdminRuntimeNodeList;
  error?: string | null;
  page: number;
  previousHref?: string;
  nextHref?: string;
  returnTo: string;
  drainAction: RuntimeNodeAdminAction;
  activateAction: RuntimeNodeAdminAction;
  revokeAction: RuntimeNodeAdminAction;
}

export function RuntimeNodeManagement({
  locale,
  nodes,
  error,
  page,
  previousHref,
  nextHref,
  returnTo,
  drainAction,
  activateAction,
  revokeAction,
}: RuntimeNodeManagementProps) {
  const copy = runtimeNodeCopy(locale);
  const active = nodes.items.filter((node) => node.status === "active").length;
  const draining = nodes.items.filter((node) => node.status === "draining").length;
  const revoked = nodes.items.filter((node) => node.status === "revoked").length;
  const capacity = nodes.items.reduce((sum, node) => sum + node.capacity, 0);
  const inflight = nodes.items.reduce((sum, node) => sum + node.inflight, 0);
  const referenceTime = nodes.database_time ? new Date(nodes.database_time) : new Date();

  return (
    <>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <strong className="text-[18px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[color:var(--ol-muted)]">{copy.lead}</p>
          </div>
          <Link
            className="ol-mini-btn"
            href="https://github.com/OpenLinker-ai/openlinker/blob/main/docs/36-runtime-worker.md#%E8%BA%AB%E4%BB%BD%E5%8F%91%E7%8E%B0%E4%B8%8E%E8%AF%81%E4%B9%A6"
          >
            {copy.openRunbook}
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label={copy.total} value={formatNumber(nodes.total, locale)} />
          <Metric label={copy.active} value={formatNumber(active, locale)} tone="green" />
          <Metric label={copy.draining} value={formatNumber(draining, locale)} tone="amber" />
          <Metric label={copy.capacity} value={formatNumber(capacity, locale)} />
          <Metric
            label={copy.inflight}
            value={formatNumber(inflight, locale)}
            tone={inflight > 0 ? "blue" : undefined}
          />
        </div>

        {revoked > 0 ? (
          <p className="mt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {copy.revoked}: {formatNumber(revoked, locale)}
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
              drainAction={drainAction}
              activateAction={activateAction}
              revokeAction={revokeAction}
            />
          ))}
          <Pagination
            locale={locale}
            page={page}
            total={nodes.total}
            limit={nodes.limit}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </section>
      ) : null}
    </>
  );
}

function NodeCard({
  node,
  locale,
  copy,
  referenceTime,
  returnTo,
  drainAction,
  activateAction,
  revokeAction,
}: {
  node: AdminRuntimeNode;
  locale: "zh" | "en";
  copy: RuntimeNodeCopy;
  referenceTime: Date;
  returnTo: string;
  drainAction: RuntimeNodeAdminAction;
  activateAction: RuntimeNodeAdminAction;
  revokeAction: RuntimeNodeAdminAction;
}) {
  const contractMatches = node.contract_match === true;
  const policy = runtimeNodeActionPolicy(node);
  const statusLabel = node.status === "active"
    ? copy.active
    : node.status === "draining"
      ? copy.draining
      : node.status === "revoked"
        ? copy.revoked
        : `${copy.unknownStatus} (${node.status})`;
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
          {policy.canDrain ? (
            <form action={drainAction}>
              <ActionIdentity nodeID={node.node_id} locale={locale} returnTo={returnTo} />
              <button className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 text-[12px] font-black text-amber-950 hover:bg-amber-100">
                {copy.drain}
              </button>
            </form>
          ) : node.status === "draining" ? (
            <div className="grid gap-2">
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
                {copy.drainingDone}
              </p>
              {policy.canActivate ? (
                <form action={activateAction}>
                  <ActionIdentity nodeID={node.node_id} locale={locale} returnTo={returnTo} />
                  <p className="mb-2 text-[11.5px] leading-5 text-[color:var(--ol-muted)]">{copy.activateSafety}</p>
                  <button className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-[12px] font-black text-emerald-900 hover:bg-emerald-100">
                    {copy.activate}
                  </button>
                </form>
              ) : (
                <p className="rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-3 py-2 text-[11.5px] leading-5 text-[color:var(--ol-muted)]">
                  {copy.activateUnavailable}
                </p>
              )}
            </div>
          ) : null}

          {policy.canRevoke ? (
            <form action={revokeAction} className="rounded-[14px] border border-rose-200 bg-rose-50 p-3">
              <ActionIdentity nodeID={node.node_id} locale={locale} returnTo={returnTo} />
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
          ) : policy.isRevoked ? (
            <div className="rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 text-[12px] text-[color:var(--ol-muted)]">
              <div>{copy.revokedAt}: {node.revoked_at ? formatTime(node.revoked_at, locale) : "—"}</div>
              {node.revoke_reason ? <div className="mt-1">{node.revoke_reason}</div> : null}
              <div className="mt-2 font-bold">{copy.revokedPermanent}</div>
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-3 py-2 text-[11.5px] leading-5 text-[color:var(--ol-muted)]">
              {copy.unknownStatusBody}
            </p>
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

function ActionIdentity({ nodeID, locale, returnTo }: { nodeID: string; locale: "zh" | "en"; returnTo: string }) {
  return (
    <>
      <input type="hidden" name="node_id" value={nodeID} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="return_to" value={returnTo} />
    </>
  );
}

function Pagination({
  locale,
  page,
  total,
  limit,
  previousHref,
  nextHref,
}: {
  locale: "zh" | "en";
  page: number;
  total: number;
  limit: number;
  previousHref?: string;
  nextHref?: string;
}) {
  const copy = runtimeNodeCopy(locale);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <div className="font-bold text-[color:var(--ol-muted)]">
        {copy.total} {formatNumber(total, locale)} {copy.items} · {copy.page} {page} / {totalPages}
      </div>
      <div className="flex gap-2">
        {previousHref ? (
          <Link className="ol-mini-btn" href={previousHref}>{copy.previous}</Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">{copy.previous}</span>
        )}
        {nextHref ? (
          <Link className="ol-mini-btn ol-mini-btn-primary" href={nextHref}>{copy.next}</Link>
        ) : (
          <span className="ol-mini-btn pointer-events-none opacity-50">{copy.next}</span>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-800">
      {message}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-5 py-8 text-center">
      <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">{title}</strong>
      <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-6 text-[color:var(--ol-muted)]">{body}</p>
    </div>
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

function formatNumber(value: number, locale: "zh" | "en") {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(value);
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

type RuntimeNodeCopy = ReturnType<typeof runtimeNodeCopy>;

function runtimeNodeCopy(locale: "zh" | "en") {
  return locale === "zh"
    ? {
        title: "Runtime Node",
        lead: "查看负责执行私有 Agent 的 Node。维护前先停止接收新任务；撤销会立即让设备身份和现有连接失效。",
        total: "节点总数",
        active: "可接收运行",
        draining: "正在停止接收新任务",
        revoked: "已撤销",
        capacity: "总容量",
        inflight: "执行中",
        noData: "还没有登记 Runtime Node",
        noDataBody: "启动使用 Agent Token 的 Runtime Worker 后，SDK 会自动生成密钥、签发证书并登记 Node。",
        sessions: "活跃 Session",
        agents: "已连接 Agent",
        protocol: "协议",
        nodeVersion: "Node version",
        nodeIdTechnical: "node_id",
        contractIdTechnical: "runtime_contract_id",
        contractDigestTechnical: "runtime_contract_digest",
        features: "能力",
        contractMatch: "协议版本一致",
        contractMismatch: "协议版本不一致",
        contractMismatchBody: "这台 Node 的 Runtime 协议版本与当前 Core 不一致。升级并重新连接 Node，不要继续派发新运行。",
        drain: "停止接收新任务",
        drainingDone: "已停止接收新任务，只会完成正在执行的运行。",
        activate: "恢复接收新任务",
        activateSafety: "Core 只会在无在途任务，并且在线 Session、证书身份和 Runtime 协议仍有效时恢复。",
        activateUnavailable: "当前身份或 Runtime 协议不满足安全恢复条件；请升级并重新连接 Node。",
        revoke: "撤销节点",
        revokeReason: "填写可审计的撤销原因",
        revokedAt: "撤销时间",
        revokedPermanent: "已撤销 Node 不可恢复；如需重新接入，请登记新的 Node 身份。",
        lastSeen: "最后连接",
        neverSeen: "尚未连接",
        registered: "登记时间",
        inspect: "查看完整身份",
        openRunbook: "查看自动凭据说明",
        confirmRevoke: "撤销后设备证书和现有 Session 都会失效。请确认原因无误。",
        unknownStatus: "未知状态",
        unknownStatusBody: "该状态不在当前管理界面的安全操作范围内；请先检查 Core 版本和运行日志。",
        previous: "上一页",
        next: "下一页",
        page: "第",
        items: "项",
      }
    : {
        title: "Runtime Nodes",
        lead: "Review the Nodes that execute private Agents. Stop new work before maintenance; revocation immediately invalidates the device identity and existing connections.",
        total: "Total nodes",
        active: "Accepting runs",
        draining: "Stopping new work",
        revoked: "Revoked",
        capacity: "Total capacity",
        inflight: "In flight",
        noData: "No Runtime Nodes are enrolled",
        noDataBody: "Start a Runtime Worker with an Agent Token; the SDK generates its key, obtains a certificate, and enrolls the Node automatically.",
        sessions: "Active sessions",
        agents: "Connected Agents",
        protocol: "Protocol",
        nodeVersion: "Node version",
        nodeIdTechnical: "node_id",
        contractIdTechnical: "runtime_contract_id",
        contractDigestTechnical: "runtime_contract_digest",
        features: "Features",
        contractMatch: "Protocol version matches",
        contractMismatch: "Protocol version mismatch",
        contractMismatchBody: "This Node's Runtime protocol version does not match the current Core. Upgrade and reconnect it before dispatching more runs.",
        drain: "Stop accepting new work",
        drainingDone: "No new runs will be assigned; work already in progress can finish.",
        activate: "Resume accepting new work",
        activateSafety: "Core resumes only when no work is in flight and the online Session, certificate identity, and Runtime protocol remain valid.",
        activateUnavailable: "This identity or Runtime protocol does not meet the safe resume conditions. Upgrade and reconnect the Node.",
        revoke: "Revoke Node",
        revokeReason: "Enter an auditable revocation reason",
        revokedAt: "Revoked at",
        revokedPermanent: "A revoked Node cannot be restored. Enroll a new Node identity to reconnect it.",
        lastSeen: "Last connected",
        neverSeen: "Never connected",
        registered: "Enrolled",
        inspect: "View full identity",
        openRunbook: "Open automatic credential guide",
        confirmRevoke: "Revocation invalidates the device certificate and every existing session. Confirm the reason before continuing.",
        unknownStatus: "Unknown status",
        unknownStatusBody: "This state is outside the management UI's safe action set. Check the Core version and Runtime logs first.",
        previous: "Previous",
        next: "Next",
        page: "Page",
        items: "items",
      };
}
