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
          title: "Agent 调用树详情",
          parentDetail: "根运行详情",
          selectedParent: "已选协作会话",
          source: "入口",
          boundTokens: "绑定凭证",
          parentNoSkills: "入口 Agent 尚未声明 Skill",
          parentExplainer: "该视图按 root_context_id / 根运行聚合。同一次任务里的 fan-out、串行委派和中间 Agent 再委派都会收在这棵调用树下。",
          selectParent: "从上方协作会话选择一条记录，查看真实 Agent-to-Agent 调用树。",
          placeholderSlug: "选择协作会话后绑定真实 run_id",
          childCalls: "总调用",
          successRunning: "成功 / 运行中",
          costField: "委派费用",
          freeNow: "当前免费",
          noDelegations: "该会话还没有 Agent 委派记录；当入口 Agent 调用子 Agent 后会自动出现。",
          missingReason: "未提供调用原因",
          callMethod: "调用方式",
          context: "协议上下文",
          targetNoSkills: "目标 Agent 尚未声明 Skill",
          freeDelegation: "免费委派",
          viewChildRun: "查看运行",
          relationships: "运行关系",
          chooseFirst: "先从协作会话目录选择一条记录。",
          related: "关联页面",
          creatorHub: ["Agent 管理", "查看自注册 Agent、能力声明和调用记录。"],
          skills: ["Skill 注册表", "查看能力标签、声明 Skill 和推荐依据。"],
          connect: ["开发者中心", "查看 API/MCP、鉴权边界和外部工具调用说明。"],
        }
      : {
          title: "Agent Call Tree Details",
          parentDetail: "Root run detail",
          selectedParent: "selected session",
          source: "Source",
          boundTokens: "Bound credentials",
          parentNoSkills: "Entry Agent has not declared Skills",
          parentExplainer: "This view is grouped by root_context_id / root run. Fan-out, serial delegation, and downstream delegation stay inside one call tree.",
          selectParent: "Select a collaboration session above to inspect a real Agent-to-Agent call tree.",
          placeholderSlug: "Select a session to bind a real run_id",
          childCalls: "Total calls",
          successRunning: "Success / Running",
          costField: "Delegation cost",
          freeNow: "Free now",
          noDelegations: "This session has no Agent delegation records yet. They will appear after the Entry Agent invokes a Child Agent.",
          missingReason: "No reason provided",
          callMethod: "Invocation method",
          context: "Protocol context",
          targetNoSkills: "Target Agent has not declared Skills",
          freeDelegation: "Free delegation",
          viewChildRun: "View run",
          relationships: "Run relationships",
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
    activeParent?.caller_agent_name ?? firstChild?.caller_agent_name ?? "Entry Agent";
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
            callerName="Entry Agent"
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
                            call {path}
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
                            入口 Agent 使用自己的 Agent 接入凭证（<code>ol_agent_*</code>）调用{" "}
                            <code>/api/v1/agent-runtime/call-agent</code>，平台创建子运行并写入
                            <code> run_delegations</code> 和 <code>run_events</code>。
                          </>
                        ) : (
                          <>
                            The Entry Agent calls <code>/api/v1/agent-runtime/call-agent</code> with
                            its own Agent access credential (<code>ol_agent_*</code>); OpenLinker creates the child
                            run and writes <code> run_delegations</code> plus <code>run_events</code>.
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
                <RunLink label={`Root · ${callerName}`} id={selectedRunId} />
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
          autoChild: "真实委派后自动生成子运行",
          title: "可拖拽调用树",
          body: "关系图按真实委派层级展示 fan-out 与串行调用；拖拽只改变本页排布，不影响后端调用。",
          dragHint: "拖动节点整理视图",
          emptyNode: "子 Agent 调用发生后会自动出现节点。",
        }
      : {
          childAgent: "Child Agent",
          autoChild: "A child run is created after real delegation",
          title: "Draggable call tree",
          body: "The graph follows real delegation depth, showing fan-out and serial calls in one tree. Dragging only changes this view and does not affect backend calls.",
          dragHint: "Drag nodes to organize the view",
          emptyNode: "Child Agent nodes appear after delegation.",
        };
  const graph = useMemo<{ nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number }>(() => {
    const parentID = selectedRunId ?? "placeholder-parent";
    const parent: GraphNode = {
      id: `parent-${parentID}`,
      runId: selectedRunId,
      label: callerName,
      subtitle: callerSlug || "Root run",
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
  }, [callerName, callerSlug, childRuns, copy.autoChild, copy.childAgent, placeholder, rootStatus, selectedRunId]);
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
      ? { title: "拖动节点整理调用树", viewRun: "查看运行", waiting: "等待运行", root: "根" }
      : { title: "Drag node to organize the call tree", viewRun: "View run", waiting: "Waiting for run", root: "Root" };
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
            {node.kind === "root" ? "entry" : "target"}
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
          title: "闭环逻辑",
          steps: [
            {
              title: "Agent 自注册",
              desc: "Agent 所有者在 /hub 发起自注册；Agent 读取 /skill/publish-agent 后带 endpoint、tags、skill_ids 注册自己，平台用 Agent 接入凭证承载注册和运行用途。",
            },
            {
              title: "Skill / MCP 关联",
              desc: "Skill 描述 Agent 能力并参与任务推荐；MCP 是外部客户端入口，调用会记录为 source=mcp。",
            },
            {
              title: "A2A 调用",
              desc: "入口 Agent 从本次请求拿到 run_id，再用自身绑定用途调用 call-agent，平台自动创建子运行和调用树事件。",
            },
          ],
        }
      : {
          title: "Loop logic",
          steps: [
            {
              title: "Agent self-registration",
              desc: "The Agent owner starts self-registration from /hub. The Agent reads /skill/publish-agent and registers itself with endpoint, tags, and skill_ids. OpenLinker uses Agent access credentials for registration and runtime.",
            },
            {
              title: "Skill / MCP linkage",
              desc: "Skills describe Agent capabilities and power task matching. MCP is the external client entry, and calls are recorded as source=mcp.",
            },
            {
              title: "A2A invocation",
              desc: "The Entry Agent receives run_id in the current request, calls call-agent with its bound credential, and OpenLinker creates the child run plus call-tree events.",
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
