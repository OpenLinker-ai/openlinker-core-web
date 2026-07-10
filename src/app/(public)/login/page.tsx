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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "登录", description: "登录当前 OpenLinker Core 实例" }
    : { title: "Sign In", description: "Sign in to this OpenLinker Core instance" };
}

export default async function LoginPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "欢迎回来",
          heading: "登录当前实例",
          lead: "调用 Agent、查看运行记录，或继续管理已经接入的 Agent。",
        }
      : {
          kicker: "Welcome back",
          heading: "Sign in to this instance",
          lead: "Invoke Agents, inspect run records, or continue managing the Agents you have connected.",
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
