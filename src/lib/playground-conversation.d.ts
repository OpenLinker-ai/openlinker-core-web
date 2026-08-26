export interface PlaygroundA2AContext {
  protocol_context_id: string;
  root_context_id: string;
  protocol_task_id: string;
  parent_task_id?: string;
  parent_run_id?: string;
  reference_task_ids?: string[];
  source: "a2a_protocol";
}

export interface PlaygroundA2APredecessor {
  taskID: string;
  runID: string;
}

export function playgroundA2AContext(
  conversationID: string,
  turnID: string,
  predecessor?: PlaygroundA2APredecessor | null,
): PlaygroundA2AContext;

export function playgroundRunInput(
  input: unknown,
  history: readonly unknown[],
  taskBacked: boolean,
  inputSchema?: Record<string, unknown>,
): unknown;
