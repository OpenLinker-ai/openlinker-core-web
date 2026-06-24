"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Brand } from "@/components/layout/brand";
import { NavTabs } from "@/components/layout/nav-tabs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="ol-topbar sticky top-0 z-30 border-b border-[color:var(--ol-line)]/60 bg-white/72 backdrop-blur">
        <div className="ol-topbar-inner mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <div className="ol-topbar-brand-slot">
            <Brand locale="zh" />
          </div>
          <div className="ol-topbar-nav-slot hidden min-w-0 md:block">
            <NavTabs locale="zh" />
          </div>
          <div className="ol-topbar-actions flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--ol-primary)] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[color:var(--ol-primary-dark)] sm:px-4 sm:text-[13px]"
            >
              登录
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-[color:var(--ol-line)]/60 px-4 pb-3 pt-2 md:hidden">
          <NavTabs locale="zh" className="flex w-max min-w-full justify-start" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="ol-breadcrumb">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <span className="current">页面错误</span>
        </div>

        <div className="ol-page-head">
          <div className="ol-page-title">
            <div className="ol-kicker">page error</div>
            <h1>页面暂时无法加载</h1>
            <p>当前数据源或会话状态不可用。页面外壳保持一致，你可以重试或回到 Registry。</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="ol-mini-btn ol-mini-btn-primary">
            重试
          </button>
          <Link href="/registry" className="ol-mini-btn">
            打开 Registry
          </Link>
        </div>
      </main>
    </>
  );
}
