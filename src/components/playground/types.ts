/**
 * Playground 子组件共享类型。
 * runner.tsx 是状态源，run-trace / result-panel 是只读消费者。
 */

export type RunStatus = "idle" | "running" | "success" | "failed";

export interface RunResult {
  run_id: string;
  status: "running" | "success" | "failed" | "timeout" | "canceled";
  dispatch_state?: "pending" | "offered" | "executing" | "retry_wait" | "terminal" | "dead_letter" | string;
  attempt_count?: number;
  max_attempts?: number;
  next_attempt_at?: string | null;
  cancel_state?: string | null;
  output?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  cost_cents: number;
  duration_ms: number;
  replayed: boolean;
}
