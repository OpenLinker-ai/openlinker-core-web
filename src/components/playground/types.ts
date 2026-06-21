/**
 * Playground 子组件共享类型。
 * runner.tsx 是状态源，run-trace / result-panel 是只读消费者。
 */

export type RunStatus = "idle" | "running" | "success" | "failed";

export interface RunResult {
  run_id: string;
  status: "running" | "success" | "failed" | "timeout" | "canceled";
  output?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  cost_cents: number;
  duration_ms: number;
}
