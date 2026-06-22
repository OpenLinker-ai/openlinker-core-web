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
import { auth, signOut } from "@/lib/auth";
import { Brand } from "./brand";
import { LanguageToggle } from "./language-toggle";
import { NavTabs } from "./nav-tabs";
import { Icon } from "@/components/ui/icon";
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

export async function Topbar({ rightSlot, contained = true, className }: TopbarProps) {
  const session = await auth();
  const locale = await getLocale();

  const right = rightSlot ?? (
    <DefaultRightSlot
      signedIn={Boolean(session)}
      userName={session?.user?.name ?? null}
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
  locale,
}: {
  signedIn: boolean;
  userName: string | null;
  locale: Locale;
}) {
  if (!signedIn) {
    return (
      <>
        <Link
          href="/login"
          className="hidden whitespace-nowrap text-[13px] font-bold text-[color:var(--ol-muted)] hover:text-[color:var(--ol-ink)] min-[430px]:inline"
        >
          {locale === "zh" ? "登录" : "Sign in"}
        </Link>
        <Link
          href="/register"
          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)] sm:px-4 sm:text-[13px]"
        >
          {locale === "zh" ? "注册" : "Sign up"}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/hub"
        className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[color:var(--ol-mint)] px-3 text-[13px] font-black text-[color:var(--ol-primary-dark)] hover:bg-[color:var(--ol-primary)] hover:text-white lg:inline-flex"
      >
        <Icon name="bot" size="sm" />
        {locale === "zh" ? "创作者中心" : "Creator Hub"}
      </Link>
      <Link
        href="/settings"
        className="hidden whitespace-nowrap text-[13px] font-bold text-[color:var(--ol-muted)] hover:text-[color:var(--ol-ink)] min-[1500px]:inline-flex min-[1500px]:items-center min-[1500px]:gap-1.5"
      >
        <Icon name="gear" size="sm" />
        {locale === "zh" ? "设置" : "Settings"}
      </Link>
      <Link
        href="/inbox"
        className="hidden whitespace-nowrap text-[13px] font-bold text-[color:var(--ol-muted)] hover:text-[color:var(--ol-ink)] min-[1500px]:inline-flex min-[1500px]:items-center min-[1500px]:gap-1.5"
      >
        <Icon name="bell" size="sm" />
        {locale === "zh" ? "通知" : "Inbox"}
      </Link>
      <Link
        href="/my"
        className="hidden whitespace-nowrap text-[13px] font-bold text-[color:var(--ol-ink)] hover:text-[color:var(--ol-primary-dark)] min-[1500px]:inline"
      >
        {userName ?? (locale === "zh" ? "已登录" : "Signed in")}
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-[color:var(--ol-line)] bg-white px-3 text-[13px] font-bold text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]"
        >
          {locale === "zh" ? "退出" : "Sign out"}
        </button>
      </form>
    </>
  );
}
