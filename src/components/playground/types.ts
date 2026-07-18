/**
 * Playground 子组件共享类型。
 * runner.tsx 是状态源，run-trace / result-panel 是只读消费者。
 */

export type RunStatus = "idle" | "running" | "success" | "failed";

export interface RunResult {
  run_id: string;
  agent_id?: string;
  agent_slug?: string;
  agent_name?: string;
  agent_connection_mode?: "direct_http" | "mcp_server" | "runtime" | string;
  status: "running" | "success" | "failed" | "timeout" | "canceled";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  cost_cents: number;
  duration_ms: number;
  started_at?: string;
  finished_at?: string | null;
  source?: string;
  runtime_contract_id?: string;
  runtime_transport?: "websocket" | "long_poll" | string;
  runtime_transport_reason?: string;
  runtime_transport_changed_at?: string;
  dispatch_state?: "pending" | "offered" | "executing" | "retry_wait" | "terminal" | "dead_letter" | string;
  attempt_count?: number;
  max_attempts?: number;
  next_attempt_at?: string | null;
  latest_attempt_id?: string;
  active_attempt_id?: string;
  cancel_state?: string | null;
  cancel_requested_at?: string | null;
  cancel_acknowledged_at?: string | null;
  cancel_reason?: string;
  dead_lettered_at?: string | null;
  replay_of_run_id?: string;
  parent_run_id?: string;
  caller_agent_id?: string;
  billing_mode?: string;
  a2a_context?: Record<string, unknown>;
  task_callback?: Record<string, unknown>;
  requirement_evidence?: Record<string, unknown>;
  evidence_summary?: Record<string, unknown>;
  next_action?: Record<string, unknown>;
  replayed: boolean;
}
