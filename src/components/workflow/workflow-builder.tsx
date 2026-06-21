"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type WorkflowMarketAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_call_cents: number;
  tags?: string[];
  availability?: {
    status: string;
    label: string;
  };
  readiness?: {
    callable: boolean;
  };
};

type FlowNode = {
  id: string;
  key: string;
  title: string;
  role: "intake" | "agent";
  subtitle: string;
  x: number;
  y: number;
  icon: IconName;
  color: string;
  priceCents: number;
  callable: boolean;
  agentID?: string;
  slug?: string;
};

type WorkflowEdge = {
  from: string;
  to: string;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: Array<{
    id?: string;
    key: string;
    title: string;
    agent_id: string;
    config?: Record<string, unknown>;
  }>;
  edges?: WorkflowEdge[];
  created_at: string;
  updated_at: string;
};

type WorkflowRunStep = {
  id: string;
  node_key: string;
  agent_id: string;
  run_id?: string;
  status: string;
  output?: Record<string, unknown>;
  error_message?: string;
};

type WorkflowRunResponse = {
  id: string;
  workflow_id: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string;
  steps: WorkflowRunStep[];
  attempt_count?: number;
  max_attempts?: number;
  next_retry_at?: string;
  last_worker_error?: string;
  created_at?: string;
  updated_at?: string;
};

type WorkflowRunStepCompare = {
  node_key: string;
  base_status?: string;
  candidate_status?: string;
  base_run_id?: string;
  candidate_run_id?: string;
  changed: boolean;
  status_changed: boolean;
  run_changed: boolean;
  output_changed: boolean;
  error_changed: boolean;
};

type WorkflowRunComparison = {
  base_run_id: string;
  candidate_run_id: string;
  workflow_id: string;
  status_changed: boolean;
  output_changed: boolean;
  changed_node_keys: string[];
  steps: WorkflowRunStepCompare[];
};

type WorkflowStepRerunResponse = {
  source_run_id: string;
  rerun_run_id: string;
  node_key: string;
  reused_node_keys: string[];
  rerun_node_keys: string[];
  run: WorkflowRunResponse;
  comparison: WorkflowRunComparison;
};

type WorkflowListResponse = {
  items: WorkflowSummary[];
  total: number;
};

type WorkflowRunListResponse = {
  items: WorkflowRunResponse[];
  total: number;
};

const INPUT_NODE: FlowNode = {
  id: "input",
  key: "input",
  title: "任务输入",
  role: "intake",
  subtitle: "读取需求、附件和预算约束",
  x: 4,
  y: 22,
  icon: "clipboard",
  color: "#3176ed",
  priceCents: 0,
  callable: true,
};

function makeInputNode(locale: Locale): FlowNode {
  if (locale === "en") {
    return {
      ...INPUT_NODE,
      title: "Task input",
      subtitle: "Read requirements, attachments, and access constraints",
    };
  }
  return INPUT_NODE;
}

const NODE_LAYOUT = [
  { x: 30, y: 14, color: "#0f9187" },
  { x: 56, y: 33, color: "#715bd9" },
  { x: 78, y: 18, color: "#c8830d" },
  { x: 30, y: 58, color: "#218a52" },
  { x: 56, y: 64, color: "#3176ed" },
  { x: 78, y: 58, color: "#08746d" },
];

const INPUT_PRESETS: Record<Locale, string[]> = {
  zh: [
    "为跨境 SaaS 新定价做竞品与收入测算",
    "把销售线索分层并生成跟进建议",
    "对供应商报价做风险检查和审批摘要",
  ],
  en: [
    "Estimate competitors and revenue impact for new cross-border SaaS pricing",
    "Segment sales leads and generate follow-up recommendations",
    "Review supplier quotes for risk and approval summary",
  ],
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const TERMINAL_RUN_STATUSES = new Set(["success", "failed", "canceled", "paused"]);

function workflowRunStatusLabel(status: string, locale: Locale) {
  const labels: Record<Locale, Record<string, string>> = {
    zh: {
      pending: "等待",
      running: "运行中",
      paused: "已暂停",
      canceled: "已取消",
      success: "成功",
      failed: "失败",
    },
    en: {
      pending: "Pending",
      running: "Running",
      paused: "Paused",
      canceled: "Canceled",
      success: "Success",
      failed: "Failed",
    },
  };
  return labels[locale][status] ?? status;
}

function estimateCost(nodes: FlowNode[]) {
  return nodes.reduce((sum, node) => sum + node.priceCents, 0);
}

function pricePreviewLabel(cents: number, locale: Locale) {
  if (cents > 0) {
    return locale === "zh" ? `$${(cents / 100).toFixed(2)} / 次` : `$${(cents / 100).toFixed(2)} / run`;
  }
  return locale === "zh" ? "当前免费" : "Free now";
}

function isWorkflowAgentCallable(agent: WorkflowMarketAgent) {
  return agent.readiness?.callable ?? agent.availability?.status === "healthy";
}

function nodeKey(agent: WorkflowMarketAgent, index: number) {
  const slug = agent.slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `${slug || "agent"}_${index + 1}`;
}

function agentToNode(agent: WorkflowMarketAgent, index: number): FlowNode {
  const layout = NODE_LAYOUT[index % NODE_LAYOUT.length];
  return {
    id: `agent-${agent.id}`,
    key: nodeKey(agent, index),
    title: agent.name,
    role: "agent",
    subtitle: agent.description || `/${agent.slug}`,
    x: layout.x,
    y: layout.y,
    icon: "bot",
    color: layout.color,
    priceCents: agent.price_per_call_cents ?? 0,
    callable: isWorkflowAgentCallable(agent),
    agentID: agent.id,
    slug: agent.slug,
  };
}

function defaultNodes(agents: WorkflowMarketAgent[], locale: Locale) {
  return [makeInputNode(locale), ...agents.filter(isWorkflowAgentCallable).slice(0, 2).map(agentToNode)];
}

function defaultEdges(nodes: FlowNode[]): WorkflowEdge[] {
  const executable = nodes.filter((node) => node.role === "agent" && node.agentID);
  return executable.slice(1).map((node, index) => ({
    from: executable[index].key,
    to: node.key,
  }));
}

function edgeKey(edge: WorkflowEdge) {
  return `${edge.from}->${edge.to}`;
}

function wouldCreateCycle(edges: WorkflowEdge[], from: string, to: string) {
  const nextEdges = [...edges, { from, to }];
  const children = new Map<string, string[]>();
  for (const edge of nextEdges) {
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
  }
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    if (current === from) return true;
    seen.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return false;
}

function workflowToCanvasNodes(workflow: WorkflowSummary, agents: WorkflowMarketAgent[], locale: Locale) {
  const agentByID = new Map(agents.map((agent) => [agent.id, agent]));
  return [
    makeInputNode(locale),
    ...workflow.nodes.map((node, index) => {
      const agent = agentByID.get(node.agent_id);
      const layout = NODE_LAYOUT[index % NODE_LAYOUT.length];
      const slug =
        agent?.slug ||
        (typeof node.config?.slug === "string" ? node.config.slug : undefined);
      return {
        id: `agent-${node.agent_id}-${node.key}`,
        key: node.key,
        title: node.title || agent?.name || node.key,
        role: "agent" as const,
        subtitle:
          agent?.description ||
          (slug ? `/${slug}` : locale === "zh" ? "已保存 Agent 节点" : "Saved Agent node"),
        x: layout.x,
        y: layout.y,
        icon: "bot" as IconName,
        color: layout.color,
        priceCents: agent?.price_per_call_cents ?? 0,
        callable: agent ? isWorkflowAgentCallable(agent) : false,
        agentID: node.agent_id,
        slug,
      };
    }),
  ];
}

const WORKFLOW_COPY = {
  zh: {
    defaultName: "我的 Agent 工作流",
    initialStatus: "选择市场里的 Agent 节点后，可保存并真实运行。",
    historyReadFailed: "workflow run 历史读取失败",
    chooseEndpoints: "请选择起点和终点。",
    selfEdge: "DAG 边不能连接到自身。",
    duplicateEdge: "这条依赖边已经存在。",
    cycleEdge: "这条边会形成环，后端也会拒绝该 DAG。",
    stepRerunFailed: "step 重跑失败",
    compareFailed: "运行对比失败",
    controlFailed: "workflow 操作失败",
    signInFirst: "请先登录，再保存并运行 workflow。",
    needAgent: "至少需要添加 1 个真实 Agent 节点。",
    uncallablePrefix: "节点不可调用",
    switchCallableAgent: "请从左侧节点库换成可调用 Agent。",
    maxNodes: "一个 workflow 最多支持 10 个 Agent 节点。",
    savingDefinition: "正在保存 workflow 定义...",
    savedDescription: "由 Workflow Builder 保存并执行的 DAG Agent 工作流。",
    queuedDefinition: "已保存，已进入异步运行队列...",
    runningStatus: (attempt: number, steps: number) => `运行中：第 ${attempt} 次执行，已生成 ${steps} 个 step。`,
    waitingWorker: (status: string) => `等待 worker：${status}`,
    queuedStatus: (id: string) => `已入队：workflow_run ${id.slice(0, 8)}，后台 worker 正在认领。`,
    runSuccess: "运行完成：每个 Agent 节点都已生成真实 child run。",
    runFailed: (reason: string) => `运行失败：${reason || "请查看 run step"}`,
    runPaused: "运行已暂停，可从运行历史恢复。",
    runCanceled: "运行已取消。",
    runContinuing: "运行仍在后台继续，可稍后从工作流历史查看。",
    runFailedFallback: "workflow 运行失败",
    saveOrRunFailed: "保存或运行失败，请检查登录状态和 Agent 可用性。",
    rerunStatus: (nodeKeyValue: string, reused: number, rerun: number) =>
      `已从 ${nodeKeyValue} 重跑：复用 ${reused} 个上游节点，重跑 ${rerun} 个节点。`,
    compareStatus: (id: string, changed: number) => `已对比 ${id.slice(0, 8)} 与当前 run，差异节点 ${changed} 个。`,
    pauseStatus: "workflow_run 已暂停，worker 不会继续认领。",
    resumeStatus: "workflow_run 已恢复到队列。",
    cancelStatus: "workflow_run 已取消。",
    retryStatus: "已复制失败 run 的输入并重新入队。",
    agentNotCallable: "这个 Agent 当前没有可调用证据，不能加入默认工作流节点。",
    productionTitle: "现在会保存 workflow，并真实调用每个 Agent 节点",
    productionLead: "Builder 现在可以编辑 DAG 依赖边；后端会做拓扑校验并并行执行无依赖分支，运行后可在页面里 step 级重跑并对比两次 run。",
    tasksLink: "去任务闭环",
    a2aLink: "查看 A2A",
    agentLibraryTitle: "真实 Agent 节点库",
    emptyAgents: "暂时没有可调用公开 Agent。先去市场确认 Agent 状态，或接入一个带心跳的 runtime_pull Agent。",
    added: "已在画布中",
    priceReferenceTitle: "未来价格参考",
    priceReferenceLead: "当前节点运行免费；这里仅保留后续计划中的价格参考。",
    canvasTitle: "流程画布",
    dagTab: "DAG 编排",
    saveRun: "保存并运行",
    runningShort: "运行中",
    edgeLead: "增删依赖边后保存。无依赖的 Agent 会并行执行；形成环的边会被前端和后端拒绝。",
    start: "起点",
    target: "终点",
    addDependency: "添加依赖",
    noEdges: "当前无自定义边；保存时后端按节点顺序兼容执行。",
    delete: "删除",
    metricType: "类型",
    futureDisplayPrice: "未来展示价",
    nodeKeyLabel: "节点 Key",
    removeNode: "移除节点",
    realQueue: "真实运行队列",
    queued: "queued",
    viewChildRun: "查看 child run",
    rerunning: "重跑中",
    rerunFromStep: "从此 step 重跑",
    recentSaved: "最近保存",
    itemCount: (count: number) => `${count} 个`,
    needSignInShort: "需登录",
    signInSave: "登录后查看并保存 workflow",
    noSaved: "还没有保存记录。点击“保存并运行”会创建第一条。",
    savedNodes: (count: number) => `${count} 个 Agent 节点 · 查看历史`,
    runHistory: "运行历史",
    runCount: (count: number) => `${count} 条`,
    chooseWorkflow: "选择 workflow",
    historyLogin: "登录后可查看 workflow run 历史。",
    readingHistory: "正在读取历史...",
    noHistory: "选择一个已保存 workflow，或运行一次新 workflow 后查看历史。",
    comparing: "对比中",
    compareCurrentRun: "与当前 run 对比",
    actionLabels: { pause: "暂停", resume: "恢复", cancel: "取消", retry: "重试", processing: "处理中" },
    diffNodes: (count: number) => `${count} 个差异节点`,
  },
  en: {
    defaultName: "My Agent workflow",
    initialStatus: "Select market Agent nodes, then save and run the workflow.",
    historyReadFailed: "Failed to read workflow run history",
    chooseEndpoints: "Choose both a source and target node.",
    selfEdge: "A DAG edge cannot connect a node to itself.",
    duplicateEdge: "This dependency edge already exists.",
    cycleEdge: "This edge would create a cycle and will also be rejected by the backend.",
    stepRerunFailed: "Step rerun failed",
    compareFailed: "Run comparison failed",
    controlFailed: "Workflow action failed",
    signInFirst: "Sign in before saving and running a workflow.",
    needAgent: "Add at least one real Agent node.",
    uncallablePrefix: "Nodes are not callable",
    switchCallableAgent: "Replace them with callable Agents from the left library.",
    maxNodes: "A workflow supports up to 10 Agent nodes.",
    savingDefinition: "Saving workflow definition...",
    savedDescription: "DAG Agent workflow saved and executed by Workflow Builder.",
    queuedDefinition: "Saved and queued for async execution...",
    runningStatus: (attempt: number, steps: number) => `Running: attempt ${attempt}, ${steps} steps generated.`,
    waitingWorker: (status: string) => `Waiting for worker: ${status}`,
    queuedStatus: (id: string) => `Queued: workflow_run ${id.slice(0, 8)} is waiting for a worker claim.`,
    runSuccess: "Run complete: every Agent node produced a real child run.",
    runFailed: (reason: string) => `Run failed: ${reason || "check the run step"}`,
    runPaused: "Run paused. You can resume it from run history.",
    runCanceled: "Run canceled.",
    runContinuing: "Run is still continuing in the background. Check workflow history later.",
    runFailedFallback: "Workflow run failed",
    saveOrRunFailed: "Save or run failed. Check sign-in state and Agent availability.",
    rerunStatus: (nodeKeyValue: string, reused: number, rerun: number) =>
      `Reran from ${nodeKeyValue}: reused ${reused} upstream nodes and reran ${rerun} nodes.`,
    compareStatus: (id: string, changed: number) => `Compared ${id.slice(0, 8)} with the current run; ${changed} nodes differ.`,
    pauseStatus: "workflow_run paused. Workers will not continue claiming it.",
    resumeStatus: "workflow_run resumed into the queue.",
    cancelStatus: "workflow_run canceled.",
    retryStatus: "Copied the failed run input and queued a retry.",
    agentNotCallable: "This Agent has no callable evidence, so it cannot be added to the default workflow.",
    productionTitle: "Workflows are saved and each Agent node runs for real",
    productionLead: "The builder can edit DAG dependency edges. The backend validates topology, runs independent branches in parallel, and supports step-level reruns plus run comparison.",
    tasksLink: "Task loop",
    a2aLink: "View A2A",
    agentLibraryTitle: "Real Agent library",
    emptyAgents: "No callable public Agents yet. Check Agent status in the market, or connect a runtime_pull Agent with heartbeat.",
    added: "Already on canvas",
    priceReferenceTitle: "Future price reference",
    priceReferenceLead: "Node runs are free now. This only preserves a future plan reference.",
    canvasTitle: "Flow canvas",
    dagTab: "DAG orchestration",
    saveRun: "Save and run",
    runningShort: "Running",
    edgeLead: "Save after editing dependency edges. Agents without dependencies run in parallel; cycle-forming edges are rejected in the frontend and backend.",
    start: "Source",
    target: "Target",
    addDependency: "Add dependency",
    noEdges: "No custom edges yet. The backend will execute by node order for compatibility.",
    delete: "Delete",
    metricType: "Type",
    futureDisplayPrice: "Future display price",
    nodeKeyLabel: "Node key",
    removeNode: "Remove node",
    realQueue: "Real run queue",
    queued: "queued",
    viewChildRun: "View child run",
    rerunning: "Rerunning",
    rerunFromStep: "Rerun from this step",
    recentSaved: "Recently saved",
    itemCount: (count: number) => `${count} items`,
    needSignInShort: "Sign-in required",
    signInSave: "Sign in to view and save workflows",
    noSaved: "No saved workflows yet. Select \"Save and run\" to create the first one.",
    savedNodes: (count: number) => `${count} Agent nodes · view history`,
    runHistory: "Run history",
    runCount: (count: number) => `${count} runs`,
    chooseWorkflow: "Choose workflow",
    historyLogin: "Sign in to view workflow run history.",
    readingHistory: "Reading history...",
    noHistory: "Choose a saved workflow, or run a new workflow once to view history.",
    comparing: "Comparing",
    compareCurrentRun: "Compare with current run",
    actionLabels: { pause: "Pause", resume: "Resume", cancel: "Cancel", retry: "Retry", processing: "Processing" },
    diffNodes: (count: number) => `${count} changed nodes`,
  },
};

export function WorkflowBuilder({
  initialAgents = [],
  initialWorkflows = [],
  initialWorkflowsTotal = initialWorkflows.length,
  locale = "zh",
}: {
  initialAgents?: WorkflowMarketAgent[];
  initialWorkflows?: WorkflowSummary[];
  initialWorkflowsTotal?: number;
  locale?: Locale;
}) {
  const copy = WORKFLOW_COPY[locale];
  const inputPresets = INPUT_PRESETS[locale];
  const initialCanvasNodes = defaultNodes(initialAgents, locale);
  const { fetch: apiFetch, isAuthenticated } = useApi();
  const [nodes, setNodes] = useState<FlowNode[]>(() => initialCanvasNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => defaultEdges(initialCanvasNodes));
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [selectedID, setSelectedID] = useState(() => initialCanvasNodes[1]?.id ?? INPUT_NODE.id);
  const [input, setInput] = useState(inputPresets[0]);
  const [workflowName, setWorkflowName] = useState(copy.defaultName);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(copy.initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowSummary[]>(initialWorkflows);
  const [savedWorkflowsTotal, setSavedWorkflowsTotal] = useState(initialWorkflowsTotal);
  const [createdWorkflow, setCreatedWorkflow] = useState<WorkflowSummary | null>(null);
  const [runResult, setRunResult] = useState<WorkflowRunResponse | null>(null);
  const [selectedWorkflowID, setSelectedWorkflowID] = useState<string | null>(
    initialWorkflows[0]?.id ?? null,
  );
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunResponse[]>([]);
  const [workflowRunsTotal, setWorkflowRunsTotal] = useState(0);
  const [workflowRunsBusy, setWorkflowRunsBusy] = useState(false);
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [comparison, setComparison] = useState<WorkflowRunComparison | null>(null);
  const [rerunBusy, setRerunBusy] = useState<string | null>(null);

  const executableNodes = useMemo(
    () => nodes.filter((node) => node.role === "agent" && node.agentID),
    [nodes],
  );
  const callableAgents = useMemo(
    () => initialAgents.filter(isWorkflowAgentCallable),
    [initialAgents],
  );
  const selectedNode = nodes.find((node) => node.id === selectedID) ?? nodes[0];
  const priceCents = useMemo(() => estimateCost(nodes), [nodes]);
  const runStepsByKey = useMemo(() => {
    const map = new Map<string, WorkflowRunStep>();
    for (const step of runResult?.steps ?? []) {
      map.set(step.node_key, step);
    }
    return map;
  }, [runResult]);
  const nodeByKey = useMemo(
    () => new Map(executableNodes.map((node) => [node.key, node])),
    [executableNodes],
  );
  const incomingKeys = useMemo(() => new Set(edges.map((edge) => edge.to)), [edges]);
  const rootNodes = useMemo(
    () => executableNodes.filter((node) => !incomingKeys.has(node.key)),
    [executableNodes, incomingKeys],
  );
  const validEdges = useMemo(
    () => edges.filter((edge) => nodeByKey.has(edge.from) && nodeByKey.has(edge.to)),
    [edges, nodeByKey],
  );

  const loadSavedWorkflows = async () => {
    if (!isAuthenticated) {
      setSavedWorkflows([]);
      setSavedWorkflowsTotal(0);
      return;
    }
    try {
      const data = await apiFetch<WorkflowListResponse>("/api/v1/workflows");
      setSavedWorkflows(data.items ?? []);
      setSavedWorkflowsTotal(data.total ?? data.items?.length ?? 0);
    } catch {
      setSavedWorkflows([]);
      setSavedWorkflowsTotal(0);
    }
  };

  const loadWorkflowRuns = async (workflowID: string) => {
    if (!isAuthenticated) return;
    setSelectedWorkflowID(workflowID);
    setWorkflowRunsBusy(true);
    try {
      const data = await apiFetch<WorkflowRunListResponse>(
        `/api/v1/workflows/${encodeURIComponent(workflowID)}/runs`,
      );
      setWorkflowRuns(data.items ?? []);
      setWorkflowRunsTotal(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : copy.historyReadFailed;
      setError(message);
      setWorkflowRuns([]);
      setWorkflowRunsTotal(0);
    } finally {
      setWorkflowRunsBusy(false);
    }
  };

  const selectSavedWorkflow = async (workflow: WorkflowSummary) => {
    const nextNodes = workflowToCanvasNodes(workflow, initialAgents, locale);
    setNodes(nextNodes);
    setEdges(workflow.edges?.length ? workflow.edges : defaultEdges(nextNodes));
    setWorkflowName(workflow.name);
    setCreatedWorkflow(workflow);
    setRunResult(null);
    setComparison(null);
    setSelectedID(nextNodes[1]?.id ?? INPUT_NODE.id);
    await loadWorkflowRuns(workflow.id);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo) {
      setError(copy.chooseEndpoints);
      return;
    }
    if (edgeFrom === edgeTo) {
      setError(copy.selfEdge);
      return;
    }
    const nextEdge = { from: edgeFrom, to: edgeTo };
    if (edges.some((edge) => edgeKey(edge) === edgeKey(nextEdge))) {
      setError(copy.duplicateEdge);
      return;
    }
    if (wouldCreateCycle(edges, edgeFrom, edgeTo)) {
      setError(copy.cycleEdge);
      return;
    }
    setEdges((current) => [...current, nextEdge]);
    setError(null);
    setRunResult(null);
    setCreatedWorkflow(null);
    setComparison(null);
  };

  const removeEdge = (target: WorkflowEdge) => {
    setEdges((current) => current.filter((edge) => edgeKey(edge) !== edgeKey(target)));
    setRunResult(null);
    setCreatedWorkflow(null);
    setComparison(null);
  };

  const rerunStep = async (run: WorkflowRunResponse, nodeKeyValue: string) => {
    setRerunBusy(`${run.id}:${nodeKeyValue}`);
    setError(null);
    try {
      const data = await apiFetch<WorkflowStepRerunResponse>(
        `/api/v1/workflow-runs/${encodeURIComponent(run.id)}/steps/rerun`,
        {
          method: "POST",
          body: { node_key: nodeKeyValue },
        },
      );
      setRunResult(data.run);
      setComparison(data.comparison);
      await loadWorkflowRuns(data.run.workflow_id || run.workflow_id);
      setStatus(copy.rerunStatus(nodeKeyValue, data.reused_node_keys.length, data.rerun_node_keys.length));
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : copy.stepRerunFailed;
      setError(message);
    } finally {
      setRerunBusy(null);
    }
  };

  const compareWithCurrent = async (run: WorkflowRunResponse) => {
    if (!runResult || runResult.id === run.id) return;
    setControlBusy(`${run.id}:compare`);
    setError(null);
    try {
      const data = await apiFetch<WorkflowRunComparison>(
        `/api/v1/workflow-runs/${encodeURIComponent(run.id)}/compare/${encodeURIComponent(
          runResult.id,
        )}`,
      );
      setComparison(data);
      setStatus(copy.compareStatus(run.id, data.changed_node_keys.length));
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : copy.compareFailed;
      setError(message);
    } finally {
      setControlBusy(null);
    }
  };

  const controlWorkflowRun = async (
    run: WorkflowRunResponse,
    action: "pause" | "resume" | "cancel" | "retry",
  ) => {
    setControlBusy(`${run.id}:${action}`);
    setError(null);
    try {
      const updated = await apiFetch<WorkflowRunResponse>(
        `/api/v1/workflow-runs/${encodeURIComponent(run.id)}/${action}`,
        { method: "POST" },
      );
      setRunResult((current) => {
        if (!current || current.id === run.id || action === "retry") return updated;
        return current;
      });
      if (action === "retry") setComparison(null);
      const workflowID = updated.workflow_id || run.workflow_id || selectedWorkflowID;
      if (workflowID) {
        await loadWorkflowRuns(workflowID);
      }
      setStatus(
        action === "pause"
          ? copy.pauseStatus
          : action === "resume"
            ? copy.resumeStatus
            : action === "cancel"
              ? copy.cancelStatus
              : copy.retryStatus,
      );
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : copy.controlFailed;
      setError(message);
    } finally {
      setControlBusy(null);
    }
  };

  const addNode = (agent: WorkflowMarketAgent) => {
    if (nodes.some((item) => item.agentID === agent.id)) return;
    if (!isWorkflowAgentCallable(agent)) {
      setError(copy.agentNotCallable);
      return;
    }
    if (executableNodes.length >= 10) {
      setError(copy.maxNodes);
      return;
    }
    const nextNode = agentToNode(agent, executableNodes.length);
    setNodes((current) => [...current, nextNode]);
    if (executableNodes.length > 0) {
      setEdges((current) => [
        ...current,
        { from: executableNodes[executableNodes.length - 1].key, to: nextNode.key },
      ]);
    }
    setSelectedID(nextNode.id);
    setRunResult(null);
    setCreatedWorkflow(null);
    setComparison(null);
    setError(null);
  };

  const removeSelected = () => {
    if (selectedNode.role === "intake") return;
    const next = nodes.filter((node) => node.id !== selectedNode.id);
    setNodes(next);
    setEdges((current) =>
      current.filter((edge) => edge.from !== selectedNode.key && edge.to !== selectedNode.key),
    );
    setSelectedID(next[1]?.id ?? INPUT_NODE.id);
    setRunResult(null);
    setCreatedWorkflow(null);
    setComparison(null);
    setError(null);
  };

  const runWorkflow = async () => {
    if (!isAuthenticated) {
      setError(copy.signInFirst);
      return;
    }
    if (executableNodes.length === 0) {
      setError(copy.needAgent);
      return;
    }
    const uncallable = executableNodes.filter((node) => !node.callable);
    if (uncallable.length > 0) {
      setError(`${copy.uncallablePrefix}: ${uncallable.map((node) => node.title).join(", ")}. ${copy.switchCallableAgent}`);
      return;
    }
    setRunning(true);
    setRunResult(null);
    setCreatedWorkflow(null);
    setError(null);
    setStatus(copy.savingDefinition);
    try {
      const created = await apiFetch<WorkflowSummary>("/api/v1/workflows", {
        method: "POST",
        body: {
          name: workflowName.trim() || copy.defaultName,
          description: copy.savedDescription,
          nodes: executableNodes.map((node) => ({
            key: node.key,
            title: node.title,
            agent_id: node.agentID,
            config: {
              slug: node.slug,
              source: "workflow_builder",
            },
          })),
          edges: validEdges,
        },
      });
      setCreatedWorkflow(created);
      setSelectedWorkflowID(created.id);
      setComparison(null);
      setStatus(copy.queuedDefinition);
      const queued = await apiFetch<WorkflowRunResponse>(
        `/api/v1/workflows/${encodeURIComponent(created.id)}/runs`,
        {
          method: "POST",
          body: {
            input: {
              text: input,
              source: "workflow_builder",
            },
          },
        },
      );
      setRunResult(queued);
      setWorkflowRuns([queued]);
      setWorkflowRunsTotal(1);
      setStatus(copy.queuedStatus(queued.id));

      let latest = queued;
      for (let i = 0; i < 30; i++) {
        await sleep(1200);
        latest = await apiFetch<WorkflowRunResponse>(
          `/api/v1/workflow-runs/${encodeURIComponent(queued.id)}`,
        );
        setRunResult(latest);
        if (TERMINAL_RUN_STATUSES.has(latest.status)) break;
        setStatus(
          latest.status === "running"
            ? copy.runningStatus(latest.attempt_count ?? 1, latest.steps.length)
            : copy.waitingWorker(latest.status),
        );
      }

      setStatus(
        latest.status === "success"
          ? copy.runSuccess
          : latest.status === "failed"
            ? copy.runFailed(latest.error_message || latest.last_worker_error || "")
            : latest.status === "paused"
              ? copy.runPaused
              : latest.status === "canceled"
                ? copy.runCanceled
                : copy.runContinuing,
      );
      await loadSavedWorkflows();
      await loadWorkflowRuns(created.id);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : copy.runFailedFallback;
      setError(message);
      setStatus(copy.saveOrRunFailed);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="ol-panel ol-panel-pad border-[color:var(--ol-green)]/25 bg-[color:var(--ol-green-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="ol-kicker">production workflow</div>
            <h2 className="mt-1 text-[18px] font-black text-[color:var(--ol-ink)]">
              {copy.productionTitle}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.productionLead}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tasks"
              className="inline-flex h-9 items-center rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
            >
              {copy.tasksLink}
            </Link>
            <Link
              href="/a2a"
              className="inline-flex h-9 items-center rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
            >
              {copy.a2aLink}
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)_340px]">
        <aside className="ol-panel ol-panel-pad h-fit">
          <div className="ol-kicker">agent library</div>
          <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
            {copy.agentLibraryTitle}
          </h2>
          <div className="mt-4 grid gap-2">
            {callableAgents.length === 0 ? (
              <div className="rounded-[14px] bg-[color:var(--ol-soft)] p-3 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                {copy.emptyAgents}
              </div>
            ) : (
              callableAgents.map((agent) => {
                const added = nodes.some((node) => node.agentID === agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => addNode(agent)}
                    disabled={added || running}
                    className={cn(
                      "rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3 text-left transition hover:border-[color:var(--ol-primary)]/45",
                      added && "cursor-default bg-[color:var(--ol-soft)] opacity-70",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-black text-[color:var(--ol-ink)]">
                      <Icon name="bot" size="sm" />
                      {agent.name}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                      {added ? copy.added : agent.description || `/${agent.slug}`}
                    </span>
                    <span className="mt-2 flex items-center justify-between text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                      <span>{agent.availability?.label ?? agent.availability?.status ?? "unknown"}</span>
                      <span>{pricePreviewLabel(agent.price_per_call_cents ?? 0, locale)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-5 rounded-[14px] bg-[color:var(--ol-blue-soft)] p-3">
            <div className="text-[12px] font-black text-[color:var(--ol-blue)]">
              {copy.priceReferenceTitle}
            </div>
            <div className="mt-1 text-[22px] font-black text-[color:var(--ol-ink)]">
              {pricePreviewLabel(priceCents, locale)}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
              {copy.priceReferenceLead}
            </p>
          </div>
        </aside>

        <section className="ol-panel overflow-hidden">
          <div className="ol-panel-head">
            <strong>{copy.canvasTitle}</strong>
            <div className="ol-code-tabs">
              <button type="button" className="ol-code-tab active">
                {copy.dagTab}
              </button>
              <button
                type="button"
                className="ol-code-tab"
                onClick={runWorkflow}
                disabled={running}
              >
                {running ? copy.runningShort : copy.saveRun}
              </button>
            </div>
          </div>

          <div className="border-b border-[color:var(--ol-line)] bg-white/70 p-4">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-[12px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
                  workflow name
                </span>
                <input
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  className="mt-2 block h-11 w-full rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3.5 text-[14px] font-bold text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/15"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
                  input
                </span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="mt-2 block min-h-[78px] w-full resize-none rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-[color:var(--ol-ink)] outline-none transition focus:border-[color:var(--ol-primary)] focus:ring-2 focus:ring-[color:var(--ol-primary)]/15"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {inputPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInput(preset)}
                  className="rounded-full border border-[color:var(--ol-line)] bg-white px-3 py-1.5 text-[12px] font-extrabold text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40 hover:text-[color:var(--ol-primary-dark)]"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[16px] border border-[color:var(--ol-line)] bg-white p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
                    DAG edges
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                    {copy.edgeLead}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={edgeFrom}
                    onChange={(event) => setEdgeFrom(event.target.value)}
                    className="h-10 rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-bold text-[color:var(--ol-ink)] outline-none"
                  >
                    <option value="">{copy.start}</option>
                    {executableNodes.map((node) => (
                      <option key={node.key} value={node.key}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={edgeTo}
                    onChange={(event) => setEdgeTo(event.target.value)}
                    className="h-10 rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-bold text-[color:var(--ol-ink)] outline-none"
                  >
                    <option value="">{copy.target}</option>
                    {executableNodes.map((node) => (
                      <option key={node.key} value={node.key}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addEdge}
                    disabled={running || executableNodes.length < 2}
                    className="h-10 rounded-[12px] bg-[color:var(--ol-ink)] px-3 text-[12.5px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copy.addDependency}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {validEdges.length === 0 ? (
                  <span className="rounded-full bg-[color:var(--ol-soft)] px-3 py-1.5 text-[12px] font-bold text-[color:var(--ol-muted)]">
                    {copy.noEdges}
                  </span>
                ) : (
                  validEdges.map((edge) => (
                    <button
                      key={edgeKey(edge)}
                      type="button"
                      onClick={() => removeEdge(edge)}
                      disabled={running}
                      className="rounded-full border border-[color:var(--ol-line)] bg-[color:var(--ol-blue-soft)] px-3 py-1.5 text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {nodeByKey.get(edge.from)?.title ?? edge.from} →{" "}
                      {nodeByKey.get(edge.to)?.title ?? edge.to} · {copy.delete}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-5">
            <div className="relative min-h-[430px] min-w-[760px] rounded-[18px] border border-dashed border-[color:var(--ol-line)] bg-[linear-gradient(90deg,rgba(49,118,237,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(15,145,135,0.06)_1px,transparent_1px)] bg-[size:42px_42px]">
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {rootNodes.map((node) => (
                  <line
                    key={`input-${node.key}`}
                    x1={INPUT_NODE.x + 11}
                    y1={INPUT_NODE.y + 11}
                    x2={node.x + 11}
                    y2={node.y + 11}
                    stroke="rgba(49,118,237,0.22)"
                    strokeDasharray="2 2"
                    strokeWidth="0.35"
                  />
                ))}
                {validEdges.map((edge) => {
                  const from = nodeByKey.get(edge.from);
                  const to = nodeByKey.get(edge.to);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={edgeKey(edge)}
                      x1={from.x + 11}
                      y1={from.y + 11}
                      x2={to.x + 11}
                      y2={to.y + 11}
                      stroke="rgba(15,145,135,0.45)"
                      strokeWidth="0.42"
                    />
                  );
                })}
              </svg>

              {nodes.map((node) => {
                const step = runStepsByKey.get(node.key);
                const isSelected = node.id === selectedNode.id;
                const isActive = running && node.role === "agent";
                const isDone = step?.status === "success";
                const isFailed = step?.status === "failed";
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedID(node.id)}
                    className={cn(
                      "absolute w-[190px] rounded-[16px] border bg-white p-4 text-left shadow-[0_16px_32px_rgba(25,66,84,0.10)] transition",
                      isSelected && "ring-2 ring-[color:var(--ol-primary)]/25",
                      isActive && "scale-[1.02]",
                    )}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      borderColor:
                        isSelected || isActive || isDone || isFailed
                          ? node.color
                          : "var(--ol-line)",
                    }}
                  >
                    <span
                      className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-white"
                      style={{ background: node.color }}
                    >
                      <Icon name={node.icon} size="sm" />
                    </span>
                    <span className="block text-[13px] font-black text-[color:var(--ol-ink)]">
                      {node.title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                      {node.subtitle}
                    </span>
                    <span className="mt-3 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.05em] text-[color:var(--ol-subtle)]">
                      {node.role}
                      {isFailed ? (
                        <span className="text-red-600">failed</span>
                      ) : isDone ? (
                        <span className="text-[color:var(--ol-green)]">done</span>
                      ) : isActive ? (
                        <span className="text-[color:var(--ol-primary-dark)]">
                          running
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="ol-panel ol-panel-pad">
            <div className="ol-kicker">inspector</div>
            <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
              {selectedNode.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
              {selectedNode.subtitle}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label={copy.metricType} value={selectedNode.role} />
                <Metric
                  label={copy.futureDisplayPrice}
                  value={pricePreviewLabel(selectedNode.priceCents, locale)}
                />
              {selectedNode.slug ? <Metric label="Agent" value={`/${selectedNode.slug}`} /> : null}
              <Metric label={copy.nodeKeyLabel} value={selectedNode.key} />
            </div>
            <button
              type="button"
              onClick={removeSelected}
              disabled={selectedNode.role === "intake" || running}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[13px] border border-[color:var(--ol-line)] bg-white text-[13px] font-black text-[color:var(--ol-ink)] hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.removeNode}
            </button>
          </div>

          <div className="ol-panel ol-panel-pad">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
                {copy.realQueue}
              </h2>
              <button
                type="button"
                onClick={runWorkflow}
                disabled={running || executableNodes.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white hover:bg-[color:var(--ol-primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Icon name={running ? "refresh" : "zap"} size="sm" />
                {running ? copy.runningShort : copy.saveRun}
              </button>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
              {status}
            </p>
            {error ? (
              <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-[12.5px] font-bold text-red-700">
                {error}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              {executableNodes.map((node, index) => {
                const step = runStepsByKey.get(node.key);
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3 py-2.5",
                      step?.status === "success" &&
                        "border-[color:var(--ol-green)]/30 bg-[color:var(--ol-green-soft)]",
                      step?.status === "failed" && "border-red-200 bg-red-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
                        {index + 1}. {node.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                        {step?.status ?? (running ? "running" : copy.queued)}
                      </span>
                    </div>
                    {step?.run_id ? (
                      <Link
                        href={`/run/${step.run_id}`}
                        className="mt-2 inline-flex text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:underline"
                      >
                        {copy.viewChildRun}
                      </Link>
                    ) : null}
                    {runResult &&
                    (runResult.status === "success" || runResult.status === "failed") &&
                    step ? (
                      <button
                        type="button"
                        onClick={() => void rerunStep(runResult, node.key)}
                        disabled={Boolean(rerunBusy)}
                        className="ml-3 mt-2 inline-flex text-[12px] font-black text-[color:var(--ol-green)] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rerunBusy === `${runResult.id}:${node.key}` ? copy.rerunning : copy.rerunFromStep}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {createdWorkflow || runResult ? (
              <div className="mt-4 rounded-[14px] bg-[color:var(--ol-soft)] p-3 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">
                {createdWorkflow ? <div>Workflow ID：{createdWorkflow.id}</div> : null}
                {runResult ? <div>Workflow Run ID: {runResult.id}</div> : null}
              </div>
            ) : null}
            {runResult ? (
              <RunActions
                run={runResult}
                controlBusy={controlBusy}
                locale={locale}
                onAction={controlWorkflowRun}
              />
            ) : null}
            {comparison ? <ComparisonPanel comparison={comparison} locale={locale} /> : null}
          </div>

          <div className="ol-panel ol-panel-pad">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
                {copy.recentSaved}
              </h2>
              <span className="text-[12px] font-bold text-[color:var(--ol-muted)]">
                {isAuthenticated ? copy.itemCount(savedWorkflowsTotal) : copy.needSignInShort}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {!isAuthenticated ? (
                <Link
                  href="/login?callbackUrl=/workflow"
                  className="rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3 py-2.5 text-[12.5px] font-black text-[color:var(--ol-primary-dark)]"
                >
                  {copy.signInSave}
                </Link>
              ) : savedWorkflows.length === 0 ? (
                <div className="rounded-[14px] bg-[color:var(--ol-soft)] px-3 py-2.5 text-[12.5px] text-[color:var(--ol-muted)]">
                  {copy.noSaved}
                </div>
              ) : (
                savedWorkflows.slice(0, 4).map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => void selectSavedWorkflow(workflow)}
                    className={cn(
                      "rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3 py-2.5 text-left transition hover:border-[color:var(--ol-primary)]/40",
                      selectedWorkflowID === workflow.id &&
                        "border-[color:var(--ol-primary)]/40 bg-[color:var(--ol-blue-soft)]",
                    )}
                  >
                    <div className="truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
                      {workflow.name}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[color:var(--ol-subtle)]">
                      {copy.savedNodes(workflow.nodes.length)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="ol-panel ol-panel-pad">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
                {copy.runHistory}
              </h2>
              <span className="text-[12px] font-bold text-[color:var(--ol-muted)]">
                {selectedWorkflowID ? copy.runCount(workflowRunsTotal) : copy.chooseWorkflow}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {!isAuthenticated ? (
                <div className="rounded-[14px] bg-[color:var(--ol-soft)] px-3 py-2.5 text-[12.5px] text-[color:var(--ol-muted)]">
                  {copy.historyLogin}
                </div>
              ) : workflowRunsBusy ? (
                <div className="rounded-[14px] bg-[color:var(--ol-soft)] px-3 py-2.5 text-[12.5px] font-bold text-[color:var(--ol-muted)]">
                  {copy.readingHistory}
                </div>
              ) : workflowRuns.length === 0 ? (
                <div className="rounded-[14px] bg-[color:var(--ol-soft)] px-3 py-2.5 text-[12.5px] text-[color:var(--ol-muted)]">
                  {copy.noHistory}
                </div>
              ) : (
                workflowRuns.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      "rounded-[14px] border border-[color:var(--ol-line)] bg-white px-3 py-2.5",
                      run.status === "success" &&
                        "border-[color:var(--ol-green)]/30 bg-[color:var(--ol-green-soft)]",
                      run.status === "failed" && "border-red-200 bg-red-50",
                      run.status === "paused" && "border-amber-200 bg-amber-50",
                      run.status === "canceled" && "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[12.5px] font-black text-[color:var(--ol-ink)]">
                        {run.id.slice(0, 8)}
                      </span>
                      <span className="shrink-0 text-[11px] font-black uppercase text-[color:var(--ol-subtle)]">
                        {workflowRunStatusLabel(run.status, locale)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[color:var(--ol-subtle)]">
                      attempt {run.attempt_count ?? 0}/{run.max_attempts ?? 3} · steps{" "}
                      {run.steps?.length ?? 0}
                    </div>
                    {run.error_message || run.last_worker_error ? (
                      <div className="mt-2 break-words text-[12px] font-bold text-red-700">
                        {run.error_message || run.last_worker_error}
                      </div>
                    ) : null}
                    <RunActions
                      run={run}
                      compact
                      controlBusy={controlBusy}
                      locale={locale}
                      onAction={controlWorkflowRun}
                    />
                    {runResult && runResult.id !== run.id && run.workflow_id === runResult.workflow_id ? (
                      <button
                        type="button"
                        disabled={Boolean(controlBusy)}
                        onClick={() => void compareWithCurrent(run)}
                        className="mt-2 inline-flex h-8 items-center rounded-[11px] border border-[color:var(--ol-line)] bg-white px-2.5 text-[11.5px] font-black text-[color:var(--ol-primary-dark)] hover:border-[color:var(--ol-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {controlBusy === `${run.id}:compare` ? copy.comparing : copy.compareCurrentRun}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function RunActions({
  run,
  compact = false,
  controlBusy,
  locale,
  onAction,
}: {
  run: WorkflowRunResponse;
  compact?: boolean;
  controlBusy: string | null;
  locale: Locale;
  onAction: (
    run: WorkflowRunResponse,
    action: "pause" | "resume" | "cancel" | "retry",
  ) => Promise<void>;
}) {
  const actionLabels = WORKFLOW_COPY[locale].actionLabels;
  const actions: Array<{
    key: "pause" | "resume" | "cancel" | "retry";
    label: string;
    tone: "normal" | "danger";
  }> = [];
  if (run.status === "pending" || run.status === "running") {
    actions.push({ key: "pause", label: actionLabels.pause, tone: "normal" });
    actions.push({ key: "cancel", label: actionLabels.cancel, tone: "danger" });
  } else if (run.status === "paused") {
    actions.push({ key: "resume", label: actionLabels.resume, tone: "normal" });
    actions.push({ key: "cancel", label: actionLabels.cancel, tone: "danger" });
  } else if (run.status === "failed") {
    actions.push({ key: "retry", label: actionLabels.retry, tone: "normal" });
  }

  if (actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "mt-2" : "mt-3")}>
      {actions.map((action) => {
        const busy = controlBusy === `${run.id}:${action.key}`;
        return (
          <button
            key={action.key}
            type="button"
            disabled={Boolean(controlBusy)}
            onClick={() => void onAction(run, action.key)}
            className={cn(
              "inline-flex h-8 items-center rounded-[11px] border px-2.5 text-[11.5px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
              action.tone === "danger"
                ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40",
            )}
          >
            {busy ? actionLabels.processing : action.label}
          </button>
        );
      })}
    </div>
  );
}

function ComparisonPanel({ comparison, locale }: { comparison: WorkflowRunComparison; locale: Locale }) {
  const copy = WORKFLOW_COPY[locale];
  return (
    <div className="mt-4 rounded-[14px] border border-[color:var(--ol-line)] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-primary-dark)]">
            run compare
          </div>
          <div className="mt-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
            {comparison.base_run_id.slice(0, 8)} → {comparison.candidate_run_id.slice(0, 8)}
          </div>
        </div>
        <span className="rounded-full bg-[color:var(--ol-blue-soft)] px-2.5 py-1 text-[11px] font-black text-[color:var(--ol-primary-dark)]">
          {copy.diffNodes(comparison.changed_node_keys.length)}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {comparison.steps.map((step) => (
          <div
            key={step.node_key}
            className={cn(
              "rounded-[12px] px-3 py-2 text-[12px]",
              step.changed
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "bg-[color:var(--ol-soft)] text-[color:var(--ol-muted)]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="truncate text-[color:var(--ol-ink)]">{step.node_key}</strong>
              <span className="font-black uppercase">
                {step.changed ? "changed" : "same"}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-bold">
              {step.base_status || "-"} → {step.candidate_status || "-"}
              {step.run_changed ? " · child run changed" : ""}
              {step.output_changed ? " · output changed" : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[color:var(--ol-soft)] px-3 py-2.5">
      <div className="text-[11px] font-black uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-black text-[color:var(--ol-ink)]">
        {value}
      </div>
    </div>
  );
}
