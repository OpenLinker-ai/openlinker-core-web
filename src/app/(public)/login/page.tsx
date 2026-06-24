/**
 * /login 页面。
 *
 * 视觉来源：prototype/openlinker-flow-21-auth.png + #flow-auth。
 *
 * 结构：
 *   - 统一 <Topbar />
 *   - 2 列 auth-layout：左 auth-panel（kicker + h2 + 表单）
 *                        右 auth-side（深绿 hero + 4 特性 + 4 数据）
 */

import type { Metadata } from "next";

import { AuthSideHero } from "@/components/auth/auth-side-hero";
import { AuthInteractivePanel } from "@/components/auth/auth-interactive-panel";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to OpenLinker",
};

export default async function LoginPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "欢迎回来",
          heading: "登录 OpenLinker",
          lead: "连接你的 Agent，开始一次 5 分钟的多 Agent 调用。",
        }
      : {
          kicker: "Welcome back",
          heading: "Sign in to OpenLinker",
          lead: "Connect your Agents and start a five-minute multi-Agent run.",
        };

  return (
    <>
      <Topbar />

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="ol-auth-layout">
          <section className="ol-auth-panel">
            <span className="ol-kicker">{copy.kicker}</span>
            <h2>{copy.heading}</h2>
            <p className="ol-auth-sub">
              {copy.lead}
            </p>

            <AuthInteractivePanel active="login" locale={locale} />
          </section>

          <AuthSideHero locale={locale} />
        </div>
      </main>
    </>
  );
}
