"use client";

/**
 * 让 client component 简单拿到当前用户。
 *
 * 用法：
 *   "use client";
 *   const { user, isAuthenticated, isLoading } = useCurrentUser();
 *   if (isLoading) return <Skeleton />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *   return <p>你好 {user?.name}</p>;
 *
 * Server Component 不要用，请直接 `await auth()`。
 */

import { useSession } from "next-auth/react";

export function useCurrentUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    jwt: session?.jwt,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
}
