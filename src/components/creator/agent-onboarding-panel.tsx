"use client";

import Link from "next/link";
import { PlayCircle, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { A2AAccessPanel } from "@/components/creator/a2a-access-panel";
import { SkillsDialog } from "@/components/creator/skills-dialog";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
  connectionModeLabel as localizedConnectionModeLabel,
  dryRunResultLabel,
  localizedBackendText,
  localizedBackendTextList,
  runStatusLabel,
} from "@/lib/i18n-labels";
import {
  agentOnboardingMessages,
  runtimeDiagnosticMessages,
  type RuntimeDiagnosticCode,
} from "@/messages/agent";

type JSONMap = Record<string, unknown>;

export interface OnboardingAgent {
  id: string;
  slug: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "disabled";
  lifecycle_status: "active" | "disabled";
  visibility: "public" | "unlisted" | "private";
  certification_status: "unreviewed" | "pending" | "certified" | "rejected";
  endpoint_url: string;
  connection_mode: "direct_http" | "mcp_server" | "runtime_ws" | "runtime_pull";
  mcp_tool_name?: string;
}

export interface CapabilityResponse {
  id: string;
  agent_id: string;
  input_schema: JSONMap;
  output_schema: JSONMap;
  summary: string;
  version: number;
  published_at: string;
  updated_at: string;
}

export interface ExampleResponse {
  id: string;
  agent_id: string;
  title: string;
  input_json: JSONMap;
  expected_output_json?: JSONMap;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatusResponse {
  agent_id: string;
  endpoint_set: boolean;
  capabilities_set: boolean;
  examples_set: boolean;
  dry_run_passed: boolean;
  dry_run_last_result: "pending" | "pass" | "fail";
  dry_run_error?: string;
  dry_run_at?: string;
  updated_at: string;
}

export interface OnboardingResponse {
  status: OnboardingStatusResponse;
  capability?: CapabilityResponse;
  examples: ExampleResponse[];
  availability?: AgentAvailability;
}

export interface DryRunResponse {
  result: "pass" | "fail";
  error?: string;
  output?: Record<string, unknown>;
  availability?: AgentAvailability;
  repair_hints?: string[];
}

export interface AgentAvailability {
  status: "unknown" | "healthy" | "degraded" | "unreachable" | string;
  label: string;
  hint: string;
  last_successful_run_at?: string;
  last_failed_run_at?: string;
  last_checked_at?: string;
  consecutive_failures: number;
}

type RuntimeWorkbench = {
  agent: {
    id: string;
    slug: string;
    name: string;
    connection_mode: "direct_http" | "mcp_server" | "runtime_ws" | "runtime_pull" | string;
    lifecycle_status: string;
    visibility: string;
    certification_status: string;
    readiness_callable: boolean;
    availability_status: string;
  };
  runtime: {
    active_token_count: number;
    pending_run_count: number;
    claim_now: boolean;
    last_runtime_activity_at?: string;
    last_claimed_at?: string;
    last_result_at?: string;
    recommended_heartbeat_after_seconds: number;
    max_claim_wait_seconds: number;
  };
  tokens: Array<{
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    last_used_at?: string;
    revoked_at?: string;
    created_at: string;
  }>;
  recent_runs: Array<{
    run_id: string;
    status: string;
    source: string;
    started_at: string;
    claimed_at?: string;
    finished_at?: string;
    error_code?: string;
    error_message?: string;
    detail_url: string;
  }>;
  diagnostics: Array<{
    code: string;
    severity: "success" | "info" | "warning" | "error" | string;
    message: string;
    next_action: string;
  }>;
};

export interface OnboardingSkill {
  id: string;
  category: string;
  name: string;
  description: string;
}

interface Props {
  agent: OnboardingAgent;
  initialOnboarding: OnboardingResponse;
  initialSkills: OnboardingSkill[];
  locale?: Locale;
}

const DEFAULT_INPUT_SCHEMA = {
  type: "object",
  properties: {
    query: { type: "string", description: "用户任务描述" },
  },
  required: ["query"],
};

const DEFAULT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    result: { type: "string", description: "Agent 返回结果" },
  },
  required: ["result"],
};

const DEFAULT_EXAMPLE_INPUT = {
  query: "帮我分析这份合同中的关键风险。",
};

const DEFAULT_EXAMPLE_OUTPUT = {
  result: "已识别 3 个关键风险，并按严重程度排序。",
};

const DEFAULT_EXAMPLE_INPUT_EN = {
  query: "Analyze the key risks in this contract.",
};

const DEFAULT_EXAMPLE_OUTPUT_EN = {
  result: "Identified 3 key risks and ranked them by severity.",
};

function pretty(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJSONObject(value: string, label: string, locale: Locale): JSONMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(locale === "zh" ? `${label} 不是合法 JSON` : `${label} is not valid JSON`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(locale === "zh" ? `${label} 必须是 JSON object` : `${label} must be a JSON object`);
  }
  return parsed as JSONMap;
}

function endpointHost(endpointURL: string): string {
  try {
    return new URL(endpointURL).host;
  } catch {
    return endpointURL;
  }
}

function connectionModeLabel(agent: OnboardingAgent, locale: Locale): string {
  if (agent.connection_mode === "mcp_server") {
    return `${locale === "zh" ? "已有 MCP 工具" : "Existing MCP tool"} · ${agent.mcp_tool_name || (locale === "zh" ? "未配置工具" : "tool not configured")}`;
  }
  if (agent.connection_mode === "runtime_ws") {
    return locale === "zh" ? "Agent Node / WebSocket · 出站长连接" : "Agent Node / WebSocket · outbound socket";
  }
  if (agent.connection_mode === "runtime_pull") {
    return locale === "zh" ? "Agent Node（长轮询）· WebSocket 降级领取" : "Runtime Pull · fallback claim loop";
  }
  return `HTTP · ${endpointHost(agent.endpoint_url)}`;
}

function formatDate(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh" ? "尚未更新" : "Not updated";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(agent: OnboardingAgent, locale: Locale): string {
  if (agent.lifecycle_status === "disabled") return locale === "zh" ? "已停用" : "Disabled";
  const visibility =
    locale === "zh"
      ? { public: "已公开", unlisted: "链接可见", private: "私有" }[agent.visibility]
      : { public: "Public", unlisted: "Unlisted", private: "Private" }[agent.visibility];
  const certification = {
    unreviewed: locale === "zh" ? "未提交实例认证" : "Not submitted for instance certification",
    pending: locale === "zh" ? "实例认证中" : "Instance certification pending",
    certified: locale === "zh" ? "实例已认证" : "Instance certified",
    rejected: locale === "zh" ? "实例认证未通过" : "Instance certification rejected",
  }[agent.certification_status];
  return `${visibility} · ${certification}`;
}

function unknownAvailability(locale: Locale): AgentAvailability {
  return {
    status: "unknown",
    label: availabilityStatusLabel("unknown", locale),
    hint: availabilityStatusHint("unknown", locale),
    consecutive_failures: 0,
  };
}

function availabilityChipClass(status: string): string {
  if (status === "healthy") return "ol-chip-green";
  if (status === "degraded" || status === "unreachable") return "ol-chip-amber";
  return "ol-chip-mint";
}

function isAvailabilityCallable(availability: AgentAvailability): boolean {
  return (
    availability.status === "healthy" ||
    (Boolean(availability.last_successful_run_at) && availability.status !== "unreachable")
  );
}

export function AgentOnboardingPanel({
  agent,
  initialOnboarding,
  initialSkills,
  locale = "zh",
}: Props) {
  const copy = agentOnboardingMessages[locale];
  const { fetch: apiFetch } = useApi();
  const [agentState, setAgentState] = useState(agent);
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [capSummary, setCapSummary] = useState(
    initialOnboarding.capability?.summary ?? "",
  );
  const [inputSchema, setInputSchema] = useState(
    pretty(initialOnboarding.capability?.input_schema ?? DEFAULT_INPUT_SCHEMA),
  );
  const [outputSchema, setOutputSchema] = useState(
    pretty(initialOnboarding.capability?.output_schema ?? DEFAULT_OUTPUT_SCHEMA),
  );
  const [exampleTitle, setExampleTitle] = useState(copy.defaultExampleTitle);
  const [exampleInput, setExampleInput] = useState(
    pretty(locale === "zh" ? DEFAULT_EXAMPLE_INPUT : DEFAULT_EXAMPLE_INPUT_EN),
  );
  const [exampleOutput, setExampleOutput] = useState(
    pretty(locale === "zh" ? DEFAULT_EXAMPLE_OUTPUT : DEFAULT_EXAMPLE_OUTPUT_EN),
  );
  const [savingCapability, setSavingCapability] = useState(false);
  const [addingExample, setAddingExample] = useState(false);
  const [deletingExampleId, setDeletingExampleId] = useState<string | null>(null);
  const [runningDryRun, setRunningDryRun] = useState(false);
  const [dryRunOutput, setDryRunOutput] = useState<Record<string, unknown> | null>(null);
  const [availability, setAvailability] = useState<AgentAvailability>(
    initialOnboarding.availability ?? unknownAvailability(locale),
  );
  const [repairHints, setRepairHints] = useState<string[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [requestingCertification, setRequestingCertification] = useState(false);
  const callable = agentState.lifecycle_status === "active" && isAvailabilityCallable(availability);
  const localizedAvailabilityLabel = availabilityStatusLabel(availability.status, locale, availability.label);
  const localizedAvailabilityHint = availabilityStatusHint(availability.status, locale, availability.hint);
  const localizedRepairHints = localizedBackendTextList(
    repairHints,
    locale,
    locale === "zh"
      ? "请检查 Agent 的连接配置和运行日志，然后重新执行健康检查。"
      : "Check the Agent connection settings and runtime logs, then run the health check again.",
  );
  const dryRunStatusText = onboarding.status.dry_run_error
    ? localizedBackendText(onboarding.status.dry_run_error, locale, copy.healthFail)
    : onboarding.status.dry_run_passed
      ? copy.dryRunPassed
      : copy.dryRunNotRun;

  const completedCount = useMemo(() => {
    const s = onboarding.status;
    return [
      s.endpoint_set,
      s.capabilities_set,
      s.examples_set,
      s.dry_run_passed,
    ].filter(Boolean).length;
  }, [onboarding.status]);

  const completionPercent = Math.round((completedCount / 4) * 100);

  const reload = async () => {
    const next = await apiFetch<OnboardingResponse>(
      `/api/v1/creator/agents/${agent.id}/onboarding`,
    );
    setOnboarding(next);
    setAvailability(next.availability ?? unknownAvailability(locale));
    if (next.capability) {
      setCapSummary(next.capability.summary);
      setInputSchema(pretty(next.capability.input_schema));
      setOutputSchema(pretty(next.capability.output_schema));
    }
  };

  const saveCapability = async () => {
    setSavingCapability(true);
    try {
      const input = parseJSONObject(inputSchema, "Input schema", locale);
      const output = parseJSONObject(outputSchema, "Output schema", locale);
      await apiFetch<CapabilityResponse>(
        `/api/v1/creator/agents/${agent.id}/capabilities`,
        {
          method: "PUT",
          body: {
            input_schema: input,
            output_schema: output,
            summary: capSummary,
          },
        },
      );
      await reload();
      toast.success(copy.capabilitySaved);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.capabilitySaveFailed));
    } finally {
      setSavingCapability(false);
    }
  };

  const addExample = async () => {
    setAddingExample(true);
    try {
      const input = parseJSONObject(exampleInput, copy.exampleInput, locale);
      const output = exampleOutput.trim()
        ? parseJSONObject(exampleOutput, copy.exampleOutput, locale)
        : undefined;
      await apiFetch<ExampleResponse>(
        `/api/v1/creator/agents/${agent.id}/examples`,
        {
          method: "POST",
          body: {
            title: exampleTitle.trim(),
            input_json: input,
            expected_output_json: output,
            sort_order: onboarding.examples.length,
          },
        },
      );
      setExampleTitle("");
      setExampleInput(pretty(locale === "zh" ? DEFAULT_EXAMPLE_INPUT : DEFAULT_EXAMPLE_INPUT_EN));
      setExampleOutput("");
      await reload();
      toast.success(copy.exampleAdded);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.exampleAddFailed));
    } finally {
      setAddingExample(false);
    }
  };

  const deleteExample = async (exampleId: string) => {
    setDeletingExampleId(exampleId);
    try {
      await apiFetch(
        `/api/v1/creator/agents/${agent.id}/examples/${exampleId}`,
        { method: "DELETE" },
      );
      await reload();
      toast.success(copy.exampleDeleted);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.exampleDeleteFailed));
    } finally {
      setDeletingExampleId(null);
    }
  };

  const runDryRun = async () => {
    if (onboarding.examples.length === 0) {
      toast.error(copy.addExampleFirst);
      return;
    }
    setRunningDryRun(true);
    setDryRunOutput(null);
    try {
      const res = await apiFetch<DryRunResponse>(
        `/api/v1/creator/agents/${agent.id}/health-check`,
        { method: "POST" },
      );
      setDryRunOutput(res.output ?? null);
      setAvailability(res.availability ?? unknownAvailability(locale));
      setRepairHints(res.repair_hints ?? []);
      await reload();
      if (res.result === "pass") {
        toast.success(copy.healthPass);
      } else {
        toast.error(copy.healthFail);
      }
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.healthRunFailed));
    } finally {
      setRunningDryRun(false);
    }
  };

  const updateVisibility = async (visibility: OnboardingAgent["visibility"]) => {
    setSavingVisibility(true);
    try {
      const updated = await apiFetch<OnboardingAgent>(
        `/api/v1/creator/agents/${agent.id}/visibility`,
        { method: "PATCH", body: { visibility } },
      );
      setAgentState((current) => ({ ...current, visibility: updated.visibility }));
      toast.success(copy.visibilitySaved);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.visibilityFailed));
    } finally {
      setSavingVisibility(false);
    }
  };

  const requestCertification = async () => {
    setRequestingCertification(true);
    try {
      await apiFetch(`/api/v1/creator/agents/${agent.id}/request-certification`, {
        method: "POST",
        body: {},
      });
      setAgentState((current) => ({ ...current, certification_status: "pending" }));
      toast.success(copy.certSubmitted);
    } catch (err) {
      toast.error(errorMessage(err, locale, copy.certFailed));
    } finally {
      setRequestingCertification(false);
    }
  };

  return (
    <div className="ol-onboarding-layout">
      <section className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 14px", border: 0 }}
          >
            <strong>{copy.completion}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-muted)]">
              {completedCount}/4 · {completionPercent}%
            </span>
          </div>
          <div className="ol-progress-track" aria-label={copy.completion}>
            <div
              className="ol-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="ol-onboarding-steps">
            <Step
              title={copy.endpoint}
              done={onboarding.status.endpoint_set}
              detail={connectionModeLabel(agent, locale)}
            />
            <Step
              title={copy.capability}
              done={onboarding.status.capabilities_set}
              detail={
                onboarding.capability
                  ? `v${onboarding.capability.version} · ${formatDate(onboarding.capability.updated_at, locale)}`
                  : copy.pendingSave
              }
            />
            <Step
              title={copy.examples}
              done={onboarding.status.examples_set}
              detail={copy.countItems(onboarding.examples.length)}
            />
            <Step
              title={copy.dryRun}
              done={onboarding.status.dry_run_passed}
              detail={dryRunResultLabel(onboarding.status.dry_run_last_result, locale)}
            />
          </div>
        </div>

        <div className="ol-panel ol-panel-pad space-y-4">
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 12px", border: 0 }}
          >
            <strong>{copy.capability}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-muted)]">
              JSON Schema
            </span>
          </div>
          <label className="ol-publish-field-label">{copy.summary}</label>
          <input
            value={capSummary}
            onChange={(event) => setCapSummary(event.target.value)}
            className="ol-publish-input"
            placeholder={copy.summaryPlaceholder}
            maxLength={1000}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <SchemaEditor
              label={copy.inputSchema}
              value={inputSchema}
              onChange={setInputSchema}
            />
            <SchemaEditor
              label={copy.outputSchema}
              value={outputSchema}
              onChange={setOutputSchema}
            />
          </div>
          <button
            type="button"
            onClick={saveCapability}
            disabled={savingCapability}
            className="ol-publish-submit"
          >
            {savingCapability ? copy.saving : copy.saveCapability}
          </button>
        </div>

        <div className="ol-panel ol-panel-pad space-y-4">
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 12px", border: 0 }}
          >
            <strong>{copy.examplesTitle}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-muted)]">
              {onboarding.examples.length}/20
            </span>
          </div>

          {onboarding.examples.length > 0 ? (
            <div className="space-y-2">
              {onboarding.examples.map((example) => (
                <div key={example.id} className="ol-example-row">
                  <div className="min-w-0">
                    <strong className="truncate">{example.title}</strong>
                    <code className="mt-1 block truncate text-[11.5px] text-[color:var(--ol-muted)]">
                      {pretty(example.input_json).replaceAll("\n", " ")}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteExample(example.id)}
                    disabled={deletingExampleId === example.id}
                    className="ol-mini-btn"
                  >
                    {copy.delete}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="ol-example-form">
            <input
              value={exampleTitle}
              onChange={(event) => setExampleTitle(event.target.value)}
              className="ol-publish-input"
              placeholder={copy.exampleTitlePlaceholder}
              maxLength={120}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <SchemaEditor
                label={copy.inputJSON}
                value={exampleInput}
                onChange={setExampleInput}
              />
              <SchemaEditor
                label={copy.expectedOutputJSON}
                value={exampleOutput}
                onChange={setExampleOutput}
              />
            </div>
            <button
              type="button"
              onClick={addExample}
              disabled={addingExample}
              className="ol-mini-btn ol-mini-btn-primary"
            >
              {addingExample ? copy.adding : copy.addExample}
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad space-y-3">
          <div>
            <div className="ol-kicker">Agent</div>
            <h2 className="mt-1 text-[22px] font-black tracking-normal text-[color:var(--ol-ink)]">
              {agentState.name}
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[color:var(--ol-muted)]">
              {agentState.slug} · {statusLabel(agentState, locale)}
            </p>
          </div>
          <div className="ol-info-card">
            <strong>{copy.endpoint}</strong>
            <span>{connectionModeLabel(agentState, locale)}</span>
            {agentState.connection_mode !== "runtime_ws" && agentState.connection_mode !== "runtime_pull" ? (
              <code className="mt-1 block break-all text-[11.5px] text-[color:var(--ol-muted)]">
                {agentState.endpoint_url}
              </code>
            ) : (
              <span className="mt-1 text-[12px] text-[color:var(--ol-muted)]">
                {copy.tokenPolling}
              </span>
            )}
          </div>
          <div className="ol-info-card">
            <strong>{copy.visibility}</strong>
            <select
              value={agentState.visibility}
              onChange={(event) =>
                void updateVisibility(event.target.value as OnboardingAgent["visibility"])
              }
              disabled={savingVisibility || agentState.lifecycle_status === "disabled"}
              className="ol-publish-input mt-2"
              aria-label={copy.visibility}
            >
              <option value="public">{copy.visibilityOptions.public}</option>
              <option value="unlisted">{copy.visibilityOptions.unlisted}</option>
              <option value="private">{copy.visibilityOptions.private}</option>
            </select>
          </div>
          <div className="ol-info-card">
            <strong>{copy.certification}</strong>
            <span>{statusLabel(agentState, locale).split(" · ")[1]}</span>
            {agentState.certification_status === "unreviewed" ||
            agentState.certification_status === "rejected" ? (
              <button
                type="button"
                onClick={() => void requestCertification()}
                disabled={requestingCertification}
                className="ol-mini-btn mt-2 w-fit"
              >
                {requestingCertification ? copy.submitting : copy.requestCertification}
              </button>
            ) : null}
          </div>
          <div className="ol-info-card">
            <strong>{copy.skills}</strong>
            <span>
              {initialSkills.length > 0
                ? initialSkills.map((skill) => skill.name).join("、")
                : copy.noSkills}
            </span>
            <button
              type="button"
              onClick={() => setSkillsOpen(true)}
              className="ol-mini-btn mt-2 w-fit"
            >
              {copy.editSkills}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/hub" className="ol-mini-btn">
              {copy.backHub}
            </Link>
            <Link href={`/hub/agents/${agentState.slug}/settings`} className="ol-mini-btn gap-1.5">
              <Settings className="size-3.5" aria-hidden="true" />
              {copy.settings}
            </Link>
            {agentState.visibility !== "private" ? (
              <Link href={`/agents/${agentState.slug}`} className="ol-mini-btn">
                {copy.publicDetail}
              </Link>
            ) : null}
            {callable ? (
              <Link href={`/playground/${agentState.slug}`} className="ol-mini-btn ol-mini-btn-primary gap-1.5">
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {locale === "zh" ? "试用台" : "Playground"}
              </Link>
            ) : (
              <span
                className="ol-mini-btn cursor-not-allowed gap-1.5 opacity-60"
                title={localizedAvailabilityHint}
              >
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {copy.playgroundUnavailable}
              </span>
            )}
            <Link href={`/hub/agents/${agentState.slug}/benchmarks`} className="ol-mini-btn">
              {locale === "zh" ? "能力测评" : "Benchmark"}
            </Link>
          </div>
        </div>

        <RuntimeWorkbenchPanel agentId={agent.id} locale={locale} title={copy.workbenchTitle} />

        <div className="ol-panel ol-panel-pad space-y-2">
          <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">
            {copy.healthTitle}
          </strong>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`ol-chip ${availabilityChipClass(availability.status)}`}>
              {localizedAvailabilityLabel}
            </span>
            {availability.last_checked_at ? (
              <span className="text-[12px] font-bold text-[color:var(--ol-muted)]">
                {copy.lastChecked}: {formatDate(availability.last_checked_at, locale)}
                {availability.consecutive_failures > 0
                  ? ` · ${copy.failures(availability.consecutive_failures)}`
                  : ""}
              </span>
            ) : null}
          </div>
          <p className="text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">
            {dryRunStatusText}
          </p>
          {availability.status !== "healthy" ? (
            <div className="rounded-xl border border-[color:var(--ol-amber)]/25 bg-[color:var(--ol-amber-soft)] p-3 text-[12.5px] font-semibold leading-6 text-[#7a4b12]">
              {localizedAvailabilityHint}
            </div>
          ) : null}
          <button
            type="button"
            onClick={runDryRun}
            disabled={runningDryRun || onboarding.examples.length === 0}
            className="ol-mini-btn ol-mini-btn-primary"
          >
            {runningDryRun ? copy.checking : copy.runHealth}
          </button>
          {localizedRepairHints.length > 0 ? (
            <div className="rounded-xl border border-[color:var(--ol-line)] bg-white p-3">
              <strong className="text-[12px] font-black text-[color:var(--ol-ink)]">
                {copy.repair}
              </strong>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] font-semibold leading-6 text-[color:var(--ol-muted)]">
                {localizedRepairHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {dryRunOutput ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[color:var(--ol-soft)] p-2 text-[11.5px] leading-5 text-[color:var(--ol-ink)]">
              {JSON.stringify(dryRunOutput, null, 2)}
            </pre>
          ) : null}
        </div>

        <A2AAccessPanel agentId={agent.id} locale={locale} />
      </aside>
      {skillsOpen ? (
        <SkillsDialog
          agentId={agent.id}
          agentSlug={agent.slug}
          agentName={agent.name}
          open={true}
          onClose={() => setSkillsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function RuntimeWorkbenchPanel({
  agentId,
  locale,
  title,
}: {
  agentId: string;
  locale: Locale;
  title: string;
}) {
  const { fetch: apiFetch } = useApi();
  const [workbench, setWorkbench] = useState<RuntimeWorkbench | null>(null);
  const [loading, setLoading] = useState(true);
  const copy =
    locale === "zh"
      ? {
          loadFailed: "运行时工作台暂时不可用",
          callable: "可调用",
          notCallable: "未达可调用",
          activeTokens: "有效凭证",
          pendingRuns: "待领取",
          lastActivity: "最近活动",
          lastClaim: "最近领取",
          lastResult: "最近回传",
          heartbeat: "建议心跳",
          claimWait: "最长领取等待",
          diagnostics: "诊断",
          recentRuns: "最近运行",
          noRuns: "暂无运行记录",
          openRun: "打开",
        }
      : {
          loadFailed: "Workbench is temporarily unavailable",
          callable: "Callable",
          notCallable: "Not callable",
          activeTokens: "Active credentials",
          pendingRuns: "Pending",
          lastActivity: "Last activity",
          lastClaim: "Last claim",
          lastResult: "Last result",
          heartbeat: "Heartbeat",
          claimWait: "Claim wait",
          diagnostics: "Diagnostics",
          recentRuns: "Recent runs",
          noRuns: "No runs yet",
          openRun: "Open",
        };

  useEffect(() => {
    let active = true;
    apiFetch<RuntimeWorkbench>(`/api/v1/creator/agents/${agentId}/runtime-workbench`)
      .then((payload) => {
        if (active) setWorkbench(payload);
      })
      .catch(() => {
        if (active) setWorkbench(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId, apiFetch]);

  if (loading) {
    return (
      <div className="ol-panel ol-panel-pad text-[13px] font-bold text-[color:var(--ol-muted)]">
        {title}...
      </div>
    );
  }
  if (!workbench) {
    return (
      <div className="ol-panel ol-panel-pad text-[13px] font-bold text-[color:var(--ol-muted)]">
        {copy.loadFailed}
      </div>
    );
  }
  const workbenchAgent = workbench.agent ?? {
    connection_mode: "direct_http",
    readiness_callable: false,
  };
  const runtime = workbench.runtime ?? {};
  const diagnostics = Array.isArray(workbench.diagnostics) ? workbench.diagnostics : [];
  const recentRuns = Array.isArray(workbench.recent_runs) ? workbench.recent_runs : [];
  const connectionMode = workbenchAgent.connection_mode ?? "direct_http";
  const callable = Boolean(workbenchAgent.readiness_callable);

  return (
    <div className="ol-panel ol-panel-pad space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="ol-kicker">{title}</div>
          <strong className="mt-1 block text-[15px] font-black text-[color:var(--ol-ink)]">
            {localizedConnectionModeLabel(connectionMode, locale)}
          </strong>
        </div>
        <span className={`ol-chip ${callable ? "ol-chip-green" : "ol-chip-amber"}`}>
          {callable ? copy.callable : copy.notCallable}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <WorkbenchMetric label={copy.activeTokens} value={String(runtime.active_token_count ?? 0)} />
        <WorkbenchMetric label={copy.pendingRuns} value={String(runtime.pending_run_count ?? 0)} />
        <WorkbenchMetric label={copy.lastActivity} value={formatDate(runtime.last_runtime_activity_at, locale)} />
        <WorkbenchMetric label={copy.lastClaim} value={formatDate(runtime.last_claimed_at, locale)} />
        <WorkbenchMetric label={copy.lastResult} value={formatDate(runtime.last_result_at, locale)} />
        <WorkbenchMetric
          label={copy.heartbeat}
          value={`${runtime.recommended_heartbeat_after_seconds ?? 0}s / ${copy.claimWait} ${runtime.max_claim_wait_seconds ?? 0}s`}
        />
      </div>

      <div className="rounded-xl border border-[color:var(--ol-line)] bg-white p-3">
        <strong className="text-[12px] font-black text-[color:var(--ol-ink)]">
          {copy.diagnostics}
        </strong>
        <div className="mt-2 grid gap-1.5">
          {diagnostics.map((item) => (
            <div key={`${item.code}:${item.next_action}`} className="flex items-start gap-2 text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${diagnosticDot(item.severity)}`} />
              <span>{localizedRuntimeDiagnostic(item.code, item.message, locale)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--ol-line)] bg-white p-3">
        <strong className="text-[12px] font-black text-[color:var(--ol-ink)]">
          {copy.recentRuns}
        </strong>
        {recentRuns.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {recentRuns.slice(0, 4).map((run) => (
              <div key={run.run_id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={`ol-chip ${run.status === "success" ? "ol-chip-green" : run.status === "running" ? "ol-chip-mint" : "ol-chip-amber"}`}>
                    {runStatusLabel(run.status, locale)}
                  </span>
                  <code className="ml-2 text-[11px] text-[color:var(--ol-muted)]">
                    {run.run_id.slice(0, 8)}
                  </code>
                </div>
                <Link href={run.detail_url || `/run/${run.run_id}`} className="text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline">
                  {copy.openRun}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] font-semibold text-[color:var(--ol-muted)]">
            {copy.noRuns}
          </p>
        )}
      </div>
    </div>
  );
}

function WorkbenchMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--ol-line)] bg-white p-3">
      <div className="text-[10.5px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
        {value}
      </div>
    </div>
  );
}

function diagnosticDot(severity: string): string {
  if (severity === "success") return "bg-[color:var(--ol-primary)]";
  if (severity === "error") return "bg-red-500";
  if (severity === "warning") return "bg-[color:var(--ol-amber)]";
  return "bg-[color:var(--ol-blue)]";
}

function localizedRuntimeDiagnostic(code: string, fallback: string, locale: Locale): string {
  const message = runtimeDiagnosticMessages[locale][code as RuntimeDiagnosticCode];
  if (message) return message;
  return localizedBackendText(
    fallback,
    locale,
    locale === "zh"
      ? "请检查 Agent Node 连接和近期运行状态。"
      : "Review the Agent Node connection and recent runs.",
  );
}

function Step({
  title,
  done,
  detail,
}: {
  title: string;
  done: boolean;
  detail: string;
}) {
  return (
    <div className={`ol-onboarding-step${done ? " done" : ""}`}>
      <span>{done ? "✓" : "·"}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function SchemaEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="ol-publish-field-label">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ol-publish-input ol-code-textarea"
        spellCheck={false}
      />
    </label>
  );
}

function errorMessage(err: unknown, locale: Locale, fallback: string): string {
  return localizedErrorMessage(err, locale, fallback);
}
