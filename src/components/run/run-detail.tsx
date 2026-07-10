"use client";

import Link from "next/link";
import { useState } from "react";

import { RunEventStream } from "@/components/run/run-event-stream";
import { TaskCallbackSection } from "@/components/run/task-callback-section";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import {
  artifactVisibilityLabel,
  coverageStatusLabel,
  runErrorMessage,
  runStatusLabel,
} from "@/lib/i18n-labels";
import { runDetailMessages } from "@/messages/run";

export type RunDetailData = {
  run_id: string;
  agent_id?: string;
  agent_slug?: string;
  agent_name?: string;
  agent_connection_mode?: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  cost_cents: number;
  duration_ms: number;
  parent_run_id?: string;
  caller_agent_id?: string;
  billing_mode?: string;
  requirement_evidence?: RunRequirementEvidenceData;
  evidence_summary?: RunEvidenceSummaryData;
  next_action?: RunNextAction;
};

export type RunEvidenceSummaryData = {
  status: string;
  coverage_status: string;
  matched_skill_count: number;
  missing_skill_count: number;
  used_mcp_tool_count: number;
  artifact_count: number;
  message_count: number;
  delivery_status?: string | null;
  public_safe: boolean;
  evidence_url: string;
};

export type RunRequirementEvidenceData = {
  run_id: string;
  task_id: string;
  agent_id: string;
  required_skill_ids: string[];
  required_mcp_tools: string[];
  agent_skill_ids: string[];
  matched_skill_ids: string[];
  missing_skill_ids: string[];
  used_mcp_tools: string[];
  missing_mcp_tools: string[];
  coverage_status: string;
  evidence_source: string;
  created_at: string;
};

export type RunArtifactData = {
  id: string;
  run_id: string;
  artifact_type: string;
  title: string;
  content: Record<string, unknown>;
  visibility: string;
  source_artifact_id?: string;
  mime_type?: string;
  file_uri?: string;
  file_name?: string;
  file_sha256?: string;
  file_size_bytes?: number | null;
  created_at: string;
};

export type RunMessageData = {
  id: string;
  run_id: string;
  event_sequence?: number | null;
  role: "user" | "agent" | "tool" | "platform" | string;
  content: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type RunNextAction = {
  type: string;
  label: string;
  hint: string;
  href?: string;
  method?: string;
  requires_human?: boolean;
  resource_type?: string;
  resource_id?: string;
  source?: string;
};

type ViewRun = {
  id: string;
  agentId?: string;
  agentSlug?: string;
  agentName?: string;
  agentConnectionMode?: string;
  status: string;
  input: Record<string, unknown>;
  costCents: number;
  durationMs: number;
  output: Record<string, unknown>;
  errorCode?: string;
  error?: string;
  rawError?: string;
  parentRunId?: string;
  callerAgentId?: string;
  billingMode?: string;
  requirementEvidence?: RunRequirementEvidenceData;
  evidenceSummary?: RunEvidenceSummaryData;
  nextAction?: RunNextAction;
};

function normalizeRun(run: RunDetailData, locale: Locale): ViewRun {
  return {
    id: run.run_id,
    agentId: run.agent_id,
    agentSlug: run.agent_slug,
    agentName: run.agent_name,
    agentConnectionMode: run.agent_connection_mode,
    status: run.status,
    input: run.input ?? {},
    costCents: run.cost_cents,
    durationMs: run.duration_ms,
    output: run.output ?? {},
    errorCode: run.error_code,
    error: runErrorMessage(run.error_code, run.error_message, locale),
    rawError: run.error_message?.trim() || undefined,
    parentRunId: run.parent_run_id,
    callerAgentId: run.caller_agent_id,
    billingMode: run.billing_mode,
    requirementEvidence: run.requirement_evidence,
    evidenceSummary: run.evidence_summary,
    nextAction: run.next_action,
  };
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtPriceField(cents: number, locale: Locale): string {
  return cents > 0
    ? locale === "zh" ? `外部费用记录 $${(cents / 100).toFixed(2)}` : `External cost recorded: $${(cents / 100).toFixed(2)}`
    : locale === "zh" ? "未记录外部费用" : "No external cost recorded";
}

function statusChip(status: string, locale: Locale): { tone: string; label: string } {
  if (status === "success") return { tone: "ol-chip ol-chip-green", label: runStatusLabel(status, locale) };
  if (status === "failed" || status === "timeout") return { tone: "ol-chip ol-chip-amber", label: runStatusLabel(status, locale) };
  if (status === "canceled") return { tone: "ol-chip", label: runStatusLabel(status, locale) };
  if (status === "running") return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
  return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
}

export function RunDetail({
  locale,
  run,
  artifacts = [],
  messages = [],
}: {
  locale: Locale;
  run: RunDetailData | null;
  artifacts?: RunArtifactData[];
  messages?: RunMessageData[];
}) {
  const copy = runDetailMessages[locale];
  const [copied, setCopied] = useState(false);
  if (!run) {
    return (
      <div className="ol-panel ol-panel-pad text-[13px] font-semibold text-[color:var(--ol-muted)]">
        {copy.loadFailed}
      </div>
    );
  }
  const view = normalizeRun(run, locale);
  const success = view.status === "success";
  const delegated = view.billingMode === "free_delegation";
  const chip = statusChip(view.status, locale);
  const deliverySettingsHref =
    view.agentSlug || view.agentId
      ? `/hub/agents/${encodeURIComponent(view.agentSlug || view.agentId || "")}/delivery?run_id=${encodeURIComponent(view.id)}`
      : `/connect?tab=delivery&run_id=${encodeURIComponent(view.id)}`;
  const externalDeliveryStatus = delegated
    ? copy.deliveryNoSeparate
    : copy.deliveryReview;
  const externalDeliveryTone = delegated
    ? "mint"
    : "amber";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(view.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="grid items-end gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="ol-kicker">{copy.kicker}</div>
            <h1 className="mt-2 break-all text-[30px] font-[900] leading-tight text-[color:var(--ol-ink)]">
              {view.id}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={chip.tone}>{chip.label}</span>
              <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
                run_id
              </span>
              <code className="font-mono text-[12px] text-[color:var(--ol-subtle)]">{view.id}</code>
              <button
                type="button"
                onClick={copyId}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[color:var(--ol-line)] bg-white px-2 text-[11.5px] font-[800] text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
              >
                <Icon name={copied ? "check" : "clipboard"} size="sm" />
                {copied ? copy.copied : copy.copyId}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={view.agentSlug ? `/playground/${encodeURIComponent(view.agentSlug)}` : "/registry"}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12.5px] font-[900] text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
            >
              {copy.rerun}
            </Link>
            <Link
              href="/runs"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12.5px] font-[900] text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
            >
              {copy.back}
            </Link>
            <Link
              href={`/a2a?run_id=${encodeURIComponent(view.parentRunId ?? view.id)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12.5px] font-[900] text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
            >
              {copy.chain}
            </Link>
          </div>
        </div>
      </section>

      <section className="ol-panel grid gap-6 p-5 md:grid-cols-4">
        <StatCell label={copy.cost} value={delegated ? copy.freeDelegation : fmtPriceField(view.costCents, locale)} divider={false} />
        <StatCell label={copy.duration} value={fmtMs(view.durationMs)} />
        <StatCell label={copy.status} value={runStatusLabel(view.status, locale)} />
        <StatCell label={copy.delivery} value={delegated ? copy.deliveryNoSeparate : copy.deliverySettings} />
      </section>

      {view.evidenceSummary ? (
        <section className="ol-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="ol-kicker">{copy.evidence}</div>
              <h2 className="mt-1 text-[18px] font-black text-[color:var(--ol-ink)]">
                {coverageStatusLabel(view.evidenceSummary.coverage_status, locale)}
              </h2>
            </div>
            <span className={`ol-chip ${view.evidenceSummary.public_safe ? "ol-chip-green" : "ol-chip-mint"}`}>
              {view.evidenceSummary.public_safe ? copy.publicExample : copy.privateEvidence}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <EvidenceStat label={copy.coverage} value={coverageStatusLabel(view.evidenceSummary.coverage_status, locale)} />
            <EvidenceStat label={copy.matchedSkills} value={String(view.evidenceSummary.matched_skill_count)} />
            <EvidenceStat label={copy.missingItems} value={String(view.evidenceSummary.missing_skill_count)} />
            <EvidenceStat label={copy.usedMCP} value={String(view.evidenceSummary.used_mcp_tool_count)} />
            <EvidenceStat label={copy.artifactCount} value={`${view.evidenceSummary.artifact_count} / ${view.evidenceSummary.message_count} ${copy.messageCount}`} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 space-y-5">
          <RunEventStream locale={locale} runId={view.id} enabled={run !== null} fallbackStatus={view.status} />

          <RunMessagesPanel locale={locale} run={view} messages={messages} />

          {!delegated ? (
            <TaskCallbackSection locale={locale} runId={view.id} enabled />
          ) : null}

          <div className="ol-panel overflow-hidden">
            <div className="ol-panel-head">
              <strong>{success ? copy.output : copy.error}</strong>
              <span className={success ? "ol-chip ol-chip-green" : "ol-chip ol-chip-amber"}>
                {success ? copy.outputDelivered : copy.outputFailed}
              </span>
            </div>
            <div className="p-5">
              <div
                className="rounded-[14px] border p-5"
                style={{
                  background: success
                    ? "linear-gradient(135deg, #effbf8, #fff)"
                    : "linear-gradient(135deg, #fde7e7, #fff)",
                  borderColor: success
                    ? "rgba(15,145,135,0.18)"
                    : "rgba(217,59,59,0.18)",
                }}
              >
                <div
                  className="text-[11.5px] font-[900] uppercase tracking-[0.06em]"
                  style={{ color: success ? "var(--ol-primary-dark)" : "#7a1f1f" }}
                >
                  {success ? copy.structured : copy.errorDetail}
                </div>
                <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-[12px] bg-[#102033] p-4 text-[12.5px] leading-relaxed text-white">
                  <code>
                    {success
                      ? JSON.stringify(view.output, null, 2)
                      : JSON.stringify(
                          {
                            error_code: view.errorCode,
                            error: view.error ?? copy.unknownError,
                            ...(view.rawError && view.rawError !== view.error
                              ? { raw_error: view.rawError }
                              : {}),
                          },
                          null,
                          2,
                        )}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {artifacts.length > 0 ? (
            <div className="ol-panel overflow-hidden">
              <div className="ol-panel-head">
                <strong>{copy.artifacts}</strong>
                <span className="ol-chip ol-chip-blue">
                  {artifacts.length} {copy.artifactsUnit}
                </span>
              </div>
              <div className="grid gap-3 p-5">
                {artifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="rounded-[14px] border border-[color:var(--ol-line)] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[13px] font-[900] text-[color:var(--ol-ink)]">
                        {artifact.title}
                      </strong>
                      <span className="ol-chip ol-chip-mint">{artifact.artifact_type}</span>
                      <span className="ol-chip">{artifactVisibilityLabel(artifact.visibility, locale)}</span>
                      {artifact.mime_type ? <span className="ol-chip">{artifact.mime_type}</span> : null}
                      {artifact.source_artifact_id ? (
                        <span className="font-mono text-[11.5px] font-black text-[color:var(--ol-muted)]">
                          source:{artifact.source_artifact_id}
                        </span>
                      ) : null}
                    </div>
                    {artifact.file_uri ? (
                      <div className="mt-3 rounded-[12px] border border-[color:var(--ol-line)] bg-[#f8fbff] p-3 text-[12px] font-semibold text-[color:var(--ol-muted)]">
                        <div>
                          file:{" "}
                          <a
                            className="font-black text-[color:var(--ol-blue)] underline"
                            href={artifact.file_uri}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {artifact.file_name || artifact.file_uri}
                          </a>
                        </div>
                        {artifact.file_sha256 ? (
                          <div className="mt-1 font-mono">sha256:{artifact.file_sha256}</div>
                        ) : null}
                        {typeof artifact.file_size_bytes === "number" ? (
                          <div className="mt-1">size:{artifact.file_size_bytes} bytes</div>
                        ) : null}
                      </div>
                    ) : null}
                    <pre className="mt-3 max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[12px] bg-[#102033] p-4 text-[12px] leading-relaxed text-white">
                      <code>{JSON.stringify(artifact.content, null, 2)}</code>
                    </pre>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {delegated ? (
            <div className="ol-panel ol-panel-pad text-[13px] font-semibold text-[color:var(--ol-muted)]">
              {copy.delegatedNote}
            </div>
          ) : null}
        </section>

        <aside className="min-w-0 grid content-start gap-3.5">
          <div className="ol-panel ol-panel-pad">
            <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.meta}</strong>
            <div className="mt-3 grid gap-2 text-[12.5px]">
              <MetaRow label="Run ID" value={view.id} mono />
              <MetaRow label={copy.status} value={runStatusLabel(view.status, locale)} />
              <MetaRow label={copy.cost} value={delegated ? copy.freeDelegation : fmtPriceField(view.costCents, locale)} />
              <MetaRow label={copy.duration} value={fmtMs(view.durationMs)} mono />
              {view.parentRunId ? (
                <Link
                  href={`/run/${view.parentRunId}`}
                  className="mt-1 truncate text-[12.5px] font-black text-[color:var(--ol-primary-dark)] hover:underline"
                >
                  {copy.returnParent}
                </Link>
              ) : null}
            </div>
          </div>

          <RequirementEvidencePanel locale={locale} evidence={view.requirementEvidence} />

          <div id="delivery" className="ol-panel ol-panel-pad scroll-mt-24">
            <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.deliveryStatus}</strong>
            <div className="mt-3 grid gap-2.5">
              <DeliveryRow
                label={copy.inbox}
                value={delegated ? copy.withParent : copy.queued}
                tone={delegated ? "mint" : "green"}
              />
              <DeliveryActionRow
                label={copy.externalDelivery}
                value={externalDeliveryStatus}
                tone={externalDeliveryTone}
                href={!delegated ? deliverySettingsHref : ""}
                actionLabel={copy.deliverySettings}
              />
              <DeliveryRow
                label={copy.costRecord}
                value={delegated ? copy.freeDelegation : fmtPriceField(view.costCents, locale)}
                tone={delegated ? "mint" : "green"}
              />
            </div>
            {!delegated ? (
              <Link
                href={deliverySettingsHref}
                className="ol-mini-btn mt-3 inline-flex w-full items-center justify-center bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
              >
                {copy.manageDelivery}
              </Link>
            ) : null}
          </div>

          <NextActionPanel locale={locale} action={view.nextAction} />
        </aside>
      </div>
    </div>
  );
}

function RequirementEvidencePanel({ locale, evidence }: { locale: Locale; evidence?: RunRequirementEvidenceData }) {
  const copy =
    locale === "zh"
      ? {
          title: "任务要求证据",
          empty: "这次运行没有绑定任务 ID。调用方提供 `metadata.task_id` 时，这里会展示 Skill 与 MCP 要求的匹配情况。",
          requiredSkill: "要求 Skill",
          noDeclared: "未声明",
          matchedSkill: "命中 Skill",
          noMatch: "未命中",
          missingSkill: "缺失 Skill",
          noMissing: "无缺失",
          requiredMCP: "要求 MCP",
          usedMCP: "本次使用 MCP",
          noMCPRun: "未通过 MCP 工具运行",
          viewTask: "关联任务",
        }
      : {
          title: "Requirement evidence",
          empty: "This run is not linked to a task ID. When a caller supplies `metadata.task_id`, this panel shows how the run matched the Skill and MCP requirements.",
          requiredSkill: "Required Skills",
          noDeclared: "None declared",
          matchedSkill: "Matched Skills",
          noMatch: "No matches",
          missingSkill: "Missing Skills",
          noMissing: "None missing",
          requiredMCP: "Required MCP",
          usedMCP: "MCP used in this run",
          noMCPRun: "Not run through MCP tools",
          viewTask: "Linked task",
        };
  if (!evidence) {
    return (
      <div className="ol-panel ol-panel-pad">
        <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.title}</strong>
        <p className="mt-2 text-[12.5px] leading-[1.55] text-[color:var(--ol-muted)]">
          {copy.empty}
        </p>
      </div>
    );
  }

  const chip = evidence.coverage_status === "covered" ? "ol-chip-green" : evidence.coverage_status === "partial" ? "ol-chip-blue" : "ol-chip-amber";

  return (
    <div className="ol-panel ol-panel-pad">
      <div className="flex items-start justify-between gap-3">
        <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.title}</strong>
        <span className={`ol-chip ${chip}`}>{coverageStatusLabel(evidence.coverage_status, locale)}</span>
      </div>
      <div className="mt-3 grid gap-3">
        <EvidenceGroup title={copy.requiredSkill} items={evidence.required_skill_ids} empty={copy.noDeclared} />
        <EvidenceGroup title={copy.matchedSkill} items={evidence.matched_skill_ids} empty={copy.noMatch} tone="green" />
        <EvidenceGroup title={copy.missingSkill} items={evidence.missing_skill_ids} empty={copy.noMissing} tone="amber" />
        <EvidenceGroup title={copy.requiredMCP} items={evidence.required_mcp_tools} empty={copy.noDeclared} />
        <EvidenceGroup title={copy.usedMCP} items={evidence.used_mcp_tools} empty={copy.noMCPRun} tone="blue" />
        <div className="text-[12px] font-black text-[color:var(--ol-muted)]">
          {copy.viewTask}: <code>{evidence.task_id}</code>
        </div>
      </div>
    </div>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--ol-line)] bg-white p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[15px] font-black text-[color:var(--ol-ink)]">
        {value}
      </div>
    </div>
  );
}

function EvidenceGroup({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone?: "green" | "blue" | "amber";
}) {
  const toneClass = tone === "green" ? "ol-chip-green" : tone === "blue" ? "ol-chip-blue" : tone === "amber" ? "ol-chip-amber" : "";
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {title}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.length > 0 ? (
          items.map((item) => (
            <span key={item} className={`ol-chip ${toneClass}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-[12px] font-bold text-[color:var(--ol-muted)]">{empty}</span>
        )}
      </div>
    </div>
  );
}

type ReplayMessage = {
  id: string;
  role: string;
  content: string;
  payload: Record<string, unknown>;
  created_at?: string;
  event_sequence?: number | null;
  synthetic?: boolean;
};

function RunMessagesPanel({
  locale,
  run,
  messages,
}: {
  locale: Locale;
  run: ViewRun;
  messages: RunMessageData[];
}) {
  const copy =
    locale === "zh"
      ? {
          title: "消息回放",
          emptyMessage: "（空消息）",
          empty: "暂无可回放消息。",
          inputFallback: "请求输入",
          outputFallback: "最终输出",
          errorFallback: "运行错误",
          structured: "结构化内容",
          synthetic: "详情补全",
          messagesUnit: "条消息",
        }
      : {
          title: "Message replay",
          emptyMessage: "(empty message)",
          empty: "No replayable messages yet.",
          inputFallback: "Request input",
          outputFallback: "Final output",
          errorFallback: "Run error",
          structured: "Structured content",
          synthetic: "Added from run details",
          messagesUnit: "messages",
        };
  const replayMessages = buildReplayMessages(run, messages, locale, {
    input: copy.inputFallback,
    output: copy.outputFallback,
    error: copy.errorFallback,
  });
  return (
    <div className="ol-panel overflow-hidden">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="ol-chip ol-chip-blue">
          {replayMessages.length} {copy.messagesUnit}
        </span>
      </div>
      {replayMessages.length > 0 ? (
        <div className="grid gap-3 p-5">
          {replayMessages.map((message) => {
            const hasPayload = hasObjectContent(message.payload);
            return (
              <article
                key={message.id}
                className="rounded-[14px] border border-[color:var(--ol-line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={messageRoleChip(message.role)}>{messageRoleLabel(message.role, locale)}</span>
                  {message.event_sequence ? (
                    <span className="font-mono text-[11.5px] font-black text-[color:var(--ol-muted)]">
                      #{message.event_sequence}
                    </span>
                  ) : null}
                  <span className="text-[11.5px] font-bold text-[color:var(--ol-subtle)]">
                    {formatMessageTime(message.created_at ?? "", locale)}
                  </span>
                  {message.synthetic ? <span className="ol-chip">{copy.synthetic}</span> : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-[1.65] text-[color:var(--ol-ink)]">
                  {message.content || copy.emptyMessage}
                </p>
                {hasPayload ? (
                  <details className="mt-3 rounded-[12px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3">
                    <summary className="cursor-pointer text-[11.5px] font-black text-[color:var(--ol-muted)]">
                      {copy.structured}
                    </summary>
                    <pre className="mt-2 max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-[#102033] p-3 text-[11.5px] leading-relaxed text-white">
                      <code>{JSON.stringify(message.payload, null, 2)}</code>
                    </pre>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-5 text-[13px] font-semibold text-[color:var(--ol-muted)]">
          {copy.empty}
        </div>
      )}
    </div>
  );
}

function buildReplayMessages(
  run: ViewRun,
  messages: RunMessageData[],
  locale: Locale,
  fallback: { input: string; output: string; error: string },
): ReplayMessage[] {
  const items: ReplayMessage[] = messages.map((message) => ({
    ...message,
    payload: message.payload ?? {},
  }));
  const hasUserMessage = items.some((message) => message.role === "user");
  if (!hasUserMessage && hasObjectContent(run.input)) {
    items.unshift({
      id: `${run.id}:input`,
      role: "user",
      content: payloadText(run.input, fallback.input, locale),
      payload: run.input,
      synthetic: true,
    });
  }
  if (run.status === "success" && hasObjectContent(run.output)) {
    items.push({
      id: `${run.id}:output`,
      role: "result",
      content: payloadText(run.output, fallback.output, locale),
      payload: run.output,
      synthetic: true,
    });
  }
  if (run.status !== "success" && run.error) {
    items.push({
      id: `${run.id}:error`,
      role: "error",
      content: run.error || fallback.error,
      payload: {
        error: run.error,
        ...(run.rawError && run.rawError !== run.error
          ? { raw_error: run.rawError }
          : {}),
        status: run.status,
      },
      synthetic: true,
    });
  }
  return items;
}

function hasObjectContent(value?: Record<string, unknown>): boolean {
  return !!value && Object.keys(value).length > 0;
}

function payloadText(payload: Record<string, unknown>, fallback: string, locale: Locale): string {
  for (const key of ["text", "content", "message", "summary", "result", "answer", "final", "response"]) {
    const raw = payload[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return locale === "zh"
    ? `${fallback}已生成，展开查看完整 JSON。`
    : `${fallback} is available. Expand to view the full JSON.`;
}

function messageRoleLabel(role: string, locale: Locale): string {
  if (role === "user") return locale === "zh" ? "用户" : "User";
  if (role === "agent") return "Agent";
  if (role === "tool") return "Tool";
  if (role === "platform") return locale === "zh" ? "系统" : "System";
  if (role === "result") return locale === "zh" ? "结果" : "Result";
  if (role === "error") return locale === "zh" ? "错误" : "Error";
  return role;
}

function messageRoleChip(role: string): string {
  if (role === "agent") return "ol-chip ol-chip-green";
  if (role === "user") return "ol-chip ol-chip-mint";
  if (role === "tool") return "ol-chip ol-chip-blue";
  if (role === "result") return "ol-chip ol-chip-green";
  if (role === "error") return "ol-chip ol-chip-amber";
  return "ol-chip";
}

function formatMessageTime(value: string, locale: Locale): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCell({
  label,
  value,
  divider = true,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className="grid"
      style={{
        borderLeft: divider ? "1px solid var(--ol-line)" : "0",
        paddingLeft: divider ? 22 : 0,
      }}
    >
      <span className="font-mono text-[24px] font-[950] leading-tight tracking-tight text-[color:var(--ol-ink)]">
        {value}
      </span>
      <span className="mt-1 text-[12px] font-[800] text-[color:var(--ol-muted)]">{label}</span>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[68px_1fr] items-baseline gap-2">
      <span className="text-[11.5px] font-[800] text-[color:var(--ol-muted)]">{label}</span>
      <span
        className={`truncate text-[12.5px] font-[900] text-[color:var(--ol-ink)] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function DeliveryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "mint";
}) {
  const chip =
    tone === "green" ? "ol-chip-green" : tone === "amber" ? "ol-chip-amber" : "ol-chip-mint";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
      <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">{label}</span>
      <span className={`ol-chip ${chip}`}>{value}</span>
    </div>
  );
}

function DeliveryActionRow({
  label,
  value,
  tone,
  href,
  actionLabel,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "mint";
  href: string;
  actionLabel: string;
}) {
  const chip =
    tone === "green" ? "ol-chip-green" : tone === "amber" ? "ol-chip-amber" : "ol-chip-mint";
  return (
    <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
      <span className="min-w-0 text-[12.5px] font-bold text-[color:var(--ol-muted)]">{label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`ol-chip ${chip}`}>{value}</span>
        {href ? (
          <Link
            href={href}
            className="inline-flex h-6 items-center justify-center rounded-lg border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-2 text-[11.5px] font-black text-[color:var(--ol-primary-dark)] hover:border-[color:var(--ol-primary)]/40"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function NextActionPanel({ locale, action }: { locale: Locale; action?: RunNextAction }) {
  const copy =
    locale === "zh"
      ? {
          fallbackLabel: "查看结果并决定下一步",
          fallbackHint: "运行详情会根据状态、Agent 输出和投递设置给出下一步动作。你也可以先查看输出，或返回任务调整需求。",
          title: "下一步建议",
          agent: "Agent 建议",
          platform: "系统建议",
          open: "打开下一步",
        }
      : {
          fallbackLabel: "Review the result and choose the next step",
          fallbackHint: "Run detail suggests a next step based on status, Agent output, and delivery settings. You can review output or return to the task loop first.",
          title: "Suggested next step",
          agent: "Agent suggestion",
          platform: "System suggestion",
          open: "Open next step",
        };
  const label = action?.label ?? copy.fallbackLabel;
  const hint =
    action?.hint ??
    copy.fallbackHint;
  const href = action?.href;
  const isHash = href?.startsWith("#");
  const isInternal = href?.startsWith("/");

  return (
    <div
      className="ol-panel ol-panel-pad"
      style={{ background: "linear-gradient(135deg, #effbf8, #fff)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="text-[13px] font-[900] text-[color:var(--ol-primary-dark)]">
          {copy.title}
        </strong>
        {action?.source ? (
          <span className="ol-chip ol-chip-mint">{action.source === "agent" ? copy.agent : copy.platform}</span>
        ) : null}
      </div>
      <div className="mt-2 text-[14px] font-black text-[color:var(--ol-ink)]">{label}</div>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[color:var(--ol-muted)]">
        {hint}
      </p>
      {href ? (
        isInternal || isHash ? (
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-[900] text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {copy.open} <Icon name="arrow-up-right" size="sm" />
          </Link>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-[900] text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {copy.open} <Icon name="arrow-up-right" size="sm" />
          </a>
        )
      ) : null}
    </div>
  );
}
