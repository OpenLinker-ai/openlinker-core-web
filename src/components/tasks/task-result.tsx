"use client";

/**
 * 任务推荐 3 卡区块（Client Component）。
 *
 * 数据：
 *   - 入参 task：来自 server-side `/api/v1/tasks/:id`
 *   - 后端返回 recommendations 时直接渲染；
 *     老数据 / 降级场景再读 sessionStorage[`ol:task:${id}`]
 *
 * 行为：
 *   - 点 "用这个 Agent" → POST /api/v1/tasks/:id/choose，body { agent_id }
 *     成功后跳 /playground/{slug}?prefill=<query>&autorun=1&task_id=<id>
 *   - 已选状态：task.chosen_agent_id 存在 → 卡片顶部置顶 + "已选择"chip
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SkillRef {
  id: string;
  category: string;
  name: string;
  description?: string;
}

interface MCPToolRef {
  name: string;
  description: string;
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
    tags?: string[];
  };
  match_score: number;
  why: string;
  matched_skills?: SkillRef[];
}

type TaskNextAction = {
  type: string;
  label: string;
  hint: string;
  href: string;
  reason: string;
};

interface CachedPayload {
  query: string;
  visibility?: "private" | "public";
  public_summary?: string | null;
  parsed_skills: string[];
  parsed_skill_refs?: SkillRef[];
  mcp_tools?: string[];
  mcp_tool_refs?: MCPToolRef[];
  recommendations: RecommendItem[];
  next_action?: TaskNextAction;
}

export interface TaskRow {
  id: string;
  query: string;
  visibility?: "private" | "public";
  public_summary?: string | null;
  published_at?: string | null;
  parsed_skills: string[];
  parsed_skill_refs?: SkillRef[];
  mcp_tools?: string[];
  mcp_tool_refs?: MCPToolRef[];
  recommended_agent_ids: string[];
  status?:
    | "open"
    | "matched"
    | "in_progress"
    | "completed"
    | "accepted"
    | "revision_requested"
    | "needs_agent";
  chosen_agent_id?: string | null;
  chosen_at?: string | null;
  claimed_agent_id?: string | null;
  claimed_at?: string | null;
  completion_run_id?: string | null;
  completed_at?: string | null;
  completion_summary?: string | null;
  delivery_status?: "pending" | "submitted" | "revision_requested" | "accepted" | "failed";
  delivery_visibility?: "private" | "shared" | "public_example";
  delivery_artifact?: Record<string, unknown> | null;
  accepted_at?: string | null;
  revision_requested_at?: string | null;
  revision_note?: string | null;
  created_at: string;
  recommendations?: RecommendItem[];
  next_action?: TaskNextAction;
}

interface Props {
  task: TaskRow;
  locale?: Locale;
}

const SS_KEY_PREFIX = "ol:task:";

export function TaskResult({ task, locale = "zh" }: Props) {
  const copy =
    locale === "zh"
      ? {
          chooseFailed: "选择失败，请稍后重试",
          network: "网络异常，请稍后重试",
        }
      : {
          chooseFailed: "Selection failed. Try again later.",
          network: "Network error. Try again later.",
        };
  const router = useRouter();
  const { fetch: apiFetch } = useApi();
  const cached = useSessionTaskCache(task.id);
  const payload = useMemo<CachedPayload | null>(() => {
    if (Array.isArray(task.recommendations) && task.recommendations.length > 0) {
      return {
        query: task.query,
        parsed_skills: task.parsed_skills,
        parsed_skill_refs: task.parsed_skill_refs ?? [],
        mcp_tools: task.mcp_tools ?? [],
        mcp_tool_refs: task.mcp_tool_refs ?? [],
        recommendations: task.recommendations,
        next_action: task.next_action,
      };
    }
    return cached;
  }, [
    cached,
    task.parsed_skill_refs,
    task.parsed_skills,
    task.mcp_tool_refs,
    task.mcp_tools,
    task.query,
    task.recommendations,
    task.next_action,
  ]);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [, startChoose] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 已选 Agent 置顶排序
  const ordered = useMemo(() => {
    if (!payload) return [];
    const list = [...payload.recommendations];
    if (task.chosen_agent_id) {
      list.sort((a, b) => {
        if (a.agent.id === task.chosen_agent_id) return -1;
        if (b.agent.id === task.chosen_agent_id) return 1;
        return 0;
      });
    }
    return list;
  }, [payload, task.chosen_agent_id]);

  const onChoose = (item: RecommendItem) => {
    setError(null);
    setChoosingId(item.agent.id);
    startChoose(async () => {
      try {
        await apiFetch(`/api/v1/tasks/${encodeURIComponent(task.id)}/choose`, {
          method: "POST",
          body: { agent_id: item.agent.id },
        });
        const url = `/playground/${encodeURIComponent(item.agent.slug)}?prefill=${encodeURIComponent(task.query)}&autorun=1&task_id=${encodeURIComponent(task.id)}`;
        router.push(url);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || copy.chooseFailed);
        } else {
          setError(copy.network);
        }
        setChoosingId(null);
      }
    });
  };

  if (!payload || ordered.length === 0) {
    return (
      <div className="space-y-4">
        <TaskWorkStatusPanel task={task} locale={locale} />
        <TaskPublicationPanel task={task} locale={locale} />
        <ColdFallback
          parsedSkillIds={task.parsed_skills}
          parsedSkillRefs={task.parsed_skill_refs ?? []}
          mcpTools={task.mcp_tools ?? []}
          mcpToolRefs={task.mcp_tool_refs ?? []}
          nextAction={task.next_action ?? payload?.next_action}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskWorkStatusPanel task={task} locale={locale} />
      <TaskPublicationPanel task={task} locale={locale} />
      <FlowClosurePanel locale={locale} />
      <SkillReferenceBar
        skillIds={payload.parsed_skills}
        skillRefs={payload.parsed_skill_refs ?? []}
        locale={locale}
      />
      <MCPReferenceBar
        toolNames={
          (payload.mcp_tools?.length ? payload.mcp_tools : task.mcp_tools) ?? []
        }
        toolRefs={
          (payload.mcp_tool_refs?.length
            ? payload.mcp_tool_refs
            : task.mcp_tool_refs) ?? []
        }
        locale={locale}
      />

      {error ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-bold text-[#d93b3b]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {ordered.map((item) => {
          const isChosen = task.chosen_agent_id === item.agent.id;
          const choosing = choosingId === item.agent.id;
          return (
            <RecommendCard
              key={item.agent.id}
              item={item}
              isChosen={isChosen}
              choosing={choosing}
              onChoose={() => onChoose(item)}
              locale={locale}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 子组件 ---------------- */

function TaskPublicationPanel({ task, locale }: { task: TaskRow; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          prompt: "公开摘要会展示在任务广场，请不要放入私密信息：",
          publishFailed: "发布失败，请稍后重试",
          kicker: "任务公开状态",
          publishedTitle: "已发布到任务广场",
          publishedBody: "任务广场只展示公开摘要，原始任务描述仍只在你的任务详情里可见。",
          board: "查看任务广场",
          draftTitle: "私有推荐草稿",
          draftBody: "当前任务不会出现在任务广场。你可以先选择推荐 Agent；如果没有合适候选，再发布公开摘要让创作者接入。",
          publishing: "发布中…",
          publish: "发布到任务广场",
        }
      : {
          prompt: "The public summary is shown on the task board. Do not include private information:",
          publishFailed: "Publishing failed. Try again later.",
          kicker: "Task visibility",
          publishedTitle: "Published to task board",
          publishedBody: "The task board only shows the public summary. The original task description remains visible only in your task detail.",
          board: "View task board",
          draftTitle: "Private recommendation draft",
          draftBody: "This task is not shown on the task board. You can choose a recommended Agent first; if no candidate fits, publish a public summary so creators can join.",
          publishing: "Publishing…",
          publish: "Publish to task board",
        };
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibility = task.visibility ?? "private";

  const publish = async () => {
    const suggested = task.public_summary || trimTaskSummary(task.query, 160);
    const summary = window.prompt(
      copy.prompt,
      suggested,
    );
    if (summary === null) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/tasks/${encodeURIComponent(task.id)}/publish`, {
        method: "POST",
        body: summary.trim() ? { public_summary: summary.trim() } : {},
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.publishFailed);
    } finally {
      setBusy(false);
    }
  };

  if (visibility === "public") {
    return (
      <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="ol-kicker">{copy.kicker}</div>
            <h2 className="mt-1 text-[16px] font-black text-[color:var(--ol-ink)]">
              {copy.publishedTitle}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.publishedBody}
            </p>
            {task.public_summary ? (
              <p className="mt-3 rounded-[14px] bg-[color:var(--ol-soft)] p-3 text-[13px] leading-relaxed text-[color:var(--ol-ink)]">
                {task.public_summary}
              </p>
            ) : null}
          </div>
          <Link href="/tasks" className="ol-mini-btn">
            {copy.board}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="ol-kicker">{copy.kicker}</div>
          <h2 className="mt-1 text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.draftTitle}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.draftBody}
          </p>
          {error ? (
            <p className="mt-2 text-[12px] font-bold text-[#d93b3b]">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={busy}
          className="inline-flex h-9 items-center rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12.5px] font-black text-white hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? copy.publishing : copy.publish}
        </button>
      </div>
    </div>
  );
}

function subscribeSessionStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function useSessionTaskCache(taskID: string): CachedPayload | null {
  const raw = useSyncExternalStore(
    subscribeSessionStorage,
    () => {
      if (typeof window === "undefined") return null;
      return sessionStorage.getItem(SS_KEY_PREFIX + taskID);
    },
    () => null,
  );

  return useMemo(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CachedPayload;
      return parsed && Array.isArray(parsed.recommendations) ? parsed : null;
    } catch {
      return null;
    }
  }, [raw]);
}

function RecommendCard({
  item,
  isChosen,
  choosing,
  onChoose,
  locale,
}: {
  item: RecommendItem;
  isChosen: boolean;
  choosing: boolean;
  onChoose: () => void;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          match: "匹配度",
          matchedSkills: "命中 Skill：",
          tags: "Agent 标签：",
          why: "为什么推荐：",
          price: (price: string, calls: string) => `当前免费 · 未来展示价 $${price} / 次 · ${calls} 调用`,
          chosen: "已选择",
          jumping: "正在跳转…",
          retry: "再次试用 →",
          choose: "用这个 Agent →",
        }
      : {
          match: "Match score",
          matchedSkills: "Matched Skills:",
          tags: "Agent tags:",
          why: "Why recommended:",
          price: (price: string, calls: string) => `Free now · future display price $${price} / run · ${calls} calls`,
          chosen: "Selected",
          jumping: "Opening…",
          retry: "Try again →",
          choose: "Use this Agent →",
        };
  const { agent, match_score, why } = item;
  const priceUSD = (agent.price_per_call_cents / 100).toFixed(3);
  const matchPct = Math.round(Math.max(0, Math.min(1, match_score)) * 100);
  const matchedSkills = item.matched_skills ?? [];
  const tags = agent.tags ?? [];

  return (
    <article
      className={cn(
        "ol-panel flex flex-col gap-3 p-5 transition",
        isChosen
          ? "border-[color:var(--ol-primary)] shadow-[0_18px_40px_-22px_rgba(15,145,135,0.45)]"
          : "hover:border-[color:var(--ol-primary)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-black text-[color:var(--ol-ink)]">
            <Link
              href={`/agents/${encodeURIComponent(agent.slug)}`}
              className="hover:text-[color:var(--ol-primary-dark)]"
            >
              {agent.name}
            </Link>
          </h3>
          <p className="mt-1 truncate text-[12px] font-extrabold text-[color:var(--ol-muted)]">
            by {agent.creator_name}
          </p>
        </div>
        <span
          className="ol-chip ol-chip-blue h-7 shrink-0 px-2.5 text-[12px]"
          title={copy.match}
        >
          {matchPct}%
        </span>
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
        {agent.description}
      </p>

      {matchedSkills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
          <span className="font-[900] text-[color:var(--ol-ink)]">
            {copy.matchedSkills}
          </span>
          <SkillRefChips skillRefs={matchedSkills} />
        </div>
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
          <span className="font-[900] text-[color:var(--ol-ink)]">
            {copy.tags}
          </span>
          {tags.map((tag) => (
            <span key={tag} className="ol-chip">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* why 文案 */}
      {why ? (
        <div className="rounded-[12px] bg-[color:var(--ol-soft)] px-3 py-2 text-[12.5px] leading-relaxed text-[color:var(--ol-ink)]">
          <span className="mr-1 font-[900] text-[color:var(--ol-primary-dark)]">
            {copy.why}
          </span>
          {why}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-[12px] text-[color:var(--ol-muted)]">
        <span>
          {copy.price(priceUSD, agent.total_calls.toLocaleString())}
        </span>
        {isChosen ? (
          <span className="ol-chip ol-chip-green h-6 px-2 text-[11.5px]">
            {copy.chosen}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onChoose}
        disabled={choosing}
        className={cn(
          "mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-[900] shadow-sm transition-colors disabled:cursor-wait disabled:opacity-70",
          isChosen
            ? "bg-[color:var(--ol-primary-dark)] text-white hover:bg-[color:var(--ol-primary)]"
            : "bg-[color:var(--ol-primary)] text-white hover:bg-[color:var(--ol-primary-dark)]",
        )}
      >
        {choosing ? copy.jumping : isChosen ? copy.retry : copy.choose}
      </button>
    </article>
  );
}

function FlowClosurePanel({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "发布任务闭环",
          body: (
            <>
              Web 发布页和 MCP <code>create_task</code>{" "}
              共用同一条解析链：自然语言 → Skill 引用 → Agent 推荐 → 选择后进入
              Playground 自动运行；成功后写回任务结果。外部客户端则继续调用{" "}
              <code>run_agent</code>。
            </>
          ),
          skills: "查看 Skill",
          connect: "MCP 接入",
        }
      : {
          title: "Task publishing loop",
          body: (
            <>
              The web publishing page and MCP <code>create_task</code>{" "}
              share the same parsing chain: natural language → Skill references → Agent recommendation → selected Agent opens Playground autorun. Successful runs write back to the task result. External clients continue through{" "}
              <code>run_agent</code>.
            </>
          ),
          skills: "View Skills",
          connect: "MCP docs",
        };
  return (
    <div className="grid gap-3 rounded-[18px] border border-[color:var(--ol-line)] bg-white/85 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <div className="ol-kicker">{copy.title}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/skills"
          className="inline-flex h-9 items-center rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
        >
          {copy.skills}
        </Link>
        <Link
          href="/connect"
          className="inline-flex h-9 items-center rounded-xl bg-[color:var(--ol-ink)] px-3 text-[12px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          {copy.connect}
        </Link>
      </div>
    </div>
  );
}

function TaskWorkStatusPanel({ task, locale }: { task: TaskRow; locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          acceptFailed: "验收失败，请稍后重试",
          revisionPrompt: "写下需要补充或修改的内容：",
          revisionFailed: "请求修订失败，请稍后重试",
          kicker: "任务执行状态",
          acceptedTitle: "任务已验收",
          revisionTitle: "已要求修订",
          completedTitle: "任务已提交",
          waitingTitle: "Agent 已接入，等待结果",
          acceptedBody: "发布者已验收这次交付，任务闭环完成。",
          revisionBody: "发布者要求补充修改；原接入 Agent 可以再次运行并重新提交。",
          completedBody: "这次任务已经绑定成功运行，并把结果作为交付提交。",
          waitingBody: "创作者已经用自己的 Agent 接入任务，完成后会把 run 结果回填到这里。",
          viewRun: "查看 Run",
          accepting: "验收中…",
          accept: "验收",
          submitting: "提交中…",
          requestRevision: "要求修订",
          revisionNote: "修订要求",
        }
      : {
          acceptFailed: "Acceptance failed. Try again later.",
          revisionPrompt: "Describe what needs to be added or changed:",
          revisionFailed: "Revision request failed. Try again later.",
          kicker: "Task work status",
          acceptedTitle: "Task accepted",
          revisionTitle: "Revision requested",
          completedTitle: "Task submitted",
          waitingTitle: "Agent joined, waiting for result",
          acceptedBody: "The publisher accepted this delivery and the task loop is complete.",
          revisionBody: "The publisher requested changes. The original Agent can rerun and resubmit.",
          completedBody: "This task is bound to a successful run and submitted as delivery.",
          waitingBody: "A creator joined with their Agent. When complete, the run result will be written back here.",
          viewRun: "View Run",
          accepting: "Accepting…",
          accept: "Accept",
          submitting: "Submitting…",
          requestRevision: "Request revision",
          revisionNote: "Revision note",
        };
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "revision" | null>(null);
  if (
    !task.claimed_agent_id &&
    !task.completion_summary &&
    task.status !== "completed" &&
    task.status !== "accepted" &&
    task.status !== "revision_requested"
  ) {
    return null;
  }
  const completed = task.status === "completed" || Boolean(task.completed_at);
  const accepted = task.status === "accepted" || task.delivery_status === "accepted";
  const revisionRequested =
    task.status === "revision_requested" ||
    task.delivery_status === "revision_requested";
  const submitted = task.delivery_status === "submitted" || completed;

  const accept = async () => {
    setBusy("accept");
    try {
      await apiFetch(`/api/v1/tasks/${encodeURIComponent(task.id)}/accept`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : copy.acceptFailed);
    } finally {
      setBusy(null);
    }
  };

  const requestRevision = async () => {
    const note = window.prompt(copy.revisionPrompt);
    if (!note?.trim()) return;
    setBusy("revision");
    try {
      await apiFetch(`/api/v1/tasks/${encodeURIComponent(task.id)}/revision`, {
        method: "POST",
        body: { note: note.trim() },
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : copy.revisionFailed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="ol-kicker">{copy.kicker}</div>
          <h2 className="mt-1 text-[18px] font-black text-[color:var(--ol-ink)]">
            {accepted
              ? copy.acceptedTitle
              : revisionRequested
                ? copy.revisionTitle
                : completed
                  ? copy.completedTitle
                  : copy.waitingTitle}
          </h2>
          <p className="mt-1 text-[13px] text-[color:var(--ol-muted)]">
            {accepted
              ? copy.acceptedBody
              : revisionRequested
                ? copy.revisionBody
                : completed
                  ? copy.completedBody
              : copy.waitingBody}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {task.completion_run_id ? (
            <Link href={`/run/${encodeURIComponent(task.completion_run_id)}`} className="ol-mini-btn">
              {copy.viewRun}
            </Link>
          ) : null}
          {submitted && !accepted && !revisionRequested ? (
            <>
              <button
                type="button"
                onClick={() => void accept()}
                disabled={busy !== null}
                className="ol-mini-btn bg-[color:var(--ol-primary)] text-white disabled:cursor-wait disabled:opacity-70"
              >
                {busy === "accept" ? copy.accepting : copy.accept}
              </button>
              <button
                type="button"
                onClick={() => void requestRevision()}
                disabled={busy !== null}
                className="ol-mini-btn bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] disabled:cursor-wait disabled:opacity-70"
              >
                {busy === "revision" ? copy.submitting : copy.requestRevision}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {task.completion_summary ? (
        <div className="mt-4 rounded-[14px] bg-[color:var(--ol-soft)] p-3 text-[13px] leading-relaxed text-[color:var(--ol-ink)]">
          {task.completion_summary}
        </div>
      ) : null}
      {task.revision_note ? (
        <div className="mt-3 rounded-[14px] border border-[color:var(--ol-amber)]/25 bg-[color:var(--ol-amber-soft)] p-3 text-[13px] leading-relaxed text-[color:var(--ol-amber)]">
          {copy.revisionNote}: {task.revision_note}
        </div>
      ) : null}
      {task.delivery_artifact ? (
        <pre className="mt-3 max-h-[260px] overflow-auto rounded-[14px] bg-[#102033] p-3 text-[12px] leading-relaxed text-white">
          <code>{JSON.stringify(task.delivery_artifact, null, 2)}</code>
        </pre>
      ) : null}
    </div>
  );
}

function SkillReferenceBar({
  skillIds,
  skillRefs,
  locale,
}: {
  skillIds: string[];
  skillRefs: SkillRef[];
  locale: Locale;
}) {
  const label = locale === "zh" ? "关联 Skill：" : "Linked Skills:";
  if (skillRefs.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
        <span className="font-[800]">{label}</span>
        <SkillRefChips skillRefs={skillRefs} />
      </div>
    );
  }
  if (skillIds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
      <span className="font-[800]">{label}</span>
      {skillIds.map((sid) => (
        <span key={sid} className="ol-chip ol-chip-mint">
          {sid}
        </span>
      ))}
    </div>
  );
}

function SkillRefChips({ skillRefs }: { skillRefs: SkillRef[] }) {
  return (
    <>
      {skillRefs.map((skill) => (
        <span
          key={skill.id}
          className="ol-chip ol-chip-mint"
          title={skill.description || skill.id}
        >
          {skill.name}
          <span className="ml-1 text-[10.5px] font-bold opacity-70">
            {skill.id}
          </span>
        </span>
      ))}
    </>
  );
}

function MCPReferenceBar({
  toolNames,
  toolRefs,
  locale,
}: {
  toolNames: string[];
  toolRefs: MCPToolRef[];
  locale: Locale;
}) {
  const label = locale === "zh" ? "关联 MCP：" : "Linked MCP:";
  if (toolRefs.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
        <span className="font-[800]">{label}</span>
        {toolRefs.map((tool) => (
          <span
            key={tool.name}
            className="ol-chip ol-chip-blue"
            title={tool.description}
          >
            {tool.name}
          </span>
        ))}
      </div>
    );
  }
  if (toolNames.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
      <span className="font-[800]">{label}</span>
      {toolNames.map((name) => (
        <span key={name} className="ol-chip ol-chip-blue">
          {name}
        </span>
      ))}
    </div>
  );
}

function ColdFallback({
  parsedSkillIds,
  parsedSkillRefs,
  mcpTools,
  mcpToolRefs,
  nextAction,
  locale,
}: {
  parsedSkillIds: string[];
  parsedSkillRefs: SkillRef[];
  mcpTools: string[];
  mcpToolRefs: MCPToolRef[];
  nextAction?: TaskNextAction;
  locale: Locale;
}) {
  const copy =
    locale === "zh"
      ? {
          saved: "任务已保存",
          noAgent: "当前没有可直接推荐的 Agent，系统已给出下一步。",
          cacheMiss: "推荐结果未在当前会话缓存（可能是新链接或刷新过页面）。你可以回到首页重新发起一次推荐，或者直接去市场浏览。",
          reason: "原因",
          skill: "关联 Skill：",
          retry: "← 重新描述任务",
          market: "浏览市场 →",
        }
      : {
          saved: "Task saved",
          noAgent: "No directly recommendable Agent is available. The system provided the next step.",
          cacheMiss: "Recommendation results are not cached in this session, likely because this is a new link or refreshed page. Return home to request recommendations again, or browse the market directly.",
          reason: "Reason",
          skill: "Linked Skills:",
          retry: "← Describe again",
          market: "Browse market →",
        };
  return (
    <div className="ol-panel ol-panel-pad">
      <div className="text-[14px] font-[850] text-[color:var(--ol-ink)]">
        {copy.saved}
      </div>
      <p className="mt-2 text-[13px] text-[color:var(--ol-muted)]">
        {nextAction
          ? copy.noAgent
          : copy.cacheMiss}
      </p>
      {nextAction ? (
        <div className="mt-3 rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
          <div className="font-black text-[color:var(--ol-ink)]">
            {nextAction.label}
          </div>
          <p className="mt-1">{nextAction.hint}</p>
          <p className="mt-2 text-[12px] font-bold text-[color:var(--ol-subtle)]">
            {copy.reason}: {nextAction.reason}
          </p>
        </div>
      ) : null}
      {parsedSkillRefs.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
          <span className="font-[800]">{copy.skill}</span>
          <SkillRefChips skillRefs={parsedSkillRefs} />
        </div>
      ) : parsedSkillIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
          <span className="font-[800]">{copy.skill}</span>
          {parsedSkillIds.map((sid) => (
            <span key={sid} className="ol-chip ol-chip-mint">
              {sid}
            </span>
          ))}
        </div>
      ) : null}
      {mcpTools.length > 0 || mcpToolRefs.length > 0 ? (
        <div className="mt-3">
          <MCPReferenceBar toolNames={mcpTools} toolRefs={mcpToolRefs} locale={locale} />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--ol-primary)] px-3.5 text-[12.5px] font-[900] text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          {copy.retry}
        </Link>
        <Link
          href="/market"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--ol-line)] bg-white px-3.5 text-[12.5px] font-[900] text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
        >
          {copy.market}
        </Link>
      </div>
    </div>
  );
}

function trimTaskSummary(value: string, max: number) {
  const compact = value.trim().replace(/\s+/g, " ");
  const chars = Array.from(compact);
  if (chars.length <= max) return compact;
  return chars.slice(0, max).join("");
}
