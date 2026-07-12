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
import type { Locale } from "@/lib/i18n";
import { runtimeReasonMessage } from "@/lib/i18n-labels";

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

const API_ERROR_STATUS_COPY: Record<number, Record<Locale, string>> = {
  400: { zh: "请求参数不正确，请检查后重试。", en: "The request is invalid. Check the fields and try again." },
  401: { zh: "登录已过期，请重新登录。", en: "Your session expired. Sign in again." },
  403: { zh: "当前账号没有权限执行此操作。", en: "This account does not have permission for this action." },
  404: { zh: "请求的资源不存在或已不可用。", en: "The requested resource was not found or is no longer available." },
  409: { zh: "当前状态已变化，请刷新后重试。", en: "The state changed. Refresh and try again." },
  422: { zh: "提交内容不符合要求，请检查后重试。", en: "The submitted content is invalid. Check it and try again." },
  429: { zh: "操作过于频繁，请稍后再试。", en: "Too many requests. Try again later." },
  500: { zh: "服务暂时不可用，请稍后再试。", en: "The service is temporarily unavailable. Try again later." },
  502: { zh: "上游服务暂时不可用，请稍后再试。", en: "The upstream service is temporarily unavailable. Try again later." },
  503: { zh: "服务正在维护或暂时不可用，请稍后再试。", en: "The service is unavailable. Try again later." },
  504: { zh: "请求超时，请稍后再试。", en: "The request timed out. Try again later." },
};

const API_ERROR_CODE_COPY: Record<string, Record<Locale, string>> = {
  INSUFFICIENT_BALANCE: { zh: "当前调用未获执行授权，请联系实例运营方检查调用策略。", en: "This invocation was not authorized. Ask the instance operator to review the invocation policy." },
  RATE_LIMITED: { zh: "请求过于频繁，请稍后再试。", en: "Too many requests. Try again later." },
  TOO_MANY_KEYS: { zh: "User Token 数量已达上限，请通过签发该 Token 的管理入口处理旧 Token，或联系实例运营方。", en: "The User Token limit has been reached. Manage older tokens through the issuing system or contact the instance operator." },
  VALIDATION_ERROR: { zh: "提交内容不符合要求，请检查后重试。", en: "The submitted content is invalid. Check it and try again." },
};

function normalizeApiErrorCode(code: string): string {
  return code.trim().replaceAll("-", "_").toUpperCase();
}

function messageMatchesLocale(message: string, locale: Locale): boolean {
  const hasChinese = /[\p{Script=Han}]/u.test(message);
  return locale === "zh" ? hasChinese : !hasChinese;
}

export function localizedErrorMessage(error: unknown, locale: Locale, fallback: string): string {
  if (error instanceof ApiError) {
    const byCode = API_ERROR_CODE_COPY[normalizeApiErrorCode(error.code)]?.[locale];
    if (byCode) return byCode;

    const runtimeMessage = runtimeReasonMessage(error.code, locale);
    if (runtimeMessage) return runtimeMessage;

    const trimmed = error.message.trim();
    if (trimmed && !/^HTTP \d{3}$/.test(trimmed) && messageMatchesLocale(trimmed, locale)) {
      return trimmed;
    }

    return API_ERROR_STATUS_COPY[error.status]?.[locale] ?? fallback;
  }

  if (error instanceof TypeError) {
    return locale === "zh"
      ? "无法连接服务，请检查网络或稍后再试。"
      : "Cannot reach the service. Check the network or try again later.";
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (trimmed && messageMatchesLocale(trimmed, locale)) return trimmed;
  }

  return fallback;
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

export async function apiFetchAuthedWithFallback<T = unknown>(
  path: string,
  fallback: T,
  opts: Omit<FetchOptions, "token" | "signal"> & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 3000, ...fetchOpts } = opts;
  if (timeoutMs <= 0) {
    return apiFetchAuthed<T>(path, fetchOpts).catch(() => fallback);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiFetchAuthed<T>(path, { ...fetchOpts, signal: controller.signal });
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
