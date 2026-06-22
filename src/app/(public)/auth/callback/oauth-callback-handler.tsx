"use client";

/**
 * Google OAuth 回调处理。
 *
 * 后端在 /api/v1/auth/google/callback 处理完毕后，会 redirect 到：
 *   FRONTEND_URL/auth/callback?token=<jwt>
 * 或失败：
 *   FRONTEND_URL/auth/callback?error=<code>
 *
 * 前端拿到 token 后调用 NextAuth 的 token-credentials provider
 * 把 session 接管。signIn 成功后跳到 / （或来源页）。
 */

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { safeAuthCallback } from "@/components/auth/callback-url";
import { useClientLocale } from "@/hooks/use-client-locale";

export function OAuthCallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const locale = useClientLocale();
  const copy =
    locale === "zh"
      ? {
          googleFailed: "Google 登录失败",
          missingToken: "缺少登录令牌",
          sessionFailed: "登录会话建立失败",
          success: "登录成功",
          retryLater: "登录失败，请稍后重试",
          returning: "登录失败，正在返回登录页…",
          completing: "正在完成登录…",
        }
      : {
          googleFailed: "Google sign-in failed",
          missingToken: "Missing sign-in token",
          sessionFailed: "Unable to establish the sign-in session",
          success: "Signed in",
          retryLater: "Sign-in failed. Try again later.",
          returning: "Sign-in failed. Returning to the sign-in page…",
          completing: "Completing sign-in…",
        };
  const [status, setStatus] = useState<"pending" | "error">("pending");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get("token");
    const error = params.get("error");
    const callbackUrl = safeAuthCallback(params.get("callbackUrl"));

    const fail = (msg: string) => {
      toast.error(msg);
      setStatus("error");
      router.replace("/login");
    };

    if (error) {
      fail(decodeURIComponent(error) || copy.googleFailed);
      return;
    }

    if (!token) {
      fail(copy.missingToken);
      return;
    }

    (async () => {
      try {
        const res = await signIn("token-credentials", {
          token,
          redirect: false,
        });
        if (!res || res.error) {
          fail(copy.sessionFailed);
          return;
        }
        toast.success(copy.success);
        router.replace(callbackUrl);
        router.refresh();
      } catch {
        fail(copy.retryLater);
      }
    })();
  }, [copy.googleFailed, copy.missingToken, copy.retryLater, copy.sessionFailed, copy.success, params, router]);

  if (status === "error") {
    return (
      <p className="text-sm text-muted-foreground">{copy.returning}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{copy.completing}</p>
    </div>
  );
}
