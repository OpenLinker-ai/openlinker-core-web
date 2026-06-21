"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TaskStatus =
  | "open"
  | "matched"
  | "in_progress"
  | "completed"
  | "accepted"
  | "revision_requested"
  | "needs_agent";

type SkillRef = {
  id: string;
  category: string;
  name: string;
  description?: string;
};

type MCPToolRef = {
  name: string;
  description: string;
};

type CreatorAgent = {
  id: string;
  slug: string;
  name: string;
  tags?: string[];
  lifecycle_status?: string;
  visibility?: string;
};

type CreatorAgentsResponse = {
  items?: CreatorAgent[];
};

export type TaskBoardItem = {
  id: string;
  query: string;
  public_summary?: string;
  published_at?: string | null;
  parsed_skills: string[];
  parsed_skill_refs: SkillRef[];
  mcp_tools?: string[];
  mcp_tool_refs?: MCPToolRef[];
  recommended_agent_count: number;
  status: TaskStatus;
  claimed_agent_id?: string | null;
  claimed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

interface TaskBoardProps {
  tasks: TaskBoardItem[];
  loadFailed?: boolean;
  locale?: Locale;
}

const FILTER_ALL = "__all";

const STATUS_LABEL: Record<Locale, Record<TaskStatus, string>> = {
  zh: {
    open: "可接入",
    matched: "已选择 Agent",
    in_progress: "进行中",
    completed: "已完成",
    accepted: "已验收",
    revision_requested: "待修订",
    needs_agent: "待补 Agent",
  },
  en: {
    open: "Open",
    matched: "Agent selected",
    in_progress: "In progress",
    completed: "Completed",
    accepted: "Accepted",
    revision_requested: "Revision requested",
    needs_agent: "Needs Agent",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI",
  data: "数据",
  dev: "开发",
  ops: "运营",
  doc: "文档",
  finance: "财务",
};

export function TaskBoard({ tasks, loadFailed = false, locale = "zh" }: TaskBoardProps) {
  const [filter, setFilter] = useState(FILTER_ALL);
  const [query, setQuery] = useState("");
  const copy =
    locale === "zh"
      ? {
          all: "全部",
          filterTitle: "任务筛选",
          publicTasks: `公开任务 · 共 ${tasks.length.toLocaleString()} 个`,
          search: "搜索任务或 Skill",
          loadFailed: "暂时无法连接任务数据，请检查后端服务或稍后刷新。",
          empty: "还没有匹配的公开任务。换个筛选条件或搜索词试试。",
          candidates: (n: number) => `${n} 个候选 Agent`,
          summary: "公开需求池中的任务摘要。创作者可以根据命中的 Skill 和 MCP 工具链判断自己的 Agent 是否适合接入；完整私有描述不会在广场展示。",
          shown: "已显示公开摘要",
          similar: "找相似 Agent",
          queue: "队列概览",
          publicMetric: "公开任务",
          openMetric: "可接入",
          startMode: "开始方式",
          startValue: "选 Agent 运行",
          who: "谁可以帮忙",
          guide: [
            "1. 按 Skill、MCP 或关键词筛选公开任务。",
            "2. 判断自己的 Agent 是否覆盖任务能力。",
            "3. 选择我的 Agent 后，平台先登记接入关系，再进入 Playground 自动运行。",
          ],
        }
      : {
          all: "All",
          filterTitle: "Task filters",
          publicTasks: `${tasks.length.toLocaleString()} public tasks`,
          search: "Search task or Skill",
          loadFailed: "Task data is temporarily unavailable. Check the backend service or refresh later.",
          empty: "No public tasks match this filter. Try another filter or search term.",
          candidates: (n: number) => `${n} candidate Agents`,
          summary: "Public summary from the task pool. Creators can use matched Skills and MCP tools to decide whether their Agent fits; private task details are not shown here.",
          shown: "Public summary shown",
          similar: "Find similar Agents",
          queue: "Queue overview",
          publicMetric: "Public tasks",
          openMetric: "Open",
          startMode: "Start mode",
          startValue: "Choose Agent",
          who: "Who can help",
          guide: [
            "1. Filter public tasks by Skill, MCP, or keyword.",
            "2. Check whether your Agent covers the required capability.",
            "3. Choose your Agent; OpenLinker records the claim and starts Playground.",
          ],
        };

  const filters = useMemo(() => {
    const categories = new Set<string>();
    for (const task of tasks) {
      for (const skill of task.parsed_skill_refs ?? []) {
        if (skill.category) categories.add(skill.category);
      }
    }
    return [FILTER_ALL, ...Array.from(categories).sort()];
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const categoryOK =
        filter === FILTER_ALL ||
        (task.parsed_skill_refs ?? []).some((skill) => skill.category === filter);
      const searchOK =
        !term ||
        task.query.toLowerCase().includes(term) ||
        task.parsed_skills.some((skill) => skill.toLowerCase().includes(term)) ||
        (task.parsed_skill_refs ?? []).some((skill) =>
          `${skill.name} ${skill.id}`.toLowerCase().includes(term),
        ) ||
        (task.mcp_tools ?? []).some((tool) => tool.toLowerCase().includes(term));
      return categoryOK && searchOK;
    });
  }, [filter, query, tasks]);

  const openCount = tasks.filter((task) => task.status === "open" || task.status === "needs_agent").length;

  return (
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_310px]">
      <aside className="ol-panel ol-panel-pad h-fit">
        <div className="ol-kicker">task board</div>
        <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
          {copy.filterTitle}
        </h2>
        <div className="mt-4 ol-filter-list">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn("ol-filter-item", filter === item && "active")}
            >
              {categoryLabel(item, copy.all)}
              <span>{countByFilter(tasks, item)}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.publicTasks}</strong>
          <div className="ol-search h-9 w-[260px] max-w-full">
            <Icon name="target" size="sm" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
            />
          </div>
        </div>
        <div className="grid gap-3 p-4">
          {loadFailed ? (
            <EmptyState text={copy.loadFailed} />
          ) : visibleTasks.length === 0 ? (
            <EmptyState text={copy.empty} />
          ) : (
            visibleTasks.map((task) => {
              const primarySkill = task.parsed_skill_refs?.[0]?.id ?? task.parsed_skills[0] ?? "";
              return (
                <article
                  key={task.id}
                  className="rounded-[16px] border border-[color:var(--ol-line)] bg-white p-4 transition hover:border-[color:var(--ol-primary)]/35"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ol-chip ol-chip-blue">
                          {statusLabel(task, locale)}
                        </span>
                        <span className="ol-chip ol-chip-mint">
                          {copy.candidates(task.recommended_agent_count)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[17px] font-black leading-snug text-[color:var(--ol-ink)]">
                        {task.public_summary || task.query}
                      </h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
                        {copy.summary}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[18px] font-black text-[color:var(--ol-ink)]">
                        {statusHeadline(task, locale)}
                      </div>
                      <div className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                        {formatDate(task.published_at || task.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        {(task.parsed_skill_refs ?? []).length > 0
                          ? task.parsed_skill_refs.map((skill) => (
                              <span
                                key={skill.id}
                                className="ol-chip"
                                title={skill.description || skill.id}
                              >
                                {skill.name}
                              </span>
                            ))
                          : task.parsed_skills.map((skill) => (
                              <span key={skill} className="ol-chip">
                                {skill}
                              </span>
                            ))}
                      </div>
                      {(task.mcp_tool_refs ?? []).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ol-muted)]">
                          <span className="font-black text-[color:var(--ol-ink)]">
                            MCP：
                          </span>
                          {(task.mcp_tool_refs ?? []).map((tool) => (
                            <span
                              key={tool.name}
                              className="ol-chip ol-chip-blue"
                              title={tool.description}
                            >
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="grid justify-items-start gap-2 sm:justify-items-end">
                      <TaskStartAction task={task} locale={locale} />
                      <span className="inline-flex h-9 items-center rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-black text-[color:var(--ol-muted)]">
                        {copy.shown}
                      </span>
                      <Link
                        href={
                          primarySkill
                            ? `/market?q=${encodeURIComponent(primarySkill)}`
                            : "/market"
                        }
                        className="inline-flex h-9 items-center rounded-[12px] bg-[color:var(--ol-primary-dark)] px-3 text-[12.5px] font-black text-white"
                      >
                        {copy.similar}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.queue}
          </h2>
          <div className="mt-4 grid gap-3">
            <Metric label={copy.publicMetric} value={String(tasks.length)} />
            <Metric label={copy.openMetric} value={String(openCount)} />
            <Metric label={copy.startMode} value={copy.startValue} />
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.who}
          </h2>
          <div className="mt-4 grid gap-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.guide.map((step) => (
              <div key={step}>{step}</div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function TaskStartAction({ task, locale = "zh" }: { task: TaskBoardItem; locale?: Locale }) {
  const { fetch: apiFetch, isAuthenticated } = useApi();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState<CreatorAgent[]>([]);
  const loadStarted = useRef(false);
  const [loading, setLoading] = useState(false);
  const [claimingAgentID, setClaimingAgentID] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const copy =
    locale === "zh"
      ? {
          loadFailed: "暂时无法读取你的 Agent",
          claimFailed: "接入任务失败，请刷新后重试",
          claimRetry: "接入任务失败，请稍后重试",
          accepted: "任务已验收",
          completed: "任务已完成",
          locked: "已有人接入",
          select: "选择我的 Agent",
          canDo: "我可以做",
          loginBody: "登录后才能读取你的 Agent，并用任务内容启动一次运行。",
          login: "登录后开始",
          loading: "正在读取你的 Agent…",
          expired: "登录状态已过期，请重新登录后再选择你的 Agent。",
          noAgentPrefix: (err: string) => `${err}。先进入创作者中心接入一个 Agent，再回来接任务。`,
          relogin: "重新登录",
          hub: "创作者中心",
          publish: "接入 Agent",
          noAgents: "你还没有可在 Playground 启动的 Agent。接任务前需要先注册一个 public 或 unlisted Agent。",
          newAgent: "接入新 Agent",
          myAgents: "查看我的 Agent",
          chooseBody: "选择你的 Agent，平台会先登记接入关系，再带任务进入 Playground 自动运行：",
          claiming: "正在接入…",
          more: "去创作者中心查看更多 Agent",
        }
      : {
          loadFailed: "Could not read your Agents right now",
          claimFailed: "Could not claim this task. Refresh and try again.",
          claimRetry: "Could not claim this task. Try again later.",
          accepted: "Task accepted",
          completed: "Task completed",
          locked: "Already claimed",
          select: "Choose my Agent",
          canDo: "I can help",
          loginBody: "Sign in to read your Agents and start a run with this task.",
          login: "Sign in to start",
          loading: "Loading your Agents...",
          expired: "Your session expired. Sign in again before choosing your Agent.",
          noAgentPrefix: (err: string) => `${err}. Connect an Agent in Creator Hub first, then return to claim tasks.`,
          relogin: "Sign in again",
          hub: "Creator Hub",
          publish: "Connect Agent",
          noAgents: "You do not have an Agent that can start in Playground yet. Register a public or unlisted Agent before claiming tasks.",
          newAgent: "Connect new Agent",
          myAgents: "View my Agents",
          chooseBody: "Choose your Agent. OpenLinker records the claim, then opens Playground with this task:",
          claiming: "Claiming...",
          more: "Open Creator Hub to see more Agents",
        };
  const loadFailedText = copy.loadFailed;

  useEffect(() => {
    if (!expanded || !isAuthenticated || loadStarted.current) {
      return;
    }

    let active = true;
    loadStarted.current = true;
    Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setLoading(true);
        return apiFetch<CreatorAgentsResponse>("/api/v1/creator/agents");
      })
      .then((data) => {
        if (!active || !data) return;
        setAgents(data.items ?? []);
        setError("");
        setErrorStatus(null);
      })
      .catch((err) => {
        if (!active) return;
        setErrorStatus(err instanceof ApiError ? err.status : null);
        setError(
          err instanceof ApiError
            ? err.message
            : loadFailedText,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiFetch, expanded, isAuthenticated, loadFailedText]);

  const activeAgents = agents.filter(
    (agent) =>
      agent.lifecycle_status !== "disabled" && agent.visibility !== "private",
  );
  const taskLocked =
    task.status === "matched" ||
    task.status === "in_progress" ||
    task.status === "completed" ||
    task.status === "accepted" ||
    task.status === "revision_requested";
  const startHref = (agent: CreatorAgent) =>
    `/playground/${encodeURIComponent(agent.slug)}?prefill=${encodeURIComponent(task.query)}&autorun=1&task_id=${encodeURIComponent(task.id)}`;

  const claimAndStart = async (agent: CreatorAgent) => {
    setClaimingAgentID(agent.id);
    setError("");
    setErrorStatus(null);
    try {
      await apiFetch(`/api/v1/tasks/${encodeURIComponent(task.id)}/claim`, {
        method: "POST",
        body: { agent_id: agent.id },
      });
      router.push(startHref(agent));
    } catch (err) {
      setErrorStatus(err instanceof ApiError ? err.status : null);
      setError(
        err instanceof ApiError
          ? err.message || copy.claimFailed
          : copy.claimRetry,
      );
      setClaimingAgentID(null);
    }
  };

  return (
    <div className="grid gap-2 sm:justify-items-end">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        disabled={taskLocked}
        className="inline-flex h-9 items-center rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {taskLocked
          ? task.status === "completed" || task.status === "accepted"
            ? task.status === "accepted"
              ? copy.accepted
              : copy.completed
            : copy.locked
          : expanded
            ? copy.select
            : copy.canDo}
      </button>

      {expanded ? (
        <div className="w-full min-w-[260px] max-w-[520px] rounded-[14px] border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-3 text-left sm:w-[360px]">
          {!isAuthenticated ? (
            <div>
              <p className="text-[12.5px] font-bold leading-5 text-[color:var(--ol-muted)]">
                {copy.loginBody}
              </p>
              <Link
                href="/login?callbackUrl=/tasks"
                className="mt-3 inline-flex h-9 items-center rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12px] font-black text-white"
              >
                {copy.login}
              </Link>
            </div>
          ) : loading ? (
            <p className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
              {copy.loading}
            </p>
          ) : error ? (
            <div>
              <p className="text-[12.5px] font-bold leading-5 text-[color:var(--ol-muted)]">
                {errorStatus === 401
                  ? copy.expired
                  : copy.noAgentPrefix(error)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {errorStatus === 401 ? (
                  <Link href="/login?callbackUrl=/tasks" className="ol-mini-btn">
                    {copy.relogin}
                  </Link>
                ) : (
                  <>
                    <Link href="/hub" className="ol-mini-btn">
                      {copy.hub}
                    </Link>
                    <Link href="/publish" className="ol-mini-btn">
                      {copy.publish}
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : activeAgents.length === 0 ? (
            <div>
              <p className="text-[12.5px] font-bold leading-5 text-[color:var(--ol-muted)]">
                {copy.noAgents}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/publish" className="ol-mini-btn">
                  {copy.newAgent}
                </Link>
                <Link href="/hub" className="ol-mini-btn">
                  {copy.myAgents}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-[12px] font-black text-[color:var(--ol-ink)]">
                {copy.chooseBody}
              </p>
              {activeAgents.slice(0, 4).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => void claimAndStart(agent)}
                  disabled={claimingAgentID !== null}
                  className="rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-left hover:border-[color:var(--ol-primary)]/40 disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="block truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
                    {claimingAgentID === agent.id ? copy.claiming : agent.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-[color:var(--ol-muted)]">
                    {agent.slug}
                  </span>
                </button>
              ))}
              {activeAgents.length > 4 ? (
                <Link
                  href="/hub"
                  className="text-[12px] font-black text-[color:var(--ol-primary-dark)]"
                >
                  {copy.more}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[color:var(--ol-line)] bg-white px-6 py-12 text-center text-sm text-[color:var(--ol-muted)]">
      {text}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[color:var(--ol-soft)] p-3">
      <span className="block text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </span>
      <strong className="mt-1 block text-[20px] text-[color:var(--ol-ink)]">
        {value}
      </strong>
    </div>
  );
}

function countByFilter(tasks: TaskBoardItem[], filter: string) {
  if (filter === FILTER_ALL) return tasks.length;
  return tasks.filter((task) =>
    (task.parsed_skill_refs ?? []).some((skill) => skill.category === filter),
  ).length;
}

function categoryLabel(category: string, allLabel: string) {
  if (category === FILTER_ALL) return allLabel;
  return CATEGORY_LABEL[category] ?? category;
}

function statusLabel(task: TaskBoardItem, locale: Locale) {
  return STATUS_LABEL[locale][task.status] ?? STATUS_LABEL[locale].open;
}

function statusHeadline(task: TaskBoardItem, locale: Locale) {
  if (locale === "en") {
    if (task.status === "accepted") return "Accepted";
    if (task.status === "revision_requested") return "Needs revision";
    if (task.status === "completed") return "Completed";
    if (task.status === "in_progress") return "In progress";
    if (task.status === "matched") return "Selected";
    return "Open";
  }
  if (task.status === "accepted") return "已验收";
  if (task.status === "revision_requested") return "待修订";
  if (task.status === "completed") return "已完成";
  if (task.status === "in_progress") return "进行中";
  if (task.status === "matched") return "已选择";
  return "待接入";
}

function formatDate(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}
