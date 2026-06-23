"use client";

/**
 * Google OAuth 按钮。
 *
 * 点击后直接 full-page redirect 到后端 /api/v1/auth/google，由后端发起
 * OAuth 流程；后端处理完成后 redirect 回前端 /auth/callback?code=xxx。
 */

import { Button } from "@/components/ui/button";
import { useClientLocale } from "@/hooks/use-client-locale";
import { getApiBaseUrl } from "@/lib/api-root";

type Props = {
  /** signin 显示"用 Google 登录"，signup 显示"用 Google 注册" */
  mode?: "signin" | "signup";
  disabled?: boolean;
};

export function GoogleOAuthButton({ mode = "signin", disabled }: Props) {
  const locale = useClientLocale();
  const handleClick = () => {
    const apiUrl = getApiBaseUrl();
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      className="w-full"
    >
      <GoogleIcon className="mr-2 size-4" />
      {locale === "zh"
        ? `用 Google ${mode === "signin" ? "登录" : "注册"}`
        : `${mode === "signin" ? "Sign in" : "Sign up"} with Google`}
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.37-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
