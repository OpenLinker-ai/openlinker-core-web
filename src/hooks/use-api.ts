"use client";

/**
 * Client Component 专用：把当前会话里的 JWT 自动注入 apiFetch。
 *
 * 用法：
 *   "use client";
 *   const { fetch } = useApi();
 *   const { data } = useQuery({
 *     queryKey: ["agents"],
 *     queryFn: () => fetch<{ items: Agent[] }>("/api/v1/agents"),
 *   });
 *
 * Server Component 不要用此 hook，请用 `apiFetchAuthed`。
 */

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { apiFetch, type FetchOptions } from "@/lib/api";

export function useApi() {
  const { data: session, status } = useSession();
  const token = session?.jwt;

  const fetch = useCallback(
    <T = unknown>(
      path: string,
      opts: Omit<FetchOptions, "token"> = {},
    ): Promise<T> => apiFetch<T>(path, { ...opts, token }),
    [token],
  );

  return {
    fetch,
    token,
    isAuthenticated: !!token,
    isLoading: status === "loading",
    status,
  };
}
