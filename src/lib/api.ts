/**
 * 后端 API 客户端封装。
 *
 * - 自动从 NextAuth session 取 JWT，加到 Authorization header
 * - 自动序列化 body 为 JSON
 * - 错误自动 throw，便于上层 try/catch
 *
 * Server Components 直接 await 调用：
 *    const data = await apiFetchAuthed<{ items: Agent[] }>('/api/v1/agents');
 *
 * Client Components 配合 TanStack Query：
 *    const { fetch } = useApi();
 *    useQuery({ queryKey: ['agents'], queryFn: () => fetch('/agents') })
 */

import { getApiBaseUrl, getApiBaseUrlForPath } from "@/lib/api-root";

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized or session expired") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** 显式传入 JWT（Server Components 用，因 RSC 拿不到 NextAuth session） */
  token?: string;
};

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const url = path.startsWith("http") ? path : `${getApiBaseUrlForPath(path, method)}${path}`;

  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type") && opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.token) {
    headers.set("Authorization", `Bearer ${opts.token}`);
  }

  const init: RequestInit = {
    ...opts,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : typeof opts.body === "string"
          ? opts.body
          : JSON.stringify(opts.body),
  };

  const res = await fetch(url, init);

  if (res.status === 204) {
    return undefined as T;
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // 非 JSON 响应
  }

  if (res.ok) {
    return json as T;
  }

  // 错误处理
  const errBody = (json as { error?: { code: string; message: string; details?: unknown } } | null)
    ?.error;

  if (res.status === 401) {
    throw new UnauthorizedError(errBody?.message);
  }

  throw new ApiError(
    res.status,
    errBody?.code ?? "UNKNOWN",
    errBody?.message ?? `HTTP ${res.status}`,
    errBody?.details,
  );
}

/**
 * Server Component 专用：自动从 NextAuth `auth()` 拿 token。
 *
 * 之所以用动态 import 而不是顶层 import，是因为 lib/api.ts 是同构模块
 * （client/server 都会引），而 lib/auth.ts 只能在 server 端运行。
 *
 * 用法：
 *   // app/runs/page.tsx
 *   const data = await apiFetchAuthed<RunListResp>("/api/v1/runs");
 */
export async function apiFetchAuthed<T = unknown>(
  path: string,
  opts: Omit<FetchOptions, "token"> = {},
): Promise<T> {
  const { auth } = await import("./auth");
  const session = await auth();
  return apiFetch<T>(path, { ...opts, token: session?.jwt });
}
