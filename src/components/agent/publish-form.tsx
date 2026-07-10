"use client";

/**
 * Agent 发布与接入表单。
 *
 * 布局：ol-publish-layout 2 列
 *   左主区：
 *     - 连接模式选择
 *     - 基础信息、连接配置、Skill 与可见性
 *   右侧栏：
 *     - Agent 资料预览
 *     - 外部参考价格字段说明
 *     - 可见性与验证说明
 *     - 提交按钮
 *
 * 业务保留：
 *   - RHF + Zod schema（slug / name / description / endpoint_url /
 *     endpoint_auth_header / price_usd / tags_input）
 *   - slug 实时检查（debounce 300ms，公开接口 GET /api/v1/agents/check-slug）
 *   - ApiError.code 分流：CONFLICT / FORBIDDEN / VALIDATION_FAILED / 其他
 *   - 提交后 toast + router.push("/hub")
 *
 * BasicInfoSection / EndpointSection / PricingSection 共用同一个表单上下文。
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ListingPreview } from "@/components/agent/listing-preview";
import { PricingTiles } from "@/components/agent/pricing-tiles";
import { SourceCards, type AgentConnectionMode } from "@/components/agent/source-cards";
import { SkillPicker } from "@/components/skill/skill-picker";
import { useApi } from "@/hooks/use-api";
import { ApiError, localizedErrorMessage } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-root";
import type { Locale } from "@/lib/i18n";
import { MAX_SKILLS_PER_AGENT, type Skill } from "@/lib/skills";

// 后端 slug 规则：小写字母/数字/短横线，首尾必须是字母或数字
const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const API_BASE_URL = getApiBaseUrl();
const ALLOW_LOCAL_HTTP_ENDPOINTS =
  process.env.NEXT_PUBLIC_ALLOW_LOCAL_HTTP_ENDPOINTS === "true";

function isAllowedEndpointURL(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return true;
  if (!ALLOW_LOCAL_HTTP_ENDPOINTS || url.protocol !== "http:") return false;
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1"
  );
}

function connectionModeLabel(mode: AgentConnectionMode, locale: Locale): string {
  if (mode === "runtime_ws") return "Agent Node / WebSocket";
  if (mode === "runtime_pull") return locale === "zh" ? "Agent Node（长轮询）" : "Runtime Pull";
  if (mode === "mcp_server") return locale === "zh" ? "已有 MCP 工具" : "Existing MCP tool";
  return locale === "zh" ? "HTTP 端点" : "HTTP Endpoint";
}

function isRuntimeConnectionMode(mode: AgentConnectionMode): boolean {
  return mode === "runtime_ws" || mode === "runtime_pull";
}

const VALIDATION_COPY = {
  zh: {
    min3: "至少 3 字符",
    max80: "最多 80 字符",
    slugFormat: "只允许小写字母 / 数字 / 短横线，首尾必须是字母或数字",
    min10: "至少 10 字符",
    max500: "最多 500 字符",
    max120: "最多 120 字符",
    validPrice: "请填写有效的外部参考价格",
    priceMin: "不能小于 $0",
    priceMax: "最多 $10,000",
    tagRequired: "至少 1 个标签",
    tagMax: "最多 5 个标签",
    mcpEndpointRequired: "请填写 MCP 服务地址",
    endpointRequired: "请填写调用端点 URL",
    httpsRequired: "必须使用 HTTPS；本地 loopback 调试需开启 NEXT_PUBLIC_ALLOW_LOCAL_HTTP_ENDPOINTS=true",
    mcpToolRequired: "请填写 MCP 工具名称",
  },
  en: {
    min3: "Use at least 3 characters",
    max80: "Use at most 80 characters",
    slugFormat: "Use lowercase letters, numbers, and hyphens; start and end with a letter or number",
    min10: "Use at least 10 characters",
    max500: "Use at most 500 characters",
    max120: "Use at most 120 characters",
    validPrice: "Enter a valid external reference price",
    priceMin: "Must be at least $0",
    priceMax: "Must be at most $10,000",
    tagRequired: "Add at least 1 tag",
    tagMax: "Use at most 5 tags",
    mcpEndpointRequired: "Enter the MCP endpoint URL",
    endpointRequired: "Enter the endpoint URL",
    httpsRequired: "Use HTTPS. For local loopback debugging, enable NEXT_PUBLIC_ALLOW_LOCAL_HTTP_ENDPOINTS=true",
    mcpToolRequired: "Enter the MCP tool name",
  },
} as const satisfies Record<Locale, Record<string, string>>;

function createSchema(locale: Locale) {
  const copy = VALIDATION_COPY[locale];
  return z
    .object({
      connection_mode: z.enum(["direct_http", "runtime_ws", "runtime_pull", "mcp_server"]),
      slug: z
        .string()
        .min(3, copy.min3)
        .max(80, copy.max80)
        .regex(slugRegex, copy.slugFormat),
      name: z.string().min(3, copy.min3).max(80, copy.max80),
      description: z
        .string()
        .min(10, copy.min10)
        .max(500, copy.max500),
      endpoint_url: z.string().max(500, copy.max500).optional().or(z.literal("")),
      mcp_tool_name: z.string().max(120, copy.max120).optional().or(z.literal("")),
      endpoint_auth_header: z
        .string()
        .max(500, copy.max500)
        .optional()
        .or(z.literal("")),
      price_usd: z
        .number({ message: copy.validPrice })
        .min(0, copy.priceMin)
        .max(10000, copy.priceMax),
      visibility: z.enum(["public", "unlisted", "private"]),
      tags_input: z
        .string()
        .min(1, copy.tagRequired)
        .refine(
          (v) => v.split(",").map((s) => s.trim()).filter(Boolean).length >= 1,
          copy.tagRequired,
        )
        .refine(
          (v) => v.split(",").map((s) => s.trim()).filter(Boolean).length <= 5,
          copy.tagMax,
        ),
    })
    .superRefine((values, ctx) => {
    if (isRuntimeConnectionMode(values.connection_mode)) return;
    if (!values.endpoint_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endpoint_url"],
        message: values.connection_mode === "mcp_server" ? copy.mcpEndpointRequired : copy.endpointRequired,
      });
      return;
    }
    if (!isAllowedEndpointURL(values.endpoint_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endpoint_url"],
        message: copy.httpsRequired,
      });
    }
    if (values.connection_mode === "mcp_server" && !values.mcp_tool_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mcp_tool_name"],
        message: copy.mcpToolRequired,
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

type SlugStatus = "unknown" | "checking" | "available" | "taken";

interface SlugCheckResult {
  slug: string;
  status: Exclude<SlugStatus, "checking">;
}

interface CreatedAgent {
  id: string;
  slug: string;
  status: string;
}

interface PublishFormProps {
  /** 当前用户名，用于右侧 Listing 预览 "by xxx" */
  creatorName: string;
  /** Skill 目录（公开接口拉取）。空数组表示后端未返回，表单隐藏 Skill 分区。 */
  skills: Skill[];
  locale?: Locale;
}

export function PublishForm({ creatorName, skills, locale = "zh" }: PublishFormProps) {
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  // Skill 选择不进 RHF schema：选 0 个合法、最多 5 个由 SkillPicker 自身 clamp。
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const formSchema = useMemo(() => createSchema(locale), [locale]);
  const copy =
    locale === "zh"
      ? {
          slugTaken: "此 slug 已被使用",
          skillBindWarningPrefix: "Agent 已保存，但技能绑定失败：",
          skillBindWarning: "Agent 已保存，但技能绑定失败，请到 Agent 管理重试。",
          saved: "基础信息已保存，继续补充能力声明",
          chooseSource: "选择接入方式",
          basicInfo: "基础信息",
          skillLabel: `技能（最多 ${MAX_SKILLS_PER_AGENT} 个，可选）`,
          skillHint: "声明 Agent 能完成的任务，方便用户按能力找到它，也帮助调用方判断是否合适；接入后仍可在 Agent 管理中修改。",
          previewTitle: "Agent 资料预览",
          previewSync: "随表单更新",
          visibilityTitle: "可见性与实例认证",
          visibilityBody: "是否在 Agent 库中展示由你决定；实例认证与能力测评提供额外证据，不影响私有 Agent 使用。",
          freeTitle: "外部参考价格（可选）",
          freeBody: "这是与外部系统对接时使用的兼容元数据，不会触发 OpenLinker Core 扣费或结算。每次调用仍会写入运行记录。",
          saving: "保存中...",
          save: "保存并继续接入",
        }
      : {
          slugTaken: "This slug is already taken",
          skillBindWarningPrefix: "Agent saved, but Skill binding failed: ",
          skillBindWarning: "Agent saved, but Skill binding failed. Retry from Agent Console.",
          saved: "Basics saved. Continue with capability claims.",
          chooseSource: "Choose connection mode",
          basicInfo: "Basics",
          skillLabel: `Skills (up to ${MAX_SKILLS_PER_AGENT}, optional)`,
          skillHint: "Declare the tasks this Agent can handle so Registry search and callers can evaluate it. Skills remain editable in Agent Console.",
          previewTitle: "Agent profile preview",
          previewSync: "Updates with the form",
          visibilityTitle: "Visibility and instance certification",
          visibilityBody: "You decide whether the Agent enters the public Registry. Instance certification and Benchmarks add evidence without affecting private Agent use.",
          freeTitle: "External reference price (optional)",
          freeBody: "This compatibility metadata is available for external integrations. It does not trigger charging or settlement in OpenLinker Core, and every invocation still creates a run record.",
          saving: "Saving...",
          save: "Save and continue setup",
        };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      connection_mode: "direct_http",
      name: "",
      description: "",
      endpoint_url: "",
      mcp_tool_name: "",
      endpoint_auth_header: "",
      price_usd: 0,
      visibility: "public",
      tags_input: "",
    },
  });

  // slug 实时可用性检查（debounce 300ms）
  const slug = useWatch({ control: form.control, name: "slug" });
  const slugIsCheckable =
    !!slug && slugRegex.test(slug) && slug.length >= 3 && slug.length <= 80;
  const slugStatus: SlugStatus = !slugIsCheckable
    ? "unknown"
    : slugCheck?.slug === slug
      ? slugCheck.status
      : "checking";

  useEffect(() => {
    if (!slugIsCheckable) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/agents/check-slug?slug=${encodeURIComponent(slug)}`,
        );
        if (!res.ok) {
          setSlugCheck({ slug, status: "unknown" });
          return;
        }
        const data = (await res.json()) as { available?: boolean };
        setSlugCheck({ slug, status: data.available ? "available" : "taken" });
      } catch {
        setSlugCheck({ slug, status: "unknown" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [slug, slugIsCheckable]);

  const onSubmit = async (values: FormValues) => {
    if (slugStatus === "taken") {
      form.setError("slug", { message: copy.slugTaken });
      return;
    }

    const tags = values.tags_input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const body = {
      slug: values.slug,
      connection_mode: values.connection_mode,
      name: values.name,
      description: values.description,
      endpoint_url: values.endpoint_url,
      mcp_tool_name: values.mcp_tool_name || "",
      endpoint_auth_header: values.endpoint_auth_header || "",
      price_per_call_cents: Math.round(values.price_usd * 100),
      tags,
      visibility: values.visibility,
    };

    try {
      const created = await apiFetch<CreatedAgent>("/api/v1/creator/agents", {
        method: "POST",
        body,
      });
      // 创建成功后，若选了 skill 再 PATCH 绑定。失败仅 toast 警告，不阻塞流程
      // Agent 已创建，所有者可在 Agent 管理中二次编辑。
      if (selectedSkillIds.length > 0 && created?.id) {
        try {
          await apiFetch(
            `/api/v1/creator/agents/${created.id}/skills`,
            {
              method: "PATCH",
              body: { skill_ids: selectedSkillIds },
            },
          );
        } catch (e) {
          const detail = localizedErrorMessage(e, locale, copy.skillBindWarning);
          toast.warning(
            detail === copy.skillBindWarning
              ? detail
              : `${copy.skillBindWarningPrefix}${detail}`,
          );
        }
      }
      toast.success(copy.saved);
      router.push(`/hub/agents/${created.slug}/onboarding`);
      router.refresh();
    } catch (err) {
      handlePublishError(err, form, locale);
    }
  };

  // 表单 id：让右侧提交按钮通过 form="..." 触发同一份表单
  const formId = useId();
  const connectionMode = useWatch({
    control: form.control,
    name: "connection_mode",
  }) as AgentConnectionMode;

  return (
    <div className="ol-publish-layout">
      {/* 左主区：来源 + 基础信息 */}
      <section className="space-y-3">
        <div className="ol-panel ol-panel-pad">
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 12px", border: 0 }}
          >
            <strong>{copy.chooseSource}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-muted)]">
              {connectionModeLabel(connectionMode, locale)}
            </span>
          </div>
          <SourceCards
            value={connectionMode}
            locale={locale}
            onChange={(value) => {
              form.setValue("connection_mode", value, { shouldValidate: true });
              if (isRuntimeConnectionMode(value)) {
                form.clearErrors(["endpoint_url", "mcp_tool_name"]);
              }
            }}
          />
        </div>

        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="ol-panel ol-panel-pad space-y-4"
        >
          <div
            className="ol-panel-head"
            style={{ height: "auto", padding: "0 0 12px", border: 0 }}
          >
            <strong>{copy.basicInfo}</strong>
            <span className="text-xs font-bold text-[color:var(--ol-primary-dark)]">
              {slug || "your-agent"} · v0.1.0
            </span>
          </div>

          <BasicInfoSection
            register={form.register}
            errors={form.formState.errors}
            slug={slug}
            slugStatus={slugStatus}
            locale={locale}
          />

          <EndpointSection
            register={form.register}
            errors={form.formState.errors}
            connectionMode={connectionMode}
            locale={locale}
          />

          <PricingSection
            register={form.register}
            errors={form.formState.errors}
            locale={locale}
          />

          <VisibilitySection
            register={form.register}
            errors={form.formState.errors}
            locale={locale}
          />

          {skills.length > 0 ? (
            <div>
              <label className="ol-publish-field-label">
                {copy.skillLabel}
              </label>
              <SkillPicker
                skills={skills}
                value={selectedSkillIds}
                onChange={setSelectedSkillIds}
                max={MAX_SKILLS_PER_AGENT}
                locale={locale}
              />
              <p className="ol-publish-field-hint">
                {copy.skillHint}
              </p>
            </div>
          ) : null}
        </form>
      </section>

      {/* 右侧栏：资料预览 + 外部参考价格说明 + 可见性说明 + 提交按钮 */}
      <aside className="ol-panel ol-panel-pad flex flex-col gap-3.5">
        <div
          className="ol-panel-head"
          style={{ height: "auto", padding: "0 0 6px", border: 0 }}
        >
          <strong>{copy.previewTitle}</strong>
          <span className="text-xs font-bold text-[color:var(--ol-muted)]">
            {copy.previewSync}
          </span>
        </div>

        <LivePreview control={form.control} creatorName={creatorName} locale={locale} />

        <LivePricing control={form.control} locale={locale} />

        <div className="ol-info-card">
          <strong>{copy.visibilityTitle}</strong>
          <span>
            {copy.visibilityBody}
          </span>
        </div>

        <div className="ol-info-card highlight">
          <strong>{copy.freeTitle}</strong>
          <span>{copy.freeBody}</span>
        </div>

        <button
          type="submit"
          form={formId}
          disabled={form.formState.isSubmitting || slugStatus === "checking"}
          className="ol-publish-submit"
        >
          {form.formState.isSubmitting ? copy.saving : copy.save}
        </button>
      </aside>
    </div>
  );
}

/* ============================================================
   Sub-sections
   ============================================================ */

function BasicInfoSection({
  register,
  errors,
  slug,
  slugStatus,
  locale,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  slug: string;
  slugStatus: SlugStatus;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          slug: "Slug（URL 标识，唯一）",
          name: "名称",
          namePlaceholder: "合同审阅 Agent",
          description: "描述",
          descriptionPlaceholder: "扫描合同文本，识别违约金、转租、退租等异常条款",
          tags: "Tags（逗号分隔，1-5 个）",
          tagsPlaceholder: "合同, 法务, 风险审查",
        }
      : {
          slug: "Slug (unique URL identifier)",
          name: "Name",
          namePlaceholder: "Contract Review Agent",
          description: "Description",
          descriptionPlaceholder: "Scan contract text and identify risky clauses such as penalties, subleases, and early termination.",
          tags: "Tags (comma-separated, 1-5)",
          tagsPlaceholder: "contracts, legal, risk review",
        };

  return (
    <>
      <Field
        label={copy.slug}
        error={errors.slug?.message}
      >
        <input
          {...register("slug")}
          className="ol-publish-input"
          placeholder="contract-review-agent"
          autoComplete="off"
          spellCheck={false}
        />
        {slug && slugRegex.test(slug) ? (
          <SlugStatusHint status={slugStatus} locale={locale} />
        ) : null}
      </Field>

      <Field label={copy.name} error={errors.name?.message}>
        <input
          {...register("name")}
          className="ol-publish-input"
          placeholder={copy.namePlaceholder}
        />
      </Field>

      <Field label={copy.description} error={errors.description?.message}>
        <textarea
          {...register("description")}
          className="ol-publish-input ol-publish-textarea"
          placeholder={copy.descriptionPlaceholder}
        />
      </Field>

      <Field
        label={copy.tags}
        error={errors.tags_input?.message}
      >
        <input
          {...register("tags_input")}
          className="ol-publish-input"
          placeholder={copy.tagsPlaceholder}
        />
      </Field>
    </>
  );
}

function EndpointSection({
  register,
  errors,
  connectionMode,
  locale,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  connectionMode: AgentConnectionMode;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          runtimeWSTitle: "Agent Node / WebSocket：本地与内网 Agent",
          runtimeWSBody: (
            <>
              保存后在 Agent 管理生成绑定该 Agent 的接入凭证。你的 Agent Node 不需要公网入站地址，只要用该凭证建立{" "}
              <code>/api/v1/agent-runtime/ws</code> 出站长连接，就能实时接收运行请求、回传事件和最终结果；不适合保持 WebSocket 时可选择 Agent Node（长轮询）。
            </>
          ),
          runtimePullTitle: "Agent Node（长轮询）：无需持续 WebSocket",
          runtimeBody: (
            <>
              保存后在 Agent 管理生成绑定该 Agent 的接入凭证。你的本地 Agent 不需要公网入站地址，只要定时请求{" "}
              <code>/api/v1/agent-runtime/heartbeat</code> 读取是否有待领取运行请求，并用{" "}
              <code>/api/v1/agent-runtime/runs/claim?wait=25</code> 长轮询领取运行请求，再 POST{" "}
              <code>/api/v1/agent-runtime/runs/&lt;id&gt;/result</code> 回传结果。
            </>
          ),
          httpsOrLoopback: "调用端点 URL（HTTPS 或本地回环 HTTP）",
          httpsOnly: "调用端点 URL（必须 HTTPS）",
          localHint: "本地调试允许回环 HTTP；对外部署时请使用 HTTPS 调用端点。",
          mcpEndpoint: "远程 HTTP JSON-RPC / MCP 服务地址",
          mcpTool: "远程 MCP 工具名称",
          mcpHint: (
            <>
              将现有远程 HTTP JSON-RPC / MCP 工具作为一个可发现 Agent 接入。OpenLinker 会发送 <code>tools/call</code>，并把用户输入作为 arguments。
            </>
          ),
          mcpAuth: "MCP 工具鉴权（可选）",
          endpointAuth: "鉴权 Header（可选，当前实例调用端点时携带）",
        }
      : {
          runtimeWSTitle: "Agent Node / WebSocket for local and private Agents",
          runtimeWSBody: (
            <>
              After saving, Agent Console generates an access credential bound to this Agent. Agent Node does not need a public inbound URL. It opens an outbound{" "}
              <code>/api/v1/agent-runtime/ws</code> connection with that credential to receive run requests in real time, stream events, and send final results. Choose Runtime Pull when maintaining a WebSocket is not suitable.
            </>
          ),
          runtimePullTitle: "Runtime Pull without a persistent WebSocket",
          runtimeBody: (
            <>
              After saving, Agent Console generates an access credential bound to this Agent. Your local Agent does not need a public inbound URL. It periodically calls{" "}
              <code>/api/v1/agent-runtime/heartbeat</code> to check for pending run requests, long-polls{" "}
              <code>/api/v1/agent-runtime/runs/claim?wait=25</code> to claim a run, then POSTs the result to{" "}
              <code>/api/v1/agent-runtime/runs/&lt;id&gt;/result</code>.
            </>
          ),
          httpsOrLoopback: "Endpoint URL (HTTPS or local loopback HTTP)",
          httpsOnly: "Endpoint URL (HTTPS required)",
          localHint: "Local debugging allows loopback HTTP. Use an HTTPS endpoint for external deployments.",
          mcpEndpoint: "Remote HTTP JSON-RPC / MCP endpoint URL",
          mcpTool: "Remote MCP tool name",
          mcpHint: (
            <>
              Connect an existing remote HTTP JSON-RPC / MCP tool as a discoverable Agent. OpenLinker sends <code>tools/call</code> and passes user input as arguments.
            </>
          ),
          mcpAuth: "MCP tool auth (optional)",
          endpointAuth: "Auth header (optional, sent when OpenLinker calls the endpoint)",
        };

  if (connectionMode === "runtime_ws" || connectionMode === "runtime_pull") {
    const isWS = connectionMode === "runtime_ws";
    return (
      <div className="rounded-2xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4">
        <div className="text-[13px] font-[900] text-[color:var(--ol-ink)]">
          {isWS ? copy.runtimeWSTitle : copy.runtimePullTitle}
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
          {isWS ? copy.runtimeWSBody : copy.runtimeBody}
        </p>
      </div>
    );
  }

  const isMCP = connectionMode === "mcp_server";

  return (
    <>
      <Field
        label={
          isMCP
            ? copy.mcpEndpoint
            : ALLOW_LOCAL_HTTP_ENDPOINTS
              ? copy.httpsOrLoopback
              : copy.httpsOnly
        }
        error={errors.endpoint_url?.message}
      >
        <input
          {...register("endpoint_url")}
          className="ol-publish-input"
          placeholder={
            isMCP
              ? "https://my-mcp.example/mcp"
              : ALLOW_LOCAL_HTTP_ENDPOINTS
              ? "http://127.0.0.1:9001/run"
              : "https://my-agent.fly.dev/run"
          }
          autoComplete="off"
          spellCheck={false}
        />
        {ALLOW_LOCAL_HTTP_ENDPOINTS ? (
          <p className="ol-publish-field-hint">
            {copy.localHint}
          </p>
        ) : null}
      </Field>

      {isMCP ? (
        <Field label={copy.mcpTool} error={errors.mcp_tool_name?.message}>
          <input
            {...register("mcp_tool_name")}
            className="ol-publish-input"
            placeholder="analyze_contract"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="ol-publish-field-hint">
            {copy.mcpHint}
          </p>
        </Field>
      ) : null}

      <Field
        label={isMCP ? copy.mcpAuth : copy.endpointAuth}
        error={errors.endpoint_auth_header?.message}
      >
        <input
          {...register("endpoint_auth_header")}
          className="ol-publish-input"
          placeholder="Bearer sk_secret_xxx"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
    </>
  );
}

function PricingSection({
  register,
  errors,
  locale,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          label: "外部参考价格（USD，可选）",
          hint: "这是可选兼容元数据，不会触发 OpenLinker Core 扣费或结算。",
        }
      : {
          label: "External reference price (USD, optional)",
          hint: "This is optional compatibility metadata and does not trigger charging or settlement in OpenLinker Core.",
        };
  return (
    <Field
      label={copy.label}
      error={errors.price_usd?.message}
    >
      <input
        type="number"
        step="0.01"
        min="0"
        max="10000"
        {...register("price_usd", { valueAsNumber: true })}
        className="ol-publish-input"
      />
      <p className="ol-publish-field-hint">{copy.hint}</p>
    </Field>
  );
}

function VisibilitySection({
  register,
  errors,
  locale,
}: {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          label: "可见性",
          public: "公开 - 立即在 Agent 库中展示",
          unlisted: "非公开列表 - 仅凭链接访问",
          private: "私有 - 仅 Agent 所有者可见",
        }
      : {
          label: "Visibility",
          public: "Public - listed in Registry immediately",
          unlisted: "Unlisted - accessible only by link",
          private: "Private - Agent owner only",
        };
  return (
    <Field label={copy.label} error={errors.visibility?.message}>
      <select {...register("visibility")} className="ol-publish-input">
        <option value="public">{copy.public}</option>
        <option value="unlisted">{copy.unlisted}</option>
        <option value="private">{copy.private}</option>
      </select>
    </Field>
  );
}

/* ============================================================
   右侧栏实时预览（用 useWatch 拿当前表单值）
   ============================================================ */

function LivePreview({
  control,
  creatorName,
  locale,
}: {
  control: Control<FormValues>;
  creatorName: string;
  locale: Locale;
}) {
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const name = useWatch({ control, name: "name" }) ?? "";
  const description = useWatch({ control, name: "description" }) ?? "";
  const tagsInput = useWatch({ control, name: "tags_input" }) ?? "";
  return (
    <ListingPreview
      slug={slug}
      name={name}
      description={description}
      tagsInput={tagsInput}
      creatorName={creatorName}
      locale={locale}
    />
  );
}

function LivePricing({ control, locale }: { control: Control<FormValues>; locale: Locale }) {
  const priceUsd = useWatch({ control, name: "price_usd" });
  const safe = typeof priceUsd === "number" ? priceUsd : 0;
  const title = locale === "zh" ? "外部参考价格" : "External reference price";
  return (
    <div className="ol-info-card">
      <strong>{title}</strong>
      <PricingTiles priceUsd={safe} locale={locale} />
    </div>
  );
}

/* ============================================================
   字段壳 / 状态提示
   ============================================================ */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="ol-publish-field-label">{label}</label>
      {children}
      {error ? <p className="ol-publish-field-error">{error}</p> : null}
    </div>
  );
}

function SlugStatusHint({ status, locale }: { status: SlugStatus; locale: Locale }) {
  const copy =
    locale === "zh"
      ? { checking: "检查中...", available: "✓ 可用", taken: "✗ 已被使用" }
      : { checking: "Checking...", available: "✓ Available", taken: "✗ Already taken" };
  if (status === "checking")
    return <p className="ol-publish-field-hint ol-slug-hint">{copy.checking}</p>;
  if (status === "available")
    return <p className="ol-publish-field-hint ol-slug-hint ok">{copy.available}</p>;
  if (status === "taken")
    return <p className="ol-publish-field-hint ol-slug-hint bad">{copy.taken}</p>;
  return null;
}

function handlePublishError(
  err: unknown,
  form: UseFormReturn<FormValues>,
  locale: Locale,
) {
  const copy =
    locale === "zh"
      ? {
          slugTaken: "此 slug 已被使用",
          slugTakenToast: "此 slug 已被使用，请换一个",
          forbidden: "你还没有 Agent 所有者权限，请先开通",
          validation: "字段格式错误",
          submitFailed: "提交失败，请稍后重试",
        }
      : {
          slugTaken: "This slug is already taken",
          slugTakenToast: "This slug is already taken. Choose another one.",
          forbidden: "Your account does not have Agent owner access yet.",
          validation: "Some fields are invalid",
          submitFailed: "Submit failed. Try again later.",
        };
  if (err instanceof ApiError) {
    switch (err.code) {
      case "CONFLICT":
        form.setError("slug", { message: copy.slugTaken });
        toast.error(copy.slugTakenToast);
        return;
      case "FORBIDDEN":
        toast.error(copy.forbidden);
        return;
      case "VALIDATION_FAILED":
        toast.error(localizedErrorMessage(err, locale, copy.validation));
        return;
      default:
        toast.error(localizedErrorMessage(err, locale, copy.submitFailed));
        return;
    }
  }
  toast.error(copy.submitFailed);
}
