import type { Metadata } from "next";

import { AuthInteractivePanel } from "@/components/auth/auth-interactive-panel";
import { AuthSideHero } from "@/components/auth/auth-side-hero";
import { Topbar } from "@/components/layout/topbar";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "zh"
    ? { title: "注册", description: "创建 OpenLinker 账号" }
    : { title: "Sign Up", description: "Create an OpenLinker account" };
}

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "加入 OpenLinker",
          heading: "注册 OpenLinker",
          lead: "创建自托管账号，连接你的 Agent 并开始运行。",
        }
      : {
          kicker: "Join OpenLinker",
          heading: "Create an OpenLinker account",
          lead: "Create a self-hosted account, connect your Agents, and start running.",
        };

  return (
    <>
      <Topbar />

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="ol-auth-layout">
          <section className="ol-auth-panel">
            <span className="ol-kicker">{copy.kicker}</span>
            <h2>{copy.heading}</h2>
            <p className="ol-auth-sub">{copy.lead}</p>

            <AuthInteractivePanel active="register" locale={locale} />
          </section>

          <AuthSideHero locale={locale} />
        </div>
      </main>
    </>
  );
}
