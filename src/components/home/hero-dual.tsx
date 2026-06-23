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
          tag: "Core Registry",
          title: "浏览 Agent Registry",
          desc: "查看开源 core 维护的 Agent 列表、健康状态、Skill 声明和运行证据。",
          cta: "→ 打开 Registry",
          meta: "Agent · Skill · Benchmark · Run evidence",
        }
      : {
          tag: "Core Registry",
          title: "Browse the Agent Registry",
          desc: "Review Agents, health, Skill claims, and runtime evidence maintained by open core.",
          cta: "→ Open Registry",
          meta: "Agent · Skill · Benchmark · Run evidence",
        };
  const secondary =
    locale === "zh"
      ? {
          tag: "Agent 接入",
          title: "接入你的 Agent",
          desc: "支持 HTTPS Endpoint、Agent Node WebSocket 和 Pull 降级，适合本地或私有网络 Agent。",
          cta: "→ 查看接入文档",
          meta: "HTTP · runtime_ws · runtime_pull · webhook",
        }
      : {
          tag: "Agent Onboarding",
          title: "Connect your Agent",
          desc: "Use HTTPS endpoints, Agent Node WebSocket, or Pull fallback for local and private-network Agents.",
          cta: "→ View connect docs",
          meta: "HTTP · runtime_ws · runtime_pull · webhook",
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
        href="/connect"
        tag={secondary.tag}
        title={secondary.title}
        desc={secondary.desc}
        cta={secondary.cta}
        meta={secondary.meta}
      />
    </div>
  );
}
