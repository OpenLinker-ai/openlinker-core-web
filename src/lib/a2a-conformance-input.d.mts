export type A2AMessagePart =
  | { kind: "text"; text: string }
  | { kind: "data"; data: Record<string, unknown> };

export function a2aConformanceMessageParts(sample: unknown, agent: unknown): A2AMessagePart[];
