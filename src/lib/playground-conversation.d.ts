export interface PlaygroundA2AContext {
  protocol_context_id: string;
  root_context_id: string;
  protocol_task_id: string;
  source: "a2a_protocol";
}

export function playgroundA2AContext(
  conversationID: string,
  turnID: string,
): PlaygroundA2AContext;

export function playgroundRunInput(
  input: unknown,
  history: readonly unknown[],
  taskBacked: boolean,
): unknown;
