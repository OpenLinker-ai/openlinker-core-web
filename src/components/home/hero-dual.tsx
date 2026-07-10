/**
 * <HeroDual /> —— 首页 hero 双卡区块。
 *
 * Core 版首页只保留开源 registry 与 Agent 接入入口。
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

interface HomeCardProps {
  href: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  meta: string;
}

function HomeCard({ href, tag, title, desc, cta, meta }: HomeCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[22px] border border-[color:var(--ol-line)] bg-white px-6 py-5 transition hover:border-[color:var(--ol-primary)]/40 hover:shadow-[0_18px_40px_-22px_rgba(15,145,135,0.35)]"
    >
      <span className="inline-block rounded-md bg-[color:var(--ol-mint)] px-2 py-[3px] text-[10.5px] font-black uppercase tracking-[0.04em] text-[color:var(--ol-primary-dark)]">
        {tag}
      </span>
      <h3 className="mt-2 text-[22px] font-black leading-tight text-[color:var(--ol-ink)]">
        {title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
        {desc}
      </p>
      <span className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--ol-primary)] px-4 py-2.5 text-[13px] font-black text-white transition group-hover:bg-[color:var(--ol-primary-dark)]">
        {cta}
      </span>
      <div className="mt-2.5 text-[11.5px] text-[color:var(--ol-subtle)]">
        {meta}
      </div>
    </Link>
  );
}

export function HeroDual({ locale = "zh" }: { locale?: Locale }) {
  const primary =
    locale === "zh"
      ? {
          tag: "当前实例 · Agent 库",
          title: "浏览已登记的 Agent",
          desc: "查看当前实例公开登记的 Agent、Skill 声明、可调用状态和运行证据。",
          cta: "→ 打开 Agent 库",
          meta: "当前实例 · Agent · Skill · 运行证据",
        }
      : {
          tag: "This instance · Registry",
          title: "Browse the Agent Registry",
          desc: "Explore Agents registered with this instance, including Skill claims, callability, and run evidence.",
          cta: "→ Open Registry",
          meta: "This instance · Agent · Skill · Run evidence",
        };
  const secondary =
    locale === "zh"
      ? {
          tag: "Agent 接入",
          title: "接入你的 Agent",
          desc: "选择直连 HTTP、MCP Server、Agent Node WebSocket 或 Pull，把本地或私有网络中的 Agent 接到当前实例。",
          cta: "→ 接入 Agent",
          meta: "direct_http · mcp_server · runtime_ws · runtime_pull",
        }
      : {
          tag: "Agent connection",
          title: "Connect your Agent",
          desc: "Use direct HTTP, MCP Server, Agent Node WebSocket, or Pull to connect Agents running locally or on private networks.",
          cta: "→ Connect Agent",
          meta: "direct_http · mcp_server · runtime_ws · runtime_pull",
        };

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <HomeCard
        href="/registry"
        tag={primary.tag}
        title={primary.title}
        desc={primary.desc}
        cta={primary.cta}
        meta={primary.meta}
      />
      <HomeCard
        href="/publish"
        tag={secondary.tag}
        title={secondary.title}
        desc={secondary.desc}
        cta={secondary.cta}
        meta={secondary.meta}
      />
    </div>
  );
}
