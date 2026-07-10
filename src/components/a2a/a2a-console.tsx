"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { A2AContextRef, A2ASkillRef, ParentRunSummary } from "@/components/a2a/parent-run-directory";
import { Icon } from "@/components/ui/icon";
import { a2aSessionLabel } from "@/lib/a2a-session.mjs";
import type { Locale } from "@/lib/i18n";
import { runStatusLabel } from "@/lib/i18n-labels";

type ChildRun = {
  child_run_id: string;
  parent_run_id: string;
  caller_agent_id: string;
  caller_agent_slug?: string;
  caller_agent_name?: string;
  caller_agent_tags?: string[];
  caller_skills?: A2ASkillRef[];
  target_agent_id: string;
  target_agent_slug: string;
  target_agent_name: string;
  target_agent_tags?: string[];
  target_skills?: A2ASkillRef[];
  reason: string;
  status: string;
  cost_cents: number;
  duration_ms?: number;
  started_at: string;
  finished_at?: string;
  source: string;
  billing_mode: string;
  a2a_context?: A2AContextRef;
  children?: ChildRun[];
};

export type ChildrenPayload = {
  parent_run_id: string;
  items?: ChildRun[];
};

type GraphPosition = {
  x: number;
  y: number;
};

type GraphNode = {
  id: string;
  runId?: string;
  label: string;
  subtitle: string;
  status: string;
  kind: "root" | "child";
  defaultPosition: GraphPosition;
};

type GraphEdge = {
  from: string;
  to: string;
};

type ChildRunEntry = {
  child: ChildRun;
  depth: number;
  path: string;
};

export function A2AConsole({
  locale,
  initialRunId = "",
  initialData = null,
  initialError = "",
  activeParent,
}: {
  locale: Locale;
  initialRunId?: string;
  initialData?: ChildrenPayload | null;
  initialError?: string;
  activeParent?: ParentRunSummary;
}) {
  const copy =
    locale === "zh"
      ? {
          title: "Agent 协作详情",
          parentDetail: "最初运行详情",
          selectedParent: "已选协作会话",
          source: "入口",
          boundTokens: "绑定凭证",
          parentNoSkills: "发起协作的 Agent 尚未声明 Skill",
          parentExplainer: "这里从最初运行开始，展示同一次任务中的并行、连续和多层 Agent 调用。",
          selectParent: "从上方选择一条协作会话，查看 Agent 之间的调用关系。",
          placeholderSlug: "选择一条协作会话",
          childCalls: "总调用",
          successRunning: "成功 / 运行中",
          costField: "外部费用记录",
          freeNow: "未记录外部费用",
          noDelegations: "这条会话还没有子运行。Agent 调用另一个 Agent 后，记录会显示在这里。",
          missingReason: "未提供调用原因",
          callMethod: "调用方式",
          context: "协议上下文",
          targetNoSkills: "目标 Agent 尚未声明 Skill",
          freeDelegation: "未记录外部费用",
          viewChildRun: "查看运行",
          relationships: "运行关系",
          entryAgent: "入口 Agent",
          call: "调用",
          root: "根运行",
          chooseFirst: "先从协作会话目录选择一条记录。",
          related: "关联页面",
          creatorHub: ["Agent 管理", "查看自注册 Agent、能力声明和调用记录。"],
          skills: ["Skill 目录", "查看能力标签、声明 Skill 和匹配依据。"],
          connect: ["开发者中心", "查看 API/MCP、鉴权边界和外部工具调用说明。"],
        }
      : {
          title: "Agent collaboration details",
          parentDetail: "Initial run details",
          selectedParent: "selected session",
          source: "Source",
          boundTokens: "Bound credentials",
          parentNoSkills: "The starting Agent has not declared Skills",
          parentExplainer: "Starting from the first run, this view shows every parallel, sequential, and nested Agent call in the same task.",
          selectParent: "Select a collaboration session above to inspect how the Agents called one another.",
          placeholderSlug: "Select a collaboration session",
          childCalls: "Total calls",
          successRunning: "Success / Running",
          costField: "External cost record",
          freeNow: "No external cost recorded",
          noDelegations: "This session has no child runs yet. Records will appear when one Agent invokes another.",
          missingReason: "No reason provided",
          callMethod: "Invocation method",
          context: "Protocol context",
          targetNoSkills: "Target Agent has not declared Skills",
          freeDelegation: "No external cost recorded",
          viewChildRun: "View run",
          relationships: "Run relationships",
          entryAgent: "Entry Agent",
          call: "call",
          root: "Root",
          chooseFirst: "Select a session from the collaboration directory first.",
          related: "Related pages",
          creatorHub: ["Agent Console", "View self-registered Agents, Skill claims, and run history."],
          skills: ["Skill Registry", "Review capability tags, Skill claims, and matching signals."],
          connect: ["Developer Center", "Read API/MCP, auth boundaries, and external tool guidance."],
        };
  const selectedRunId = initialData?.parent_run_id ?? initialRunId;
  const children = initialData?.items ?? [];
  const childEntries = flattenChildRuns(children);
  const allChildren = childEntries.map((entry) => entry.child);
  const successfulCount = allChildren.filter((item) => item.status === "success").length;
  const runningCount = allChildren.filter((item) => item.status === "running").length;
  const totalCost = allChildren.reduce((sum, item) => sum + item.cost_cents, 0);
  const firstChild = children[0];
  const callerName =
    activeParent?.caller_agent_name ?? firstChild?.caller_agent_name ?? copy.entryAgent;
  const callerSlug = activeParent?.caller_agent_slug ?? firstChild?.caller_agent_slug ?? "";
  const callerSkills = activeParent?.caller_skills ?? firstChild?.caller_skills ?? [];
  const callerTags = activeParent?.caller_agent_tags ?? firstChild?.caller_agent_tags ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.title}</strong>
          {selectedRunId ? (
            <Link href={`/run/${selectedRunId}`} className="ol-mini-btn">
              {copy.parentDetail}
            </Link>
          ) : null}
        </div>

        {selectedRunId ? (
          <div className="border-b border-[color:var(--ol-line)] bg-white/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.05em] text-[color:var(--ol-subtle)]">
                  {copy.selectedParent}
                </p>
                <h2 className="mt-1 truncate text-[18px] font-black text-[color:var(--ol-ink)]">
                  {callerName}
                </h2>
                {callerSlug ? (
                  <p className="mt-1 truncate font-mono text-[12px] text-[color:var(--ol-muted)]">
                    {callerSlug}
                  </p>
                ) : null}
                <code className="mt-3 block max-w-full truncate rounded-[7px] bg-[color:var(--ol-soft)] px-2 py-1.5 text-[11px] text-[color:var(--ol-muted)]">
                  {selectedRunId}
                </code>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeParent?.source ? (
                  <span className="ol-chip ol-chip-blue">{copy.source} {sourceLabel(activeParent.source)}</span>
                ) : null}
                {typeof activeParent?.active_agent_token_count === "number" ? (
                  <span className="ol-chip ol-chip-mint">
                    {copy.boundTokens} {activeParent.active_agent_token_count}
                  </span>
                ) : null}
              </div>
            </div>
            <CapabilityChips skills={callerSkills} tags={callerTags} empty={copy.parentNoSkills} />
            <p className="mt-4 text-[13px] leading-6 text-[color:var(--ol-muted)]">
              {copy.parentExplainer}
            </p>
          </div>
        ) : (
          <div className="border-b border-[color:var(--ol-line)] p-5">
            <Empty title={copy.selectParent} />
          </div>
        )}

        {selectedRunId && !initialError ? (
          <A2ACallGraph
            selectedRunId={selectedRunId}
            callerName={callerName}
            callerSlug={callerSlug}
            rootStatus={activeParent?.status ?? "parent"}
            childRuns={children}
            locale={locale}
          />
        ) : null}
        {!selectedRunId && !initialError ? (
          <A2ACallGraph
            callerName={copy.entryAgent}
            callerSlug={copy.placeholderSlug}
            rootStatus="waiting"
            childRuns={[]}
            locale={locale}
            placeholder
          />
        ) : null}

        {selectedRunId && !initialError ? (
          <div className="grid gap-3 border-b border-[color:var(--ol-line)] bg-white/70 p-5 sm:grid-cols-3">
            <Metric label={copy.childCalls} value={`${allChildren.length}`} />
            <Metric label={copy.successRunning} value={`${successfulCount} / ${runningCount}`} />
            <Metric label={copy.costField} value={totalCost === 0 ? copy.freeNow : `$${(totalCost / 100).toFixed(2)}`} />
          </div>
        ) : null}

        <div className="p-5">
          {initialError ? (
            <div className="rounded-[8px] border border-[#e9c5c5] bg-[#fff5f5] p-4 text-[13px] font-semibold text-[#8f3030]">
              {initialError}
            </div>
          ) : null}
          {!initialError && selectedRunId && children.length === 0 ? (
            <Empty title={copy.noDelegations} />
          ) : null}
          {!initialError && children.length > 0 ? (
            <div className="grid gap-3">
              {childEntries.map(({ child, depth, path }) => {
                const chip = statusChip(child.status, locale);
                return (
                  <article
                    key={child.child_run_id}
                    className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-4"
                    style={{ marginLeft: depth > 1 ? Math.min((depth - 1) * 18, 54) : 0 }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--ol-soft)] text-[color:var(--ol-primary-dark)]">
                          <Icon name="bot" size="md" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                            {copy.call} {path}
                          </p>
                          <h2 className="truncate text-[14px] font-black text-[color:var(--ol-ink)]">
                            {child.target_agent_name}
                          </h2>
                          <p className="truncate font-mono text-[11.5px] text-[color:var(--ol-muted)]">
                            {child.target_agent_slug}
                          </p>
                        </div>
                      </div>
                      <span className={chip.tone}>{chip.label}</span>
                    </div>
                    <p className="mt-3 min-h-5 text-[13px] leading-5 text-[color:var(--ol-muted)]">
                      {child.reason || copy.missingReason}
                    </p>
                    <div className="mt-3 rounded-[8px] bg-[color:var(--ol-soft)] p-3">
                      <p className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                        {copy.callMethod}
                      </p>
                      <p className="mt-1 text-[12.5px] font-bold leading-5 text-[color:var(--ol-muted)]">
                        {locale === "zh" ? (
                          <>
                            发起协作的 Agent 使用自己的 Agent 令牌请求调用另一个 Agent，
                            OpenLinker 随后创建关联的子运行。
                          </>
                        ) : (
                          <>
                            The starting Agent uses its own Agent Token to request another Agent.
                            OpenLinker then creates the linked child run.
                          </>
                        )}
                      </p>
                    </div>
                    {a2aSessionLabel(child.a2a_context) ? (
                      <div className="mt-3 rounded-[8px] border border-[color:var(--ol-line)] bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                          {copy.context}
                        </p>
                        <p className="mt-1 truncate font-mono text-[11.5px] text-[color:var(--ol-primary-dark)]">
                          {a2aSessionLabel(child.a2a_context)}
                        </p>
                      </div>
                    ) : null}
                    <CapabilityChips
                      skills={child.target_skills ?? []}
                      tags={child.target_agent_tags ?? []}
                      empty={copy.targetNoSkills}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ol-line)] pt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">
                      <span>
                        {formatDate(child.started_at, locale)} · {fmtMs(child.duration_ms, locale)} ·{" "}
                        {child.billing_mode === "free_delegation" || child.cost_cents === 0 ? copy.freeDelegation : `$${(child.cost_cents / 100).toFixed(2)}`}
                        {" · "}
                        {sourceLabel(child.source)}
                      </span>
                      <Link
                        href={`/run/${child.child_run_id}`}
                        className="inline-flex items-center gap-1 font-black text-[color:var(--ol-primary-dark)]"
                      >
                        {copy.viewChildRun} <Icon name="arrow-up-right" size="sm" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        <A2AFlowCard locale={locale} />
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.relationships}</h2>
          <div className="mt-4 grid gap-2">
            {selectedRunId ? (
              <>
                <RunLink label={`${copy.root} · ${callerName}`} id={selectedRunId} />
                {childEntries.map(({ child, path }) => (
                  <RunLink key={child.child_run_id} label={`${path} · ${child.target_agent_name}`} id={child.child_run_id} />
                ))}
              </>
            ) : (
              <p className="text-[13px] font-semibold leading-6 text-[color:var(--ol-muted)]">
                {copy.chooseFirst}
              </p>
            )}
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.related}</h2>
          <div className="mt-4 grid gap-2">
            <GuideLink href="/hub" title={copy.creatorHub[0]} desc={copy.creatorHub[1]} />
            <GuideLink href="/skills" title={copy.skills[0]} desc={copy.skills[1]} />
            <GuideLink href="/connect" title={copy.connect[0]} desc={copy.connect[1]} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function flattenChildRuns(items: ChildRun[], depth = 1, prefix = ""): ChildRunEntry[] {
  const entries: ChildRunEntry[] = [];
  items.forEach((child, index) => {
    const path = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    entries.push({ child, depth, path });
    entries.push(...flattenChildRuns(child.children ?? [], depth + 1, path));
  });
  return entries;
}

function A2ACallGraph({
  locale,
  selectedRunId,
  callerName,
  callerSlug,
  rootStatus,
  childRuns,
  placeholder = false,
}: {
  locale: Locale;
  selectedRunId?: string;
  callerName: string;
  callerSlug: string;
  rootStatus: string;
  childRuns: ChildRun[];
  placeholder?: boolean;
}) {
  const copy =
    locale === "zh"
      ? {
          childAgent: "子 Agent",
          autoChild: "Agent 发起协作后生成子运行",
          title: "可拖拽调用树",
          body: "关系图展示并行、连续和多层 Agent 调用。拖动节点只会调整当前页面的排布。",
          dragHint: "拖动节点整理视图",
          emptyNode: "子 Agent 调用发生后会自动出现节点。",
          rootRun: "根运行",
        }
      : {
          childAgent: "Child Agent",
          autoChild: "A child run appears after an Agent requests help",
          title: "Draggable call tree",
          body: "The graph shows parallel, sequential, and nested Agent calls. Dragging a node only changes this page layout.",
          dragHint: "Drag nodes to organize the view",
          emptyNode: "Child Agent nodes appear after delegation.",
          rootRun: "Root run",
        };
  const graph = useMemo<{ nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number }>(() => {
    const parentID = selectedRunId ?? "placeholder-parent";
    const parent: GraphNode = {
      id: `parent-${parentID}`,
      runId: selectedRunId,
      label: callerName,
      subtitle: callerSlug || copy.rootRun,
      status: rootStatus,
      kind: "root",
      defaultPosition: { x: 32, y: 112 },
    };
    const nodes: GraphNode[] = [parent];
    const edges: GraphEdge[] = [];
    let row = 0;
    let maxDepth = 0;

    const addChildNodes = (items: ChildRun[], parentNodeId: string, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of items) {
        const node: GraphNode = {
          id: `child-${child.child_run_id}`,
          runId: child.child_run_id,
          label: child.target_agent_name,
          subtitle: child.target_agent_slug,
          status: child.status,
          kind: "child" as const,
          defaultPosition: {
            x: 320 + (depth - 1) * 260,
            y: 42 + row * 118,
          },
        };
        row += 1;
        nodes.push(node);
        edges.push({ from: parentNodeId, to: node.id });
        addChildNodes(child.children ?? [], node.id, depth + 1);
      }
    };

    if (placeholder && childRuns.length === 0) {
      nodes.push({
        id: "placeholder-child",
        label: copy.childAgent,
        subtitle: copy.autoChild,
        status: "waiting",
        kind: "child" as const,
        defaultPosition: { x: 320, y: 96 },
      });
      edges.push({ from: parent.id, to: "placeholder-child" });
      row = 1;
      maxDepth = 1;
    } else {
      addChildNodes(childRuns, parent.id, 1);
    }

    return {
      nodes,
      edges,
      width: Math.max(680, 320 + Math.max(1, maxDepth) * 260),
      height: Math.max(300, 120 + Math.max(1, row) * 118),
    };
  }, [callerName, callerSlug, childRuns, copy.autoChild, copy.childAgent, copy.rootRun, placeholder, rootStatus, selectedRunId]);
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const [positions, setPositions] = useState<Record<string, GraphPosition>>({});
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const parentNode = graph.nodes[0];
  const parentPosition =
    positions[parentNode.id] ?? parentNode.defaultPosition;

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: PointerEvent) => {
      setPositions((state) => ({
        ...state,
        [dragging.id]: {
          x: Math.max(16, Math.min(graph.width - 236, event.clientX - dragging.offsetX)),
          y: Math.max(16, Math.min(graph.height - 92, event.clientY - dragging.offsetY)),
        },
      }));
    };
    const handleUp = () => setDragging(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, graph.height, graph.width]);

  return (
    <div className="border-b border-[color:var(--ol-line)] bg-[color:var(--ol-soft)]/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">
            {copy.title}
          </h2>
          <p className="mt-1 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
            {copy.body}
          </p>
        </div>
        <span className="ol-chip ol-chip-blue">{copy.dragHint}</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="relative min-w-[680px] overflow-hidden rounded-[18px] border border-dashed border-[color:var(--ol-line)] bg-white"
          style={{ height: graph.height, width: graph.width }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker
                id="a2a-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(15,145,135,0.55)" />
              </marker>
            </defs>
            {childRuns.length === 0 && !placeholder ? (
              <line
                x1={parentPosition.x + 220}
                y1={parentPosition.y + 42}
                x2={520}
                y2={parentPosition.y + 42}
                stroke="rgba(15,145,135,0.25)"
                strokeDasharray="6 6"
                strokeWidth="2"
                markerEnd="url(#a2a-arrow)"
              />
            ) : (
              graph.edges.map((edge) => {
                const fromNode = nodeById.get(edge.from);
                const toNode = nodeById.get(edge.to);
                if (!fromNode || !toNode) return null;
                const fromPos = positions[fromNode.id] ?? fromNode.defaultPosition;
                const toPos = positions[toNode.id] ?? toNode.defaultPosition;
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={fromPos.x + 220}
                    y1={fromPos.y + 42}
                    x2={toPos.x}
                    y2={toPos.y + 42}
                    stroke="rgba(15,145,135,0.45)"
                    strokeWidth="2"
                    markerEnd="url(#a2a-arrow)"
                  />
                );
              })
            )}
          </svg>

          {graph.nodes.map((node) => {
            const pos = positions[node.id] ?? node.defaultPosition;
            return (
              <GraphNodeCard
                key={node.id}
                node={node}
                locale={locale}
                position={pos}
                onPointerDown={(event) => {
                  event.preventDefault();
                  setDragging({
                    id: node.id,
                    offsetX: event.clientX - pos.x,
                    offsetY: event.clientY - pos.y,
                  });
                }}
              />
            );
          })}

          {childRuns.length === 0 && !placeholder ? (
            <div className="absolute left-[520px] top-[122px] w-[130px] rounded-[12px] border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-3 py-2 text-[12px] font-bold leading-5 text-[color:var(--ol-muted)]">
              {copy.emptyNode}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GraphNodeCard({
  node,
  locale,
  position,
  onPointerDown,
}: {
  node: GraphNode;
  locale: Locale;
  position: GraphPosition;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const copy =
    locale === "zh"
      ? { title: "拖动节点整理调用树", viewRun: "查看运行", waiting: "等待运行", root: "根", entry: "入口", target: "目标" }
      : { title: "Drag node to organize the call tree", viewRun: "View run", waiting: "Waiting for run", root: "Root", entry: "entry", target: "target" };
  const chip = node.kind === "root" ? { tone: "ol-chip ol-chip-mint", label: copy.root } : statusChip(node.status, locale);

  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute w-[220px] cursor-grab rounded-[16px] border border-[color:var(--ol-line)] bg-white p-3 shadow-[0_16px_36px_rgba(25,66,84,0.10)] active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      title={copy.title}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-black uppercase tracking-[0.05em] text-[color:var(--ol-subtle)]">
            {node.kind === "root" ? copy.entry : copy.target}
          </p>
          <h3 className="mt-1 truncate text-[13.5px] font-black text-[color:var(--ol-ink)]">
            {node.label}
          </h3>
        </div>
        <span className={chip.tone}>{chip.label}</span>
      </div>
      <p className="mt-2 truncate font-mono text-[11px] text-[color:var(--ol-muted)]">
        {node.subtitle}
      </p>
      {node.runId ? (
        <Link
          href={`/run/${node.runId}`}
          onPointerDown={(event) => event.stopPropagation()}
          className="mt-2 inline-flex text-[11.5px] font-black text-[color:var(--ol-primary-dark)]"
        >
          {copy.viewRun}
        </Link>
      ) : (
        <span className="mt-2 inline-flex text-[11.5px] font-black text-[color:var(--ol-muted)]">
          {copy.waiting}
        </span>
      )}
    </div>
  );
}

function A2AFlowCard({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "A2A 如何工作",
          steps: [
            {
              title: "接入 Agent",
              desc: "Agent 提供方先把 Agent 接入 OpenLinker，并为它签发独立的 Agent 令牌。",
            },
            {
              title: "说明能力与入口",
              desc: "Skill 用于描述 Agent 能力；MCP 为外部客户端提供调用入口。",
            },
            {
              title: "A2A 调用",
              desc: "Agent 在运行中请求另一个 Agent 后，OpenLinker 创建子运行，并把两次运行关联起来。",
            },
          ],
        }
      : {
          title: "How A2A works",
          steps: [
            {
              title: "Connect the Agent",
              desc: "The Agent provider connects the Agent to OpenLinker and gives it a dedicated Agent Token.",
            },
            {
              title: "Describe capabilities and access",
              desc: "Skills describe what the Agent can do, while MCP gives external clients a way to invoke it.",
            },
            {
              title: "A2A invocation",
              desc: "When an Agent requests another Agent during a run, OpenLinker creates a child run and links the two records.",
            },
          ],
        };
  return (
    <div className="ol-panel ol-panel-pad">
      <h2 className="text-[15px] font-black text-[color:var(--ol-ink)]">{copy.title}</h2>
      <div className="mt-4 space-y-3">
        {copy.steps.map((step, index) => (
          <FlowStep key={step.title} step={`${index + 1}`} title={step.title} desc={step.desc} />
        ))}
      </div>
    </div>
  );
}

function FlowStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ol-primary)] text-[11px] font-black text-white">
          {step}
        </span>
        <strong className="text-[13px] text-[color:var(--ol-ink)]">{title}</strong>
      </div>
      <p className="mt-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">{desc}</p>
    </div>
  );
}

function GuideLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3 hover:border-[color:var(--ol-primary)]/40"
    >
      <span className="block text-[12.5px] font-black text-[color:var(--ol-ink)]">{title}</span>
      <span className="mt-1 block text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
        {desc}
      </span>
    </Link>
  );
}

function RunLink({ label, id }: { label: string; id: string }) {
  return (
    <Link
      href={`/run/${id}`}
      className="rounded-[8px] border border-[color:var(--ol-line)] bg-white p-3 hover:border-[color:var(--ol-primary)]/40"
    >
      <span className="block truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">{label}</span>
      <code className="mt-1 block truncate text-[11px] text-[color:var(--ol-muted)]">{id}</code>
    </Link>
  );
}

function CapabilityChips({
  skills,
  tags,
  empty,
}: {
  skills: A2ASkillRef[];
  tags: string[];
  empty: string;
}) {
  const cleanTags = tags.filter(Boolean);
  if (skills.length === 0 && cleanTags.length === 0) {
    return <p className="mt-3 text-[12px] font-bold text-[color:var(--ol-muted)]">{empty}</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <span key={skill.id} className="ol-chip ol-chip-blue" title={skill.id}>
          {skill.name}
        </span>
      ))}
      {cleanTags.map((tag) => (
        <span key={tag} className="ol-chip ol-chip-mint">
          {tag}
        </span>
      ))}
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[8px] border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-4 text-center text-[13px] font-bold text-[color:var(--ol-muted)]">
      {title}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-white px-4 py-3">
      <div className="text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">{label}</div>
      <div className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">{value}</div>
    </div>
  );
}

function statusChip(status: string, locale: Locale): { tone: string; label: string } {
  if (status === "success") return { tone: "ol-chip ol-chip-green", label: runStatusLabel(status, locale) };
  if (status === "running") return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
  if (status === "failed" || status === "timeout") return { tone: "ol-chip ol-chip-amber", label: runStatusLabel(status, locale) };
  if (status === "canceled" || status === "waiting") return { tone: "ol-chip", label: runStatusLabel(status, locale) };
  return { tone: "ol-chip ol-chip-mint", label: runStatusLabel(status, locale) };
}

function sourceLabel(source?: string): string {
  if (source === "mcp") return "MCP";
  if (source === "api") return "A2A API";
  return "Web";
}

function fmtMs(ms: number | undefined, locale: Locale): string {
  if (ms == null) return locale === "zh" ? "进行中" : "Running";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
