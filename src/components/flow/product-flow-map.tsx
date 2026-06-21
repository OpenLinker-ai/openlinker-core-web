import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type FlowStep = {
  id: string;
  label: string;
  desc: string;
  href: string;
};

type FlowGroup = {
  title: string;
  desc: string;
  steps: FlowStep[];
};

const FLOW_GROUPS: Record<Locale, FlowGroup[]> = {
  zh: [
    {
      title: "用户完成任务",
      desc: "从一句需求开始，进入推荐、运行、交付和复盘。",
      steps: [
      {
        id: "task-post",
        label: "发布任务",
        desc: "描述目标，可显式关联 Skill / MCP。",
        href: "/task",
      },
      {
        id: "task-board",
        label: "任务 / 推荐",
        desc: "任务广场接活，或在推荐结果里选 Agent。",
        href: "/tasks",
      },
      {
        id: "market",
        label: "市场试用",
        desc: "从 Agent 详情进入 Playground 运行。",
        href: "/market",
      },
      {
        id: "runs",
        label: "记录验收",
        desc: "回看 Run Trace、任务结果和交付状态。",
        href: "/runs",
      },
      ],
    },
    {
      title: "创作者接入 Agent",
      desc: "把自己的 Agent 变成可发现、可调用、可追踪的供给。",
      steps: [
      {
        id: "publish",
        label: "接入 Agent",
        desc: "选择 HTTP / MCP Server / Runtime Pull。",
        href: "/publish",
      },
      {
        id: "creator-hub",
        label: "完善能力",
        desc: "声明 Skill、示例、Dry-run 和自注册指引。",
        href: "/hub",
      },
      {
        id: "market-listing",
        label: "进入市场",
        desc: "公开 Agent 被任务推荐和用户搜索发现。",
        href: "/market",
      },
      {
        id: "agent-runs",
        label: "调用历史",
        desc: "按 Agent 查看 Web / MCP / 外部工具触发记录。",
        href: "/hub",
      },
      ],
    },
    {
      title: "开发者与多 Agent",
      desc: "MCP、A2A 与 Workflow 共用同一套 runs 记录。",
      steps: [
      {
        id: "mcp",
        label: "接入中心",
        desc: "MCP/API 说明、Auth 边界和 SDK 示例。",
        href: "/connect",
      },
      {
        id: "a2a",
        label: "A2A 链路",
        desc: "Parent Agent 用绑定自身的运行凭证委派 Child Agent。",
        href: "/a2a",
      },
      {
        id: "workflow",
        label: "Workflow",
        desc: "把多个 Agent 组合成可复用流程。",
        href: "/workflow",
      },
      ],
    },
  ],
  en: [
    {
      title: "Get work done",
      desc: "Start with a request, then move through matching, running, delivery, and review.",
      steps: [
        {
          id: "task-post",
          label: "Post task",
          desc: "Describe the goal and optionally attach Skill / MCP context.",
          href: "/task",
        },
        {
          id: "task-board",
          label: "Tasks / matching",
          desc: "Pick from recommendations or claim public tasks.",
          href: "/tasks",
        },
        {
          id: "market",
          label: "Try from market",
          desc: "Open Playground from an Agent detail page.",
          href: "/market",
        },
        {
          id: "runs",
          label: "Review records",
          desc: "Inspect Run Trace, task results, and delivery status.",
          href: "/runs",
        },
      ],
    },
    {
      title: "Publish an Agent",
      desc: "Turn your Agent into a discoverable, callable, traceable supply source.",
      steps: [
        {
          id: "publish",
          label: "Connect Agent",
          desc: "Choose HTTP / MCP Server / Runtime Pull.",
          href: "/publish",
        },
        {
          id: "creator-hub",
          label: "Complete capabilities",
          desc: "Declare Skills, examples, dry-runs, and self-registration guides.",
          href: "/hub",
        },
        {
          id: "market-listing",
          label: "Enter market",
          desc: "Public Agents can be discovered by tasks and users.",
          href: "/market",
        },
        {
          id: "agent-runs",
          label: "Run history",
          desc: "Review Web / MCP / external-tool calls by Agent.",
          href: "/hub",
        },
      ],
    },
    {
      title: "Developers and multi-Agent",
      desc: "MCP, A2A, and Workflow share the same run record model.",
      steps: [
        {
          id: "mcp",
          label: "Connect center",
          desc: "MCP/API docs, auth boundaries, and SDK examples.",
          href: "/connect",
        },
        {
          id: "a2a",
          label: "A2A chain",
          desc: "Parent Agents delegate to Child Agents with runtime credentials.",
          href: "/a2a",
        },
        {
          id: "workflow",
          label: "Workflow",
          desc: "Combine Agents into reusable flows.",
          href: "/workflow",
        },
      ],
    },
  ],
};

export function ProductFlowMap({
  activeStep,
  compact = false,
  className,
  locale = "zh",
}: {
  activeStep?: string;
  compact?: boolean;
  className?: string;
  locale?: Locale;
}) {
  return (
    <section
      className={cn(
        "ol-panel overflow-hidden border-[color:var(--ol-line)]/80 bg-white/90",
        className,
      )}
      aria-label={locale === "zh" ? "OpenLinker 产品动线地图" : "OpenLinker product flow map"}
    >
      <div className="ol-panel-head">
        <strong>{locale === "zh" ? "产品动线地图" : "Product flow map"}</strong>
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {locale === "zh"
            ? "任务、Agent、MCP、A2A 共用同一条运行记录"
            : "Tasks, Agents, MCP, and A2A share one run record"}
        </span>
      </div>
      <div className={cn("grid gap-4 p-5", compact ? "lg:grid-cols-3" : "xl:grid-cols-3")}>
        {FLOW_GROUPS[locale].map((group) => (
          <article key={group.title} className="rounded-[18px] border border-[color:var(--ol-line)] bg-white p-4">
            <div>
              <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
                {group.title}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                {group.desc}
              </p>
            </div>
            <div className="mt-4 grid gap-2">
              {group.steps.map((step, index) => {
                const active = step.id === activeStep;
                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-[14px] border px-3 py-2.5 transition",
                      active
                        ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)]"
                        : "border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/35 hover:border-[color:var(--ol-primary)]/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[12px] font-black",
                        active
                          ? "bg-[color:var(--ol-primary)] text-white"
                          : "bg-white text-[color:var(--ol-primary-dark)]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black text-[color:var(--ol-ink)]">
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-semibold leading-relaxed text-[color:var(--ol-muted)]">
                        {step.desc}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
