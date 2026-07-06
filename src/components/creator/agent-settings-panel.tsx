"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ExternalLink, PlayCircle, Save, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  certificationStatusLabel,
  connectionModeLabel as localizedConnectionModeLabel,
  lifecycleStatusLabel,
  visibilityLabel,
} from "@/lib/i18n-labels";

type Visibility = "public" | "unlisted" | "private";
type LifecycleStatus = "active" | "disabled";
type CertificationStatus = "unreviewed" | "pending" | "certified" | "rejected";
type ConnectionMode = "direct_http" | "mcp_server" | "runtime_ws" | "runtime_pull";

export interface EditableAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  endpoint_url: string;
  price_per_call_cents: number;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "disabled";
  lifecycle_status: LifecycleStatus;
  visibility: Visibility;
  certification_status: CertificationStatus;
  rejection_reason?: string | null;
  total_calls: number;
  total_revenue_cents: number;
  connection_mode?: ConnectionMode;
  mcp_tool_name?: string | null;
  availability?: {
    status: "unknown" | "healthy" | "degraded" | "unreachable" | string;
    label: string;
    hint: string;
    last_successful_run_at?: string;
    last_failed_run_at?: string;
    last_checked_at?: string;
    consecutive_failures: number;
  };
  readiness?: {
    callable: boolean;
    availability_status?: string;
  };
}

interface Props {
  agent: EditableAgent;
  locale: Locale;
}

interface FormState {
  name: string;
  description: string;
  endpointURL: string;
  endpointAuthHeader: string;
  clearEndpointAuthHeader: boolean;
  pricePerCallCents: string;
  tagsText: string;
  visibility: Visibility;
  connectionMode: ConnectionMode;
  mcpToolName: string;
}

function formFromAgent(agent: EditableAgent): FormState {
  return {
    name: agent.name,
    description: agent.description ?? "",
    endpointURL: agent.endpoint_url ?? "",
    endpointAuthHeader: "",
    clearEndpointAuthHeader: false,
    pricePerCallCents: String(agent.price_per_call_cents ?? 0),
    tagsText: (agent.tags ?? []).join(", "),
    visibility: agent.visibility,
    connectionMode: agent.connection_mode ?? "direct_http",
    mcpToolName: agent.mcp_tool_name ?? "",
  };
}

function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(/[,\n，]/)) {
    const tag = raw.trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function statusLabel(agent: EditableAgent, locale: Locale): string {
  if (agent.lifecycle_status === "disabled") {
    return lifecycleStatusLabel(agent.lifecycle_status, locale);
  }
  return `${visibilityLabel(agent.visibility, locale)} · ${certificationStatusLabel(agent.certification_status, locale)}`;
}

function isEditableAgentCallable(agent: EditableAgent): boolean {
  if (agent.lifecycle_status !== "active") return false;
  return (
    agent.readiness?.callable ??
    (agent.availability?.status === "healthy" ||
      (Boolean(agent.availability?.last_successful_run_at) &&
        agent.availability?.status !== "unreachable"))
  );
}

function validateForm(form: FormState, locale: Locale): string | null {
  const copy =
    locale === "zh"
      ? {
          name: "名称需要 3 到 80 个字符",
          desc: "描述不能超过 500 个字符",
          price: "价格必须是 0 到 1000000 之间的整数分",
          tags: "标签需要 1 到 5 个，每个 2 到 30 个字符",
          endpoint: "direct_http / mcp_server 需要填写 endpoint URL",
          mcpTool: "mcp_server 需要填写 MCP tool name",
          authConflict: "不能同时填写新的鉴权 Header 又选择清除鉴权",
        }
      : {
          name: "Name must be 3 to 80 characters",
          desc: "Description must be 500 characters or fewer",
          price: "Price must be an integer between 0 and 1000000 cents",
          tags: "Use 1 to 5 tags, each 2 to 30 characters",
          endpoint: "direct_http / mcp_server requires an endpoint URL",
          mcpTool: "mcp_server requires an MCP tool name",
          authConflict: "Do not enter a new auth header while also clearing auth",
        };
  const name = form.name.trim();
  if (name.length < 3 || name.length > 80) return copy.name;
  if (form.description.length > 500) return copy.desc;
  const price = Number(form.pricePerCallCents);
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) return copy.price;
  const tags = parseTags(form.tagsText);
  if (tags.length < 1 || tags.length > 5 || tags.some((tag) => tag.length < 2 || tag.length > 30)) {
    return copy.tags;
  }
  if ((form.connectionMode === "direct_http" || form.connectionMode === "mcp_server") && !form.endpointURL.trim()) {
    return copy.endpoint;
  }
  if (form.connectionMode === "mcp_server" && !form.mcpToolName.trim()) {
    return copy.mcpTool;
  }
  if (form.clearEndpointAuthHeader && form.endpointAuthHeader.trim()) {
    return copy.authConflict;
  }
  return null;
}

export function AgentSettingsPanel({ agent, locale }: Props) {
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const [agentState, setAgentState] = useState<EditableAgent>(agent);
  const [form, setForm] = useState<FormState>(() => formFromAgent(agent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "zh"
      ? {
          basics: "基础信息",
          basicsDesc: "这些字段由作者维护，会影响市场展示、匹配和调用入口。",
          name: "Agent 名称",
          description: "描述",
          tags: "标签",
          tagsHint: "逗号或换行分隔，最多 5 个。",
          price: "价格（分/次）",
          connection: "调用连接",
          connectionDesc: "修改 endpoint 或连接模式后，建议回到接入配置运行 dry-run。",
          mode: "连接模式",
          endpoint: "Endpoint URL",
          endpointRuntimeHint: "runtime_ws / runtime_pull 使用平台生成的运行时地址，保存时会按 slug 自动归一化。",
          mcpTool: "MCP tool name",
          authHeader: "Endpoint 鉴权 Header",
          authPlaceholder: "留空表示保留当前密钥",
          clearAuth: "清除已有鉴权 Header",
          publish: "发布与可见性",
          visibility: "市场可见性",
          public: "公开：出现在市场列表，可被搜索和直连访问",
          unlisted: "链接可见：不进市场列表，但直链和 Agent Card 可访问",
          private: "私有：仅作者和授权流程可见",
          platform: "平台状态",
          slug: "固定 slug",
          slugHint: "slug 是 A2A、Agent Card 和外部链接的稳定标识，不能在设置里修改。",
          lifecycle: "生命周期",
          certification: "认证状态",
          disabledHint: "已下架 Agent 当前不可由作者编辑，需要平台恢复 active 后才能保存。",
          certifiedHint: "认证状态由平台评审控制；核心能力变化后应重新测评或复审。",
          save: "保存修改",
          saving: "保存中...",
          saved: "已保存",
          failed: "保存失败，请稍后再试",
          onboarding: "接入配置",
          publicPage: "公开页",
          playground: "Playground",
          playgroundUnavailable: "离线不可试用",
          calls: "累计调用",
          revenue: "累计收入",
        }
      : {
          basics: "Basic information",
          basicsDesc: "Creator-owned fields used for marketplace display, matching, and invocation.",
          name: "Agent name",
          description: "Description",
          tags: "Tags",
          tagsHint: "Separate with commas or line breaks, up to 5.",
          price: "Price (cents/call)",
          connection: "Invocation connection",
          connectionDesc: "After changing endpoint or connection mode, run a dry-run from onboarding.",
          mode: "Connection mode",
          endpoint: "Endpoint URL",
          endpointRuntimeHint: "runtime_ws / runtime_pull use platform-generated runtime URLs normalized from the slug on save.",
          mcpTool: "MCP tool name",
          authHeader: "Endpoint auth header",
          authPlaceholder: "Leave blank to keep the current secret",
          clearAuth: "Clear existing auth header",
          publish: "Publishing and visibility",
          visibility: "Marketplace visibility",
          public: "Public: listed in the marketplace and searchable",
          unlisted: "Unlisted: hidden from listing but available by direct link and Agent Card",
          private: "Private: visible only to the owner and authorized flows",
          platform: "Platform state",
          slug: "Fixed slug",
          slugHint: "Slug is the stable identifier for A2A, Agent Card, and external links. It is not editable here.",
          lifecycle: "Lifecycle",
          certification: "Certification",
          disabledHint: "Disabled Agents cannot be edited by the creator until the platform restores them to active.",
          certifiedHint: "Certification is platform-controlled; major capability changes should be re-tested or reviewed.",
          save: "Save changes",
          saving: "Saving...",
          saved: "Saved",
          failed: "Save failed. Please try again later.",
          onboarding: "Onboarding",
          publicPage: "Public page",
          playground: "Playground",
          playgroundUnavailable: "Offline",
          calls: "total calls",
          revenue: "total revenue",
        };

  const disabled = agentState.lifecycle_status === "disabled";
  const callable = isEditableAgentCallable(agentState);
  const tags = useMemo(() => parseTags(form.tagsText), [form.tagsText]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || saving) return;
    const validation = validateForm(form, locale);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<EditableAgent>(`/api/v1/creator/agents/${agentState.id}`, {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          endpoint_url: form.endpointURL.trim(),
          endpoint_auth_header: form.endpointAuthHeader.trim(),
          clear_endpoint_auth_header: form.clearEndpointAuthHeader,
          price_per_call_cents: Number(form.pricePerCallCents),
          tags,
          visibility: form.visibility,
          connection_mode: form.connectionMode,
          mcp_tool_name: form.connectionMode === "mcp_server" ? form.mcpToolName.trim() : "",
        },
      });
      const normalized = {
        ...updated,
        connection_mode: updated.connection_mode ?? "direct_http",
      };
      setAgentState(normalized);
      setForm(formFromAgent(normalized));
      toast.success(copy.saved);
      router.refresh();
    } catch (err) {
      const message = localizedErrorMessage(err, locale, copy.failed);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ol-onboarding-layout">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset disabled={disabled || saving} className="space-y-4 disabled:opacity-70">
          <section className="ol-panel ol-panel-pad space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="ol-kicker">{copy.basics}</div>
                <h2 className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">{copy.basics}</h2>
                <p className="mt-1 max-w-2xl text-[13px] font-semibold text-[color:var(--ol-muted)]">
                  {copy.basicsDesc}
                </p>
              </div>
              <span className="ol-chip">{statusLabel(agentState, locale)}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="ol-auth-field-label">{copy.name}</span>
                <input
                  className="ol-publish-input"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <label className="block">
                <span className="ol-auth-field-label">{copy.price}</span>
                <input
                  className="ol-publish-input"
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  value={form.pricePerCallCents}
                  onChange={(event) => updateForm("pricePerCallCents", event.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="ol-auth-field-label">{copy.description}</span>
              <textarea
                className="ol-publish-input ol-publish-textarea"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                maxLength={500}
              />
            </label>

            <label className="block">
              <span className="ol-auth-field-label">{copy.tags}</span>
              <textarea
                className="ol-publish-input ol-publish-textarea min-h-[72px]"
                value={form.tagsText}
                onChange={(event) => updateForm("tagsText", event.target.value)}
              />
              <p className="ol-publish-field-hint">
                {copy.tagsHint} {tags.length}/5
              </p>
            </label>
          </section>

          <section className="ol-panel ol-panel-pad space-y-4">
            <div>
              <div className="ol-kicker">{copy.connection}</div>
              <h2 className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">{copy.connection}</h2>
              <p className="mt-1 max-w-2xl text-[13px] font-semibold text-[color:var(--ol-muted)]">
                {copy.connectionDesc}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="ol-auth-field-label">{copy.mode}</span>
                <select
                  className="ol-publish-input"
                  value={form.connectionMode}
                  onChange={(event) => updateForm("connectionMode", event.target.value as ConnectionMode)}
                >
                  <option value="direct_http">{localizedConnectionModeLabel("direct_http", locale)}</option>
                  <option value="runtime_ws">{localizedConnectionModeLabel("runtime_ws", locale)}</option>
                  <option value="runtime_pull">{localizedConnectionModeLabel("runtime_pull", locale)}</option>
                  <option value="mcp_server">{localizedConnectionModeLabel("mcp_server", locale)}</option>
                </select>
              </label>
              <label className="block">
                <span className="ol-auth-field-label">{copy.endpoint}</span>
                <input
                  className="ol-publish-input"
                  value={form.endpointURL}
                  onChange={(event) => updateForm("endpointURL", event.target.value)}
                  maxLength={500}
                  disabled={form.connectionMode === "runtime_ws" || form.connectionMode === "runtime_pull"}
                />
                {form.connectionMode === "runtime_ws" || form.connectionMode === "runtime_pull" ? (
                  <p className="ol-publish-field-hint">{copy.endpointRuntimeHint}</p>
                ) : null}
              </label>
            </div>

            {form.connectionMode === "mcp_server" ? (
              <label className="block">
                <span className="ol-auth-field-label">{copy.mcpTool}</span>
                <input
                  className="ol-publish-input"
                  value={form.mcpToolName}
                  onChange={(event) => updateForm("mcpToolName", event.target.value)}
                  maxLength={120}
                />
              </label>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="ol-auth-field-label">{copy.authHeader}</span>
                <input
                  className="ol-publish-input"
                  value={form.endpointAuthHeader}
                  onChange={(event) => updateForm("endpointAuthHeader", event.target.value)}
                  placeholder={copy.authPlaceholder}
                  maxLength={500}
                  disabled={form.clearEndpointAuthHeader}
                />
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-[color:var(--ol-line)] px-3 py-3 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
                <input
                  type="checkbox"
                  checked={form.clearEndpointAuthHeader}
                  onChange={(event) => updateForm("clearEndpointAuthHeader", event.target.checked)}
                />
                {copy.clearAuth}
              </label>
            </div>
          </section>

          <section className="ol-panel ol-panel-pad space-y-4">
            <div>
              <div className="ol-kicker">{copy.publish}</div>
              <h2 className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">{copy.publish}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["public", "unlisted", "private"] as const).map((visibility) => (
                <label
                  key={visibility}
                  className={`rounded-2xl border p-4 transition-colors ${
                    form.visibility === visibility
                      ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)]"
                      : "border-[color:var(--ol-line)] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={visibility}
                    checked={form.visibility === visibility}
                    onChange={() => updateForm("visibility", visibility)}
                    className="sr-only"
                  />
                  <strong className="block text-[14px] font-black text-[color:var(--ol-ink)]">
                    {visibilityLabel(visibility, locale)}
                  </strong>
                  <span className="mt-2 block text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
                    {visibility === "public" ? copy.public : visibility === "unlisted" ? copy.unlisted : copy.private}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </fieldset>

        {disabled ? <p className="ol-publish-field-error">{copy.disabledHint}</p> : null}
        {error ? <p className="ol-publish-field-error">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="ol-mini-btn ol-mini-btn-primary h-10 gap-2 px-4" disabled={disabled || saving}>
            <Save className="size-4" aria-hidden="true" />
            {saving ? copy.saving : copy.save}
          </button>
          <Link href={`/hub/agents/${agentState.slug}/onboarding`} className="ol-mini-btn h-10 gap-2 px-4">
            <Settings className="size-4" aria-hidden="true" />
            {copy.onboarding}
          </Link>
          {agentState.visibility !== "private" ? (
            <Link href={`/agents/${agentState.slug}`} className="ol-mini-btn h-10 gap-2 px-4">
              <ExternalLink className="size-4" aria-hidden="true" />
              {copy.publicPage}
            </Link>
          ) : null}
          {callable ? (
            <Link href={`/playground/${agentState.slug}`} className="ol-mini-btn h-10 gap-2 px-4">
              <PlayCircle className="size-4" aria-hidden="true" />
              {copy.playground}
            </Link>
          ) : (
            <span
              className="ol-mini-btn h-10 cursor-not-allowed gap-2 px-4 opacity-60"
              title={
                agentState.availability
                  ? availabilityStatusHint(agentState.availability.status, locale, agentState.availability.hint)
                  : copy.playgroundUnavailable
              }
            >
              <PlayCircle className="size-4" aria-hidden="true" />
              {copy.playgroundUnavailable}
            </span>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad space-y-3">
          <div>
            <div className="ol-kicker">{copy.platform}</div>
            <h2 className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">
              {agentState.name}
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[color:var(--ol-muted)]">
              {statusLabel(agentState, locale)}
            </p>
          </div>
          <div className="ol-info-card">
            <strong>{copy.slug}</strong>
            <code className="break-all text-[12px] text-[color:var(--ol-muted)]">{agentState.slug}</code>
            <span className="mt-1">{copy.slugHint}</span>
          </div>
          <div className="ol-info-card">
            <strong>{copy.lifecycle}</strong>
            <span>{lifecycleStatusLabel(agentState.lifecycle_status, locale)}</span>
            {disabled ? <span className="mt-1 text-[#b9263c]">{copy.disabledHint}</span> : null}
          </div>
          <div className="ol-info-card">
            <strong>{copy.certification}</strong>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {certificationStatusLabel(agentState.certification_status, locale)}
            </span>
            <span className="mt-1">{copy.certifiedHint}</span>
            {agentState.rejection_reason ? (
              <span className="mt-1 text-[#b9263c]">{agentState.rejection_reason}</span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] font-bold text-[color:var(--ol-muted)]">
            <div className="rounded-xl bg-[color:var(--ol-soft)] p-3">
              <strong className="block text-[18px] text-[color:var(--ol-ink)]">{agentState.total_calls}</strong>
              {copy.calls}
            </div>
            <div className="rounded-xl bg-[color:var(--ol-soft)] p-3">
              <strong className="block text-[18px] text-[color:var(--ol-ink)]">
                ${(agentState.total_revenue_cents / 100).toFixed(2)}
              </strong>
              {copy.revenue}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
