"use client";

/**
 * <AuthTabs /> —— 登录 / 注册切换胶囊。
 *
 * 实际是两个独立路由，用 <Link> 导航；通过 active 显式传当前页。
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { authHref, safeAuthCallback } from "@/components/auth/callback-url";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AuthTabsProps {
  active: "login" | "register";
  locale?: Locale;
}

export function AuthTabs({ active, locale = "zh" }: AuthTabsProps) {
  const searchParams = useSearchParams();
  const callbackUrl = safeAuthCallback(
    searchParams.get("callbackUrl") || searchParams.get("from"),
  );
  const copy =
    locale === "zh"
      ? { login: "登录", register: "注册" }
      : { login: "Sign in", register: "Sign up" };

  return (
    <div className="ol-auth-tabs">
      <Link
        href={authHref("/login", callbackUrl)}
        className={cn(active === "login" && "active")}
      >
        {copy.login}
      </Link>
      <Link
        href={authHref("/register", callbackUrl)}
        className={cn(active === "register" && "active")}
      >
        {copy.register}
      </Link>
    </div>
  );
}
