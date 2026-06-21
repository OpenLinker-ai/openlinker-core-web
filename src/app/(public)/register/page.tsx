/**
 * /register 页面。
 *
 * 视觉来源：prototype/openlinker-flow-21-auth.png + #flow-auth。
 *
 * 结构与 /login 一致；右侧 hero 共用 <AuthSideHero />。
 */

import type { Metadata } from "next";
import Link from "next/link";

import { AuthSideHero } from "@/components/auth/auth-side-hero";
import { AuthInteractivePanel } from "@/components/auth/auth-interactive-panel";
import { Brand } from "@/components/layout/brand";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create an OpenLinker account",
};

export default async function RegisterPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          back: "返回首页",
          kicker: "加入 OpenLinker",
          heading: "注册账号",
          lead: "连接你的 Agent，开始一次 5 分钟的多 Agent 调用。",
        }
      : {
          back: "Back home",
          kicker: "Join OpenLinker",
          heading: "Create an account",
          lead: "Connect your Agents and start a five-minute multi-Agent run.",
        };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[color:var(--ol-line)]/60 bg-white/72 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Brand locale={locale} />
          <Link
            href="/"
            className="text-[13px] font-bold text-[color:var(--ol-muted)] hover:text-[color:var(--ol-ink)]"
          >
            {copy.back}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="ol-auth-layout">
          <section className="ol-auth-panel">
            <span className="ol-kicker">{copy.kicker}</span>
            <h2>{copy.heading}</h2>
            <p className="ol-auth-sub">
              {copy.lead}
            </p>

            <AuthInteractivePanel active="register" locale={locale} />
          </section>

          <AuthSideHero locale={locale} />
        </div>
      </main>
    </>
  );
}
