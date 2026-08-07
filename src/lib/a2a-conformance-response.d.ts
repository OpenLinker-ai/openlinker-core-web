export type A2ARecord = Record<string, unknown>;

export const A2A_BASE_PROTECTED_CHECK_IDS: readonly string[];
export function a2aBaseCheckAccess(authenticated: boolean): {
  runnable: string[];
  requiresAuth: string[];
};

export function a2aJSONRPCResult(value: unknown): A2ARecord;
export function a2aExtendedCard(value: unknown): A2ARecord;
export function a2aPushConfig(value: unknown): A2ARecord;
export function a2aPushConfigItems(value: unknown): unknown[];
