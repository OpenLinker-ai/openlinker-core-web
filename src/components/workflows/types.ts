export type WorkflowNode = { id?: string; key: string; title: string; agent_id: string; config?: Record<string, unknown> };
export type WorkflowEdge = { from: string; to: string; when?: { path?: unknown[]; op?: string; value?: unknown } };

export type WorkflowDetail = {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[] | null;
  updated_at: string;
  version?: number;
  semantics?: string;
};

export type WorkflowVersionSummary = { id: string; version: number; name: string; node_count: number; current: boolean; created_at: string };

export type WorkflowRunStep = {
  id: string;
  node_key: string;
  run_id?: string;
  status: string;
  output?: Record<string, unknown>;
  error_message?: string;
  attempt: number;
  effective: boolean;
  source: string;
  started_at: string;
  finished_at?: string;
};

export type WorkflowRunNode = { node_key: string; state: string; effective_attempt?: number; skip_reason?: string };

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  status: string;
  output?: Record<string, unknown>;
  error_message?: string;
  steps: WorkflowRunStep[];
  nodes?: WorkflowRunNode[];
  revision?: number;
  workflow_version?: number;
  has_unconfirmed_children?: boolean;
  created_at: string;
  finished_at?: string;
};

export const TERMINAL_WORKFLOW_RUN_STATUSES = new Set(["success", "failed", "canceled"]);
