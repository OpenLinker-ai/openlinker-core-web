export function validateRuntimeOrigin(value: unknown): string | null;
export function runtimeOriginFromDiscovery(value: unknown): string | null;
export function probeRuntimeIngress(
  origin: string,
  options?: { timeoutMs?: number },
): Promise<boolean>;
