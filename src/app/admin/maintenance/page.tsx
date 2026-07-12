import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";

import {
  AdminShell,
  type AdminRuntimeMaintenance,
  type AdminRuntimeMaintenanceBlocker,
  type AdminRuntimeMember,
  type AdminSearchParams,
  ErrorBox,
  ForbiddenAdmin,
  getAdminContext,
} from "../_components/shared";

async function loadMaintenance(locale: "zh" | "en") {
  try {
    return {
      data: await apiFetchAuthed<AdminRuntimeMaintenance>(
        "/api/v1/admin/runtime/maintenance",
        {
          cache: "no-store",
        },
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: localizedErrorMessage(
        error,
        locale,
        locale === "zh" ? "运行状态加载失败" : "Failed to load runtime health",
      ),
    };
  }
}

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const { locale, me } = await getAdminContext("/admin/maintenance");
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = maintenanceCopy(locale);
  const { data, error } = await loadMaintenance(locale);
  const state = data ? runtimeState(data) : "blocked";
  const stateCopy = copy.states[state];
  const liveMembers = data?.members.filter((member) => member.live) ?? [];
  const readyMembers = liveMembers.filter((member) => member.ready);

  return (
    <AdminShell
      active="maintenance"
      locale={locale}
      status={params.status}
      error={params.error}
    >
      <section
        className={`mt-6 overflow-hidden rounded-[22px] border ${stateCopy.panel}`}
      >
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`ol-chip ${stateCopy.chip}`}>
                {stateCopy.label}
              </span>
              {data ? (
                <span className="ol-chip">
                  {data.control ? modeLabel(data.control.mode, copy) : copy.schemaMissing}
                </span>
              ) : null}
            </div>
            <h2 className="mt-4 text-[22px] font-black tracking-[-0.02em] text-[color:var(--ol-ink)]">
              {stateCopy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">
              {stateCopy.body}
            </p>
            {error ? <ErrorBox message={error} /> : null}
          </div>

          <div className="grid grid-cols-2 gap-2 self-start">
            <Metric
              label={copy.liveMembers}
              value={`${liveMembers.length} / ${data?.control?.expected_replicas ?? "—"}`}
            />
            <Metric
              label={copy.readyMembers}
              value={data ? String(readyMembers.length) : "—"}
            />
            <Metric
              label={copy.signalBus}
              value={data ? signalLabel(data.signal_bus, copy) : "—"}
            />
            <Metric
              label={copy.databaseTime}
              value={data ? formatTime(data.database_time, locale) : "—"}
            />
          </div>
        </div>
      </section>

      {data && data.readiness.blockers.length > 0 ? (
        <section className="ol-panel ol-panel-pad mt-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Icon name="warn" size="md" />
            </span>
            <div>
              <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">
                {copy.blockers}
              </strong>
              <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--ol-muted)]">
                {copy.blockersBody}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {data.readiness.blockers.map((blocker, index) => (
              <BlockerRow
                key={`${blocker.code}-${blocker.id ?? blocker.scope ?? index}`}
                blocker={blocker}
                copy={copy}
              />
            ))}
          </div>
        </section>
      ) : null}

      {data ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(330px,.7fr)]">
          <div className="ol-panel ol-panel-pad min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">
                  {copy.members}
                </strong>
                <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--ol-muted)]">
                  {copy.membersBody}
                </p>
              </div>
              <span className="ol-chip">{copy.dbClockWindow}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {data.members.length > 0 ? (
                data.members.map((member) => (
                  <MemberCard
                    key={member.instance_id}
                    member={member}
                    copy={copy}
                    locale={locale}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-5 text-[13px] font-bold text-[color:var(--ol-muted)]">
                  {copy.noMembers}
                </p>
              )}
            </div>
          </div>

          <aside className="ol-panel ol-panel-pad self-start">
            <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">
              {copy.changeWindow}
            </strong>
            <p className="mt-2 text-[12.5px] leading-6 text-[color:var(--ol-muted)]">
              {copy.changeWindowBody}
            </p>
            <ol className="mt-4 grid gap-2 text-[12px] font-bold leading-5 text-[color:var(--ol-ink)]">
              {copy.steps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-2 rounded-xl bg-[color:var(--ol-soft)] px-3 py-2"
                >
                  <span className="text-[color:var(--ol-primary-dark)]">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Link
              className="ol-mini-btn ol-mini-btn-primary mt-4 w-full justify-center"
              href="https://github.com/OpenLinker-ai/openlinker/blob/main/docs/16-deployment-runbook.md"
            >
              {copy.openRunbook}
              <Icon name="arrow-up-right" size="sm" />
            </Link>
          </aside>
        </section>
      ) : null}

      {data ? (
        <details className="ol-panel mt-5 overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-[13px] font-black text-[color:var(--ol-muted)]">
            {copy.technical}
          </summary>
          <div className="grid gap-4 border-t border-[color:var(--ol-line)] bg-[#fbfcfe] p-5 md:grid-cols-2 xl:grid-cols-3">
            <TechnicalDatum
              technicalKey="control.mode"
              value={data.control?.mode ?? "—"}
            />
            <TechnicalDatum
              technicalKey="control.version"
              value={data.control ? String(data.control.version) : "—"}
            />
            <TechnicalDatum
              technicalKey="control.cutover_id"
              value={data.control?.cutover_id || "—"}
            />
            <TechnicalDatum
              technicalKey="schema"
              value={`${data.current.schema_version} · ${data.current.schema_checksum}`}
            />
            <TechnicalDatum
              technicalKey="runtime_contract_id"
              value={data.current.runtime_contract_id}
            />
            <TechnicalDatum
              technicalKey="runtime_contract_digest"
              value={data.current.runtime_contract_digest}
            />
            <TechnicalDatum
              technicalKey="release_id"
              value={data.current.release_id}
            />
            <TechnicalDatum
              technicalKey="git_sha"
              value={data.current.git_sha}
            />
            <TechnicalDatum
              technicalKey="control.updated_at"
              value={data.control?.updated_at ?? "—"}
            />
          </div>
        </details>
      ) : null}
    </AdminShell>
  );
}

type RuntimeState = "ready" | "draining" | "maintenance" | "blocked";
type Copy = {
  liveMembers: string;
  readyMembers: string;
  signalBus: string;
  databaseTime: string;
  blockers: string;
  blockersBody: string;
  members: string;
  membersBody: string;
  dbClockWindow: string;
  noMembers: string;
  changeWindow: string;
  changeWindowBody: string;
  steps: readonly string[];
  openRunbook: string;
  technical: string;
  healthy: string;
  unhealthy: string;
  signal: string;
  lastSeen: string;
  memberReady: string;
  memberBlocked: string;
  memberDraining: string;
  memberStale: string;
  memberIdentity: string;
  unknownBlocker: string;
  schemaMissing: string;
  modes: Record<string, string>;
  states: Record<
    RuntimeState,
    {
      label: string;
      title: string;
      body: string;
      chip: string;
      panel: string;
    }
  >;
  blockerMessages: Record<string, string>;
};

function runtimeState(data: AdminRuntimeMaintenance): RuntimeState {
  if (!data.runtime_schema_installed || !data.control) return "blocked";
  if (data.control.mode === "hard_maintenance") return "maintenance";
  if (data.control.mode === "draining") return "draining";
  return data.readiness.ready ? "ready" : "blocked";
}

function modeLabel(mode: string, copy: Copy): string {
  if (mode === "normal") return copy.modes.normal;
  if (mode === "draining") return copy.modes.draining;
  if (mode === "hard_maintenance") return copy.modes.hard_maintenance;
  return mode;
}

function signalLabel(
  signal: AdminRuntimeMaintenance["signal_bus"],
  copy: Copy,
): string {
  return signal.healthy
    ? `${copy.healthy} · ${signal.mode}`
    : `${copy.unhealthy} · ${signal.mode}`;
}

function BlockerRow({
  blocker,
  copy,
}: {
  blocker: AdminRuntimeMaintenanceBlocker;
  copy: Copy;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:grid-cols-[minmax(210px,.5fr)_minmax(0,1fr)]">
      <div>
        <span className="font-mono text-[11.5px] font-black text-amber-950">
          {blocker.code}
        </span>
        {blocker.scope ? (
          <span className="ml-2 text-[11px] font-bold text-amber-800">
            {blocker.scope}
          </span>
        ) : null}
      </div>
      <p className="break-words text-[12px] font-semibold leading-5 text-amber-950">
        {blockerMessage(blocker, copy)}
        {blocker.id ? (
          <span className="ml-2 font-mono text-[10.5px] text-amber-800">
            {blocker.id}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function blockerMessage(
  blocker: AdminRuntimeMaintenanceBlocker,
  copy: Copy,
): string {
  return (
    copy.blockerMessages[blocker.code] ??
    blocker.message_redacted ??
    copy.unknownBlocker
  );
}

function MemberCard({
  member,
  copy,
  locale,
}: {
  member: AdminRuntimeMember;
  copy: Copy;
  locale: "zh" | "en";
}) {
  const healthy = member.live && member.ready;
  return (
    <article className="rounded-2xl border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong
              className="truncate font-mono text-[12px] font-black text-[color:var(--ol-ink)]"
              title={member.instance_id}
            >
              {member.instance_id}
            </strong>
            <span
              className={`ol-chip ${healthy ? "ol-chip-green" : "ol-chip-amber"}`}
            >
              {healthy
                ? copy.memberReady
                : member.live && member.draining
                  ? copy.memberDraining
                  : member.live
                  ? copy.memberBlocked
                  : copy.memberStale}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] font-semibold text-[color:var(--ol-muted)]">
            {copy.lastSeen}: {formatTime(member.last_seen_at, locale)}
          </p>
        </div>
        <span className={`ol-chip ${member.draining ? "ol-chip-amber" : ""}`}>
          {member.draining ? copy.memberDraining : copy.memberReady}
        </span>
      </div>
      <details className="mt-3 rounded-xl bg-[color:var(--ol-soft)] px-3 py-2">
        <summary className="cursor-pointer text-[11.5px] font-black text-[color:var(--ol-muted)]">
          {copy.memberIdentity}
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <TechnicalDatum technicalKey="release_id" value={member.release_id} />
          <TechnicalDatum technicalKey="git_sha" value={member.git_sha} />
          <TechnicalDatum
            technicalKey="schema"
            value={`${member.schema_version} · ${member.schema_checksum}`}
          />
          <TechnicalDatum
            technicalKey="runtime_contract_id"
            value={member.runtime_contract_id}
          />
          <TechnicalDatum
            technicalKey="runtime_contract_digest"
            value={member.runtime_contract_digest}
          />
        </dl>
      </details>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
      <div className="text-[10.5px] font-black text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <div
        className="mt-1 truncate text-[16px] font-black text-[color:var(--ol-ink)]"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function TechnicalDatum({
  technicalKey,
  value,
}: {
  technicalKey: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10.5px] font-black text-[color:var(--ol-subtle)]">
        {technicalKey}
      </dt>
      <dd className="mt-1 break-all font-mono text-[11px] font-bold leading-5 text-[color:var(--ol-ink)]">
        {value || "—"}
      </dd>
    </div>
  );
}

function formatTime(value: string, locale: "zh" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function maintenanceCopy(locale: "zh" | "en"): Copy {
  return locale === "zh"
    ? {
        liveMembers: "在线 Core",
        readyMembers: "可以接流量",
        signalBus: "唤醒通道",
        databaseTime: "数据库时间",
        blockers: "暂时不能开放新任务",
        blockersBody:
          "先消除下面的阻断项，再由切换命令重新开放；不要绕过门禁。",
        members: "Core 实例",
        membersBody:
          "实例必须使用同一发布版本、数据库结构和 Runtime 契约，在线数量也要符合预期。",
        dbClockWindow: "数据库时钟 · 15 秒窗口",
        noMembers: "当前没有处于成员窗口内的 Core 实例。",
        changeWindow: "安全切换顺序",
        changeWindowBody:
          "这个页面只读。维护状态由 runtime-cutover 命令修改，避免误点直接放开流量。",
        steps: [
          "先排空，不再接收新任务",
          "确认在途任务收尾并停止旧实例",
          "迁移、启动并核对全部实例",
          "门禁全绿后重新开放",
        ],
        openRunbook: "打开切换手册",
        technical: "展开技术状态",
        healthy: "正常",
        unhealthy: "异常",
        signal: "Signal Bus",
        lastSeen: "最近上报",
        memberReady: "就绪",
        memberBlocked: "被门禁阻止",
        memberDraining: "排空中",
        memberStale: "已离线",
        memberIdentity: "展开版本与契约",
        unknownBlocker:
          "运行条件尚未满足，请按稳定错误码查看部署日志和切换手册。",
        schemaMissing: "Runtime 结构未安装",
        modes: {
          normal: "正常运行",
          draining: "排空中",
          hard_maintenance: "维护中",
        },
        states: {
          ready: {
            label: "可以开始新任务",
            title: "运行链路已就绪",
            body: "Core、数据库、Runtime 契约和唤醒通道一致，新任务可以进入；WebSocket 为主通道，Pull v2 可在连接不稳定时接续。",
            chip: "ol-chip-green",
            panel: "border-emerald-200 bg-emerald-50/70",
          },
          draining: {
            label: "正在收尾",
            title: "不再接收新任务",
            body: "现有任务仍可确认、续租并提交结果。待在途任务结束后，再停止实例并进入迁移。",
            chip: "ol-chip-amber",
            panel: "border-amber-200 bg-amber-50/70",
          },
          maintenance: {
            label: "维护中",
            title: "新任务已暂停",
            body: "集群处于强维护状态。已有连接只保留安全收尾路径，待版本、结构和契约全部核对后再开放。",
            chip: "ol-chip-amber",
            panel: "border-amber-200 bg-amber-50/70",
          },
          blocked: {
            label: "暂不可用",
            title: "运行条件尚未对齐",
            body: "系统已主动阻止新任务进入，避免把任务交给版本或契约不一致的实例。下面列出需要处理的项目。",
            chip: "ol-chip-amber",
            panel: "border-rose-200 bg-rose-50/70",
          },
        },
        blockerMessages: {
          cluster_schema_unavailable: "Runtime 数据结构尚未安装。",
          cluster_control_unavailable: "无法读取 Runtime 切换控制状态。",
          current_schema_mismatch: "数据库结构与当前 Core 不一致。",
          current_contract_mismatch: "数据库中的 Runtime 契约与当前 Core 不一致。",
          replicas_unavailable: "在线 Core 数量少于切换计划。",
          replicas_unexpected: "发现计划外的在线 Core，暂不能开放。",
          member_release_mismatch: "Core 实例不是同一发布版本。",
          member_schema_mismatch: "Core 实例的数据库结构版本不一致。",
          member_contract_mismatch: "Core 实例的 Runtime 契约不一致。",
          member_schema_checksum_mismatch: "Core 实例的迁移校验值不一致。",
          member_not_ready: "至少一个在线 Core 还未就绪。",
          signal_dependency_unavailable: "高可用唤醒通道异常；数据库仍保留正确性兜底。",
          release_identity_missing: "当前发布缺少可核验的 release 或 git 身份。",
          expected_replicas_invalid: "计划的 Core 副本数不合法。",
          maintenance: "集群仍处于维护或排空状态。",
        },
      }
    : {
        liveMembers: "Live Core",
        readyMembers: "Ready for traffic",
        signalBus: "Wake-up path",
        databaseTime: "Database time",
        blockers: "New runs cannot open yet",
        blockersBody:
          "Clear every blocker, then reopen through the cutover command. Do not bypass the gate.",
        members: "Core instances",
        membersBody:
          "Every instance must use the same release, database schema, and Runtime contract, with the expected replica count online.",
        dbClockWindow: "Database clock · 15-second window",
        noMembers:
          "No Core instance is currently inside the membership window.",
        changeWindow: "Safe cutover order",
        changeWindowBody:
          "This page is read-only. runtime-cutover changes maintenance state so traffic cannot be reopened by an accidental click.",
        steps: [
          "Drain and stop accepting new runs",
          "Let in-flight work settle and stop the old release",
          "Migrate, start, and verify every instance",
          "Reopen only after every gate passes",
        ],
        openRunbook: "Open cutover runbook",
        technical: "Show technical state",
        healthy: "Healthy",
        unhealthy: "Unhealthy",
        signal: "Signal Bus",
        lastSeen: "Last reported",
        memberReady: "Ready",
        memberBlocked: "Blocked by gate",
        memberDraining: "Draining",
        memberStale: "Offline",
        memberIdentity: "Show version and contract",
        unknownBlocker:
          "A runtime prerequisite is not met. Use the stable code with deployment logs and the cutover runbook.",
        schemaMissing: "Runtime schema not installed",
        modes: {
          normal: "Normal",
          draining: "Draining",
          hard_maintenance: "Maintenance",
        },
        states: {
          ready: {
            label: "Ready for new runs",
            title: "The runtime path is ready",
            body: "Core, database, Runtime contract, and wake-up path agree. WebSocket is primary, while Pull v2 can continue work through an unstable connection.",
            chip: "ol-chip-green",
            panel: "border-emerald-200 bg-emerald-50/70",
          },
          draining: {
            label: "Settling work",
            title: "New runs are paused",
            body: "Existing runs can still confirm, renew, and submit results. Stop instances only after in-flight work has settled.",
            chip: "ol-chip-amber",
            panel: "border-amber-200 bg-amber-50/70",
          },
          maintenance: {
            label: "Maintenance",
            title: "New runs are paused",
            body: "The cluster is in hard maintenance. Existing connections retain only safe settlement paths until release, schema, and contract checks pass.",
            chip: "ol-chip-amber",
            panel: "border-amber-200 bg-amber-50/70",
          },
          blocked: {
            label: "Unavailable",
            title: "Runtime prerequisites do not agree",
            body: "The system is deliberately blocking new runs so work is not assigned to a mismatched instance. Resolve the items below first.",
            chip: "ol-chip-amber",
            panel: "border-rose-200 bg-rose-50/70",
          },
        },
        blockerMessages: {
          cluster_schema_unavailable: "The Runtime database schema is not installed.",
          cluster_control_unavailable: "Runtime cutover control state is unavailable.",
          current_schema_mismatch: "The database schema does not match this Core release.",
          current_contract_mismatch: "The database Runtime contract does not match this Core release.",
          replicas_unavailable: "Fewer Core replicas are live than the cutover plan requires.",
          replicas_unexpected: "An unplanned live Core replica prevents reopening.",
          member_release_mismatch: "Core instances are not on the same release.",
          member_schema_mismatch: "Core instance schema versions do not match.",
          member_contract_mismatch: "Core instance Runtime contracts do not match.",
          member_schema_checksum_mismatch: "Core instance migration checksums do not match.",
          member_not_ready: "At least one live Core instance is not ready.",
          signal_dependency_unavailable: "The HA wake-up path is unhealthy; the database remains the correctness fallback.",
          release_identity_missing: "The release is missing verifiable release or git identity.",
          expected_replicas_invalid: "The planned Core replica count is invalid.",
          maintenance: "The cluster is still draining or in maintenance.",
        },
      };
}
