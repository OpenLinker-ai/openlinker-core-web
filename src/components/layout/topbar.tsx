/**
 * <Topbar /> —— 顶部统一导航栏。
 *
 * 来自 prototype 的 .topbar：
 *   左：Brand
 *   中：NavTabs
 *   右：右侧 slot（登录态显示用户菜单 / 未登录显示登录按钮）
 *   窄屏：标题行下方保留可横向滚动的 NavTabs，避免关键入口消失
 *
 * Server Component：自己读 session，决定右侧 CTA。
 * 不接受 children；如需自定义右侧，传 rightSlot。
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Brand } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { NavTabs } from "./nav-tabs";
import { UserMenu } from "./user-menu";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n-server";

interface TopbarProps {
  /** 自定义右侧（覆盖默认登录态判断） */
  rightSlot?: ReactNode;
  /** 是否在 max-w 容器内（默认 true，关闭则全宽） */
  contained?: boolean;
  className?: string;
}

interface MeResponse {
  is_admin?: boolean;
  display_name?: string;
}

export async function Topbar({ rightSlot, contained = true, className }: TopbarProps) {
  const session = await auth();
  const locale = await getLocale();
  let isAdmin = false;
  let profileName = session?.user?.name ?? null;
  if (session?.jwt) {
    try {
      const me = await apiFetch<MeResponse>("/api/v1/me", { token: session.jwt });
      isAdmin = Boolean(me.is_admin);
      if (typeof me.display_name === "string") profileName = me.display_name;
    } catch {
      isAdmin = false;
    }
  }

  const right = rightSlot ?? (
    <DefaultRightSlot
      signedIn={Boolean(session)}
      userName={profileName}
      userEmail={session?.user?.email ?? null}
      isAdmin={isAdmin}
      locale={locale}
    />
  );

  return (
    <header
      className={cn(
        "ol-topbar",
        "sticky top-0 z-30 backdrop-blur",
        "border-b border-[color:var(--ol-line)]/60",
        "bg-white/72",
        className,
      )}
    >
      <div
        className={cn(
          "ol-topbar-inner",
          "flex items-center gap-3 py-3 sm:gap-6",
          contained ? "mx-auto max-w-7xl px-4 sm:px-6" : "px-4 sm:px-6",
        )}
      >
        <div className="ol-topbar-brand-slot">
          <Brand locale={locale} />
        </div>
        <div className="ol-topbar-nav-slot hidden min-w-0 md:block">
          <NavTabs locale={locale} />
        </div>
        <div className="ol-topbar-actions flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageToggle locale={locale} />
          {right}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-[color:var(--ol-line)]/60 px-4 pb-3 pt-2 md:hidden">
        <NavTabs locale={locale} className="flex w-max min-w-full justify-start" />
      </div>
    </header>
  );
}

function DefaultRightSlot({
  signedIn,
  userName,
  userEmail,
  isAdmin,
  locale,
}: {
  signedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  locale: Locale;
}) {
  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)] sm:px-4 sm:text-[13px]"
      >
        {locale === "zh" ? "登录" : "Sign in"}
      </Link>
    );
  }

  return (
    <UserMenu
      userName={userName}
      userEmail={userEmail}
      isAdmin={isAdmin}
      locale={locale}
    />
  );
}
