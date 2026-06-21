"use client";

/**
 * 首页 hero · "描述任务" 输入卡片（Client Component）。
 *
 * 行为：
 *   - textarea + "推荐 Agent" 按钮
 *   - 提交：POST /api/v1/tasks/recommend，body { query, template_id?, skill_ids?, mcp_tools? }
 *   - 成功：把推荐结果存 sessionStorage（key = `task:${task_id}`），
 *     再 router.push(`/tasks/{task_id}`)
 *   - 失败：行内短文案，不弹 toast
 *   - 未登录：跳 /login?callbackUrl=/#task-prompt，登录后回首页任务入口
 *
 * 视觉变体：
 *   - variant="dark"（默认）：绿底白字 → 嵌入 HeroDual 左卡（绿渐变背景）
 *   - variant="card"：白底，独立卡片用（保留旧用法，目前未引用）
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SkillPicker } from "@/components/skill/skill-picker";
import { useApi } from "@/hooks/use-api";
import { ApiError, UnauthorizedError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { Skill } from "@/lib/skills";
import { cn } from "@/lib/utils";

export interface TaskSkillRef {
  id: string;
  category: string;
  name: string;
  description?: string;
}

export interface TaskMCPToolRef {
  name: string;
  description: string;
}

export interface TaskTemplate {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  required_skill_ids: string[];
  required_skill_refs: TaskSkillRef[];
  required_mcp_tools: string[];
  required_mcp_tool_refs: TaskMCPToolRef[];
  example_query: string;
  expected_artifact_types: string[];
  default_visibility: "private" | "public";
}

interface TaskMCPToolOption {
  name: string;
  description: Record<Locale, string>;
}

interface RecommendItem {
  agent: {
    id: string;
    slug: string;
    name: string;
    description: string;
    price_per_call_cents: number;
    total_calls: number;
    avg_rating?: number;
    creator_name: string;
    tags: string[];
  };
  match_score: number;
  why: string;
  matched_skills: TaskSkillRef[];
}

interface RecommendResp {
  task_id: string;
  visibility: "private" | "public";
  public_summary?: string | null;
  parsed_skills: string[];
  parsed_skill_refs: TaskSkillRef[];
  mcp_tools: string[];
  mcp_tool_refs: TaskMCPToolRef[];
  recommendations: RecommendItem[];
  next_action?: TaskNextAction;
}

const SS_KEY_PREFIX = "ol:task:";

export interface TaskNextAction {
  type: string;
  label: string;
  hint: string;
  href: string;
  reason: string;
}

/** 暴露给 /tasks/[id] 复用：sessionStorage 缓存的 payload schema。 */
export interface TaskCachedPayload {
  query: string;
  visibility?: "private" | "public";
  public_summary?: string | null;
  parsed_skills: string[];
  parsed_skill_refs: TaskSkillRef[];
  mcp_tools: string[];
  mcp_tool_refs: TaskMCPToolRef[];
  recommendations: RecommendItem[];
  next_action?: TaskNextAction;
}

interface TaskPromptProps {
  variant?: "dark" | "card";
  skills?: Skill[];
  templates?: TaskTemplate[];
  showAssociations?: boolean;
  locale?: Locale;
}

const TASK_MCP_TOOLS: TaskMCPToolOption[] = [
  {
    name: "create_task",
    description: {
      zh: "创建任务并返回 Skill/MCP 引用和推荐 Agent",
      en: "Create a task and return Skill/MCP references plus matched Agents",
    },
  },
  {
    name: "run_agent",
    description: {
      zh: "调用选定 Agent，形成真实运行结果",
      en: "Invoke the selected Agent and produce a real run result",
    },
  },
  {
    name: "get_run",
    description: {
      zh: "查询运行状态和输出，补齐结果闭环",
      en: "Read run status and output to close the result loop",
    },
  },
  {
    name: "search_agents",
    description: {
      zh: "按关键词或标签搜索可接入的 Agent",
      en: "Search Agents by keyword or tag",
    },
  },
  {
    name: "get_agent",
    description: {
      zh: "读取 Agent 详情、能力声明和示例",
      en: "Read Agent details, capability claims, and examples",
    },
  },
];

export function TaskPrompt({
  variant = "dark",
  skills = [],
  templates = [],
  showAssociations = false,
  locale = "zh",
}: TaskPromptProps) {
  const router = useRouter();
  const { fetch, isAuthenticated } = useApi();
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMCPTools, setSelectedMCPTools] = useState<string[]>([
    "create_task",
    "run_agent",
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const associationEnabled = variant === "card" && showAssociations;
  const copy =
    locale === "zh"
      ? {
          empty: "请先描述一下你想做的事",
          recommendFailed: "推荐失败，请稍后重试",
          network: "网络异常，请稍后重试",
          placeholderDark: "例如：把这份英文产品文档翻译成中文并生成摘要",
          hintDark: "优先推荐可运行 Agent；无匹配会给下一步",
          submit: "推荐 Agent →",
          submitting: "正在匹配…",
          labelCard: "描述任务 · AI 帮你匹配",
          placeholderCard: "描述你想要完成的任务，例如：把这份英文产品文档翻译成中文并生成摘要",
          skillTitle: "关联 Skill",
          skillDesc: "手动选择会优先进入推荐；自然语言解析结果会继续补齐。",
          optional: "可选",
          skillLoadFailed: "Skill 目录暂时加载失败；仍可提交任务，让后端按描述解析。",
          mcpTitle: "关联 MCP 工具链",
          mcpDesc: "这些引用会保存到任务记录，外部客户端也能按同一链路继续调用。",
          selected: "已选",
          footer: "先关联 Skill/MCP，再优先匹配可运行 Agent；无匹配时会给出下一步。",
          templatesTitle: "任务模板",
          templatesDesc: "选择模板会带上固定 Skill 要求，后端仍默认创建私有草稿。",
          templateVisibility: "私有草稿",
        }
      : {
          empty: "Describe what you want to accomplish first",
          recommendFailed: "Matching failed. Try again later.",
          network: "Network error. Try again later.",
          placeholderDark: "Example: translate this English product doc into Chinese and summarize it",
          hintDark: "Callable Agents first; clear next step if there is no match",
          submit: "Match Agent →",
          submitting: "Matching…",
          labelCard: "Describe a task · AI matching",
          placeholderCard: "Describe what you want done, e.g. translate this English product doc into Chinese and summarize it",
          skillTitle: "Linked Skills",
          skillDesc: "Manual selections are prioritized; natural-language parsing still fills gaps.",
          optional: "Optional",
          skillLoadFailed: "Skill catalog failed to load. You can still submit and let the backend parse the task.",
          mcpTitle: "Linked MCP tools",
          mcpDesc: "These references are saved on the task so external clients can continue through the same path.",
          selected: "Selected",
          footer: "Link Skill/MCP context, prioritize callable Agents, and get a next step when there is no match.",
          templatesTitle: "Task templates",
          templatesDesc: "Choosing a template sends fixed Skill requirements while keeping the task private by default.",
          templateVisibility: "Private draft",
        };

  const selectTemplate = (template: TaskTemplate) => {
    setSelectedTemplateId((current) => (current === template.id ? "" : template.id));
    if (selectedTemplateId !== template.id) {
      setQuery(template.example_query);
      setError(null);
    }
  };

  const toggleMCPTool = (name: string) => {
    setSelectedMCPTools((current) => {
      if (current.includes(name)) {
        return current.filter((item) => item !== name);
      }
      if (current.length >= 5) return current;
      return [...current, name];
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError(copy.empty);
      return;
    }
    if (!isAuthenticated) {
      router.push("/login?callbackUrl=/%23task-prompt");
      return;
    }
    setError(null);
    startSubmit(async () => {
      try {
        const body: {
          query: string;
          template_id?: string;
          skill_ids?: string[];
          mcp_tools?: string[];
        } = { query: trimmed };
        if (associationEnabled && selectedTemplateId) {
          body.template_id = selectedTemplateId;
        }
        if (associationEnabled && selectedSkillIds.length > 0) {
          body.skill_ids = selectedSkillIds;
        }
        if (associationEnabled && selectedMCPTools.length > 0) {
          body.mcp_tools = selectedMCPTools;
        }
        const data = await fetch<RecommendResp>("/api/v1/tasks/recommend", {
          method: "POST",
          body,
        });
        try {
          const payload: TaskCachedPayload = {
            query: trimmed,
            visibility: data.visibility,
            public_summary: data.public_summary ?? null,
            parsed_skills: data.parsed_skills,
            parsed_skill_refs: data.parsed_skill_refs ?? [],
            mcp_tools: data.mcp_tools ?? [],
            mcp_tool_refs: data.mcp_tool_refs ?? [],
            recommendations: data.recommendations,
            next_action: data.next_action,
          };
          sessionStorage.setItem(
            SS_KEY_PREFIX + data.task_id,
            JSON.stringify(payload),
          );
        } catch {
          // sessionStorage 不可用时静默降级
        }
        router.push(`/tasks/${encodeURIComponent(data.task_id)}`);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          router.push("/login?callbackUrl=/%23task-prompt");
          return;
        }
        if (err instanceof ApiError) {
          setError(err.message || copy.recommendFailed);
        } else {
          setError(copy.network);
        }
      }
    });
  };

  if (variant === "dark") {
    return (
      <form
        id="task-prompt"
        onSubmit={onSubmit}
        className="mt-3.5 space-y-2.5 scroll-mt-24"
      >
        <textarea
          id="ol-task-query"
          name="query"
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.placeholderDark}
          className="block w-full resize-none rounded-xl border border-white/25 bg-white/12 px-3.5 py-2.5 text-[13px] leading-relaxed text-white placeholder:text-white/55 outline-none transition focus:border-white/55 focus:bg-white/18"
          maxLength={1000}
          disabled={submitting}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] text-white/70">
            {copy.hintDark}
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-black text-[color:var(--ol-primary-dark)] shadow-sm transition hover:bg-[color:var(--ol-mint)] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? copy.submitting : copy.submit}
          </button>
        </div>
        {error ? (
          <p className="text-[12px] font-bold text-amber-100">{error}</p>
        ) : null}
      </form>
    );
  }

  // card 变体（独立白卡，保留备用）
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[22px] border border-[color:var(--ol-line)] bg-white/95 p-5 shadow-[0_18px_40px_-22px_rgba(15,145,135,0.35)]"
    >
      <label htmlFor="ol-task-query" className="ol-kicker block">
        {copy.labelCard}
      </label>
      {associationEnabled && templates.length > 0 ? (
        <section className="mt-3 rounded-[18px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/55 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
                {copy.templatesTitle}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                {copy.templatesDesc}
              </p>
            </div>
            <span className="ol-chip ol-chip-mint">{copy.templateVisibility}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {templates.map((template) => {
              const active = selectedTemplateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={cn(
                    "min-h-[96px] rounded-[12px] border bg-white p-3 text-left transition hover:border-[color:var(--ol-primary)]/50",
                    active
                      ? "border-[color:var(--ol-primary)] ring-2 ring-[color:var(--ol-primary)]/15"
                      : "border-[color:var(--ol-line)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-[13px] font-black leading-snug text-[color:var(--ol-ink)]">
                      {template.title}
                    </strong>
                    <span className="ol-chip shrink-0">{template.category}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                    {template.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.required_skill_ids.slice(0, 3).map((skill) => (
                      <span key={skill} className="ol-chip ol-chip-blue max-w-full truncate">
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <textarea
        id="ol-task-query"
        name="query"
        rows={3}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy.placeholderCard}
        className="mt-2 block w-full resize-none rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/20"
        maxLength={1000}
        disabled={submitting}
      />
      {associationEnabled ? (
        <div className="mt-4 grid gap-4">
          <section className="rounded-[18px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/55 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
                  {copy.skillTitle}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                  {copy.skillDesc}
                </p>
              </div>
              <span className="ol-chip ol-chip-mint h-6 px-2 text-[11px]">
                {copy.optional}
              </span>
            </div>
            <div className="mt-3">
              {skills.length > 0 ? (
                <SkillPicker
                  skills={skills}
                  value={selectedSkillIds}
                  onChange={setSelectedSkillIds}
                  max={5}
                />
              ) : (
                <div className="rounded-[14px] border border-dashed border-[color:var(--ol-line)] bg-white px-3 py-3 text-[12.5px] text-[color:var(--ol-muted)]">
                  {copy.skillLoadFailed}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-black text-[color:var(--ol-ink)]">
                  {copy.mcpTitle}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                  {copy.mcpDesc}
                </p>
              </div>
              <span className="ol-chip h-6 px-2 text-[11px]">
                {copy.selected} {selectedMCPTools.length}/5
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TASK_MCP_TOOLS.map((tool) => {
                const checked = selectedMCPTools.includes(tool.name);
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => toggleMCPTool(tool.name)}
                    className={cn(
                      "rounded-[14px] border px-3 py-2.5 text-left transition",
                      checked
                        ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)]/8"
                        : "border-[color:var(--ol-line)] bg-white hover:border-[color:var(--ol-primary)]/40",
                    )}
                    aria-pressed={checked}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-black text-[color:var(--ol-ink)]">
                        {tool.name}
                      </span>
                      <span
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-full border",
                          checked
                            ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-primary)] text-white"
                            : "border-[color:var(--ol-line)]",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            checked ? "bg-white" : "bg-transparent",
                          )}
                        />
                      </span>
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-[color:var(--ol-muted)]">
                      {tool.description[locale]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] text-[color:var(--ol-muted)]">
          {copy.footer}
        </span>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[color:var(--ol-primary)] px-4 text-[13px] font-[900] text-white shadow-sm transition-colors hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-[12px] font-bold text-[#d93b3b]">{error}</p>
      ) : null}
    </form>
  );
}
