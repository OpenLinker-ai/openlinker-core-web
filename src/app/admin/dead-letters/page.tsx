import Link from "next/link";

import { apiFetchAuthed, localizedErrorMessage } from "@/lib/api";
import { runErrorMessage, runtimeReasonMessage } from "@/lib/i18n-labels";

import {
  ADMIN_PAGE_SIZE,
  AdminShell,
  type AdminRuntimeDeadLetter,
  type AdminRuntimeDeadLetterList,
  type AdminSearchParams,
  EmptyState,
  ErrorBox,
  ForbiddenAdmin,
  Pagination,
  buildQuery,
  formatDate,
  formatNumber,
  getAdminContext,
  offsetForPage,
  pageFromParams,
} from "../_components/shared";

async function loadDeadLetters(page: number, locale: "zh" | "en") {
  try {
    return {
      data: await apiFetchAuthed<AdminRuntimeDeadLetterList>(
        `/api/v1/admin/runtime/dead-letters${buildQuery({
          limit: ADMIN_PAGE_SIZE,
          offset: offsetForPage(page),
        })}`,
        { cache: "no-store" },
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: {
        items: [],
        total: 0,
        limit: ADMIN_PAGE_SIZE,
        offset: offsetForPage(page),
      } as AdminRuntimeDeadLetterList,
      error: localizedErrorMessage(
        error,
        locale,
        locale === "zh" ? "待人工处理列表加载失败" : "Failed to load dead letters",
      ),
    };
  }
}

export default async function AdminDeadLettersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const page = pageFromParams(params);
  const { locale, me } = await getAdminContext(`/admin/dead-letters${buildQuery(params)}`);
  if (!me?.is_admin) return <ForbiddenAdmin locale={locale} />;

  const copy = locale === "zh"
    ? {
        title: "待人工处理的运行",
        lead: "这里保留自动重试耗尽后的证据。原运行不会再次执行；回放会按当前 Agent、权限、配额和策略创建一条全新的运行。",
        total: "当前记录",
        replayed: "已创建回放",
        noData: "没有待人工处理的运行",
        noDataBody: "自动重试耗尽的运行会出现在这里；正常失败和已取消不会混入。",
        attempts: "已尝试",
        reason: "停止自动重试的原因",
        created: "进入列表",
        lineage: "后续回放",
        noReplay: "尚未回放",
        ownerAction: "运行所有者可从运行详情创建回放；管理员列表不会代替用户触发新的外部副作用。",
        inspect: "查看技术证据",
        runId: "run_id",
        deadLetterId: "dead_letter_id",
        finalAttempt: "final_attempt_id",
        redactedDetail: "脱敏详情",
      }
    : {
        title: "Runs needing operator attention",
        lead: "This view retains evidence after automatic retries are exhausted. The original run never executes again; replay creates a new run under current Agent, permission, quota, and policy checks.",
        total: "Current records",
        replayed: "Replay runs created",
        noData: "No runs need operator attention",
        noDataBody: "Runs appear here only after automatic retries are exhausted; ordinary failures and cancellations stay separate.",
        attempts: "Attempts",
        reason: "Why automatic retry stopped",
        created: "Added",
        lineage: "Replay lineage",
        noReplay: "No replay yet",
        ownerAction: "The run owner can create a replay from Run detail. This admin inventory never triggers new external side effects on the user's behalf.",
        inspect: "View technical evidence",
        runId: "run_id",
        deadLetterId: "dead_letter_id",
        finalAttempt: "final_attempt_id",
        redactedDetail: "Redacted detail",
      };

  const { data, error } = await loadDeadLetters(page, locale);
  const replayCount = data.items.reduce((total, item) => total + item.replayed_as_run_ids.length, 0);

  return (
    <AdminShell active="dead_letters" locale={locale} status={params.status} error={params.error}>
      <section className="ol-panel ol-panel-pad mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <strong className="text-[18px] font-black text-[color:var(--ol-ink)]">{copy.title}</strong>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[color:var(--ol-muted)]">{copy.lead}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label={copy.total} value={formatNumber(data.total)} />
            <Metric label={copy.replayed} value={formatNumber(replayCount)} />
          </div>
        </div>
        {error ? <ErrorBox message={error} /> : null}
        {!error && data.items.length === 0 ? <EmptyState title={copy.noData} body={copy.noDataBody} /> : null}
      </section>

      {!error && data.items.length > 0 ? (
        <section className="mt-5 grid gap-4">
          {data.items.map((item) => (
            <DeadLetterCard key={item.dead_letter_id} item={item} locale={locale} copy={copy} />
          ))}
          <Pagination
            path="/admin/dead-letters"
            params={params}
            page={page}
            total={data.total}
            limit={data.limit}
            locale={locale}
          />
        </section>
      ) : null}
    </AdminShell>
  );
}

function DeadLetterCard({
  item,
  locale,
  copy,
}: {
  item: AdminRuntimeDeadLetter;
  locale: "zh" | "en";
  copy: Record<string, string>;
}) {
  const stableCode = item.reason_code || item.error_code || "RUNTIME_RETRY_EXHAUSTED";
  const reason = runtimeReasonMessage(stableCode, locale)
    || runErrorMessage(item.error_code, item.error_message, locale);

  return (
    <article className="ol-panel overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_220px_minmax(240px,.8fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[16px] font-black text-[color:var(--ol-ink)]">{item.agent_name}</strong>
            <span className="ol-chip ol-chip-amber">{stableCode}</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">{reason}</p>
          <div className="mt-3 font-mono text-[11.5px] font-bold text-[color:var(--ol-subtle)]">
            {item.run_id}
          </div>
        </div>

        <dl className="grid content-start gap-2 text-[12px]">
          <Datum label={copy.attempts} value={`${item.attempt_count} / ${item.max_attempts}`} />
          <Datum label={copy.created} value={formatDate(item.created_at, locale)} />
          <Datum label={copy.reason} value={stableCode} mono />
        </dl>

        <div className="rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
          <strong className="text-[12px] font-black text-[color:var(--ol-ink)]">{copy.lineage}</strong>
          {item.replayed_as_run_ids.length > 0 ? (
            <div className="mt-2 grid gap-1.5">
              {item.replayed_as_run_ids.map((runID) => (
                <Link
                  key={runID}
                  href={`/run/${encodeURIComponent(runID)}`}
                  className="truncate font-mono text-[11px] font-bold text-[color:var(--ol-primary-dark)] hover:underline"
                  title={runID}
                >
                  {runID}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[12px] font-bold text-[color:var(--ol-muted)]">{copy.noReplay}</p>
          )}
          <p className="mt-3 text-[11.5px] leading-5 text-[color:var(--ol-muted)]">{copy.ownerAction}</p>
        </div>
      </div>

      <details className="border-t border-[color:var(--ol-line)] bg-[#fbfcfe] px-5 py-3">
        <summary className="cursor-pointer text-[12px] font-black text-[color:var(--ol-muted)]">{copy.inspect}</summary>
        <dl className="mt-3 grid gap-2 text-[11.5px] md:grid-cols-2">
          <Datum label={copy.runId} value={item.run_id} mono />
          <Datum label={copy.deadLetterId} value={item.dead_letter_id} mono />
          <Datum label={copy.finalAttempt} value={item.final_attempt_id || "—"} mono />
          <Datum label={copy.redactedDetail} value={item.error_detail_redacted || item.reason_redacted || "—"} />
        </dl>
      </details>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-28 rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
      <div className="text-[10.5px] font-black text-[color:var(--ol-subtle)]">{label}</div>
      <div className="mt-1 text-[20px] font-black text-[color:var(--ol-ink)]">{value}</div>
    </div>
  );
}

function Datum({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-black text-[color:var(--ol-subtle)]">{label}</dt>
      <dd className={`mt-0.5 break-all font-bold text-[color:var(--ol-ink)] ${mono ? "font-mono text-[11px]" : "text-[12px]"}`}>
        {value}
      </dd>
    </div>
  );
}
