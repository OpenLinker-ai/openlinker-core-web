/**
 * <HeroDual /> —— 首页 hero 双卡区块。
 *
 * 来自 prototype 的 .hero-dual：左卡（task / 绿底白字）+ 右卡（market / 白底）。
 *
 * 子轮 2.4 后：左卡的 CTA 内联 <TaskPrompt variant="dark" /> 输入框，
 * 把"AI 推荐"流入口直接做在 hero 里，而不是另起一卡叠在上方。
 * 右卡仍然是"浏览市场"。
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { TaskPrompt } from "./task-prompt";

interface MarketCardProps {
  href: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  meta: string;
}

function TaskCard({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          tag: "推荐 · AI 帮你做事",
          title: "发布任务，让 AI 帮你做",
          desc: "一句话描述你要做的事，优先推荐可运行 Agent；无匹配时给出下一步。",
        }
      : {
          tag: "Match · Agent-assisted work",
          title: "Describe a task, get matched",
          desc: "Tell OpenLinker what you need. It prioritizes callable Agents and gives a next step when there is no match.",
        };

  return (
    <div className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0f9187] to-[#08746d] px-6 py-5 text-white shadow-[0_18px_40px_-18px_rgba(15,145,135,0.55)]">
      <span className="inline-block rounded-md bg-white/22 px-2 py-[3px] text-[10.5px] font-black uppercase tracking-[0.04em] text-white">
        {copy.tag}
      </span>
      <h3 className="mt-2 text-[22px] font-black leading-tight">
        {copy.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/[0.88]">
        {copy.desc}
      </p>
      <TaskPrompt variant="dark" locale={locale} />
    </div>
  );
}

function MarketCard({ href, tag, title, desc, cta, meta }: MarketCardProps) {
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
  const market =
    locale === "zh"
      ? {
          tag: "开发者首选",
          title: "浏览 Agent 市场",
          desc: "按场景筛选可调用 Agent，有运行证据时再进入 Playground 试用。",
          cta: "→ 浏览市场",
          meta: "财务审计 · 代码审查 · 客服编排 · 数据分析 · 内容生成",
        }
      : {
          tag: "Developer-friendly",
          title: "Browse the Agent market",
          desc: "Filter callable Agents by scenario, then try them in Playground once there is runtime evidence.",
          cta: "→ Browse market",
          meta: "Finance review · Code review · Support ops · Data analysis · Content",
        };

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <TaskCard locale={locale} />
      <MarketCard
        href="/market"
        tag={market.tag}
        title={market.title}
        desc={market.desc}
        cta={market.cta}
        meta={market.meta}
      />
    </div>
  );
}
