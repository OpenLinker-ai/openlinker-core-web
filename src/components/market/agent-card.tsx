/**
 * Registry 列表项（横排卡片）。
 *
 * 视觉来自 prototype/openlinker-flow-07-market.png 的 .agent-card：
 *   - 3 列布局：app-icon (48px) / agent-copy / meta (170px)
 *   - active 卡（仅父组件传 active 时）淡绿渐变背景
 *   - tag 用 .ol-chip / .ol-chip-green / .ol-chip-blue / .ol-chip-amber 区分
 *   - 价格按 cents：0 = 免费 / 显示 $x.yyy/次
 *   - 评分接口暂无 → 仅显示调用次数 total_calls，按 prompt 要求不杜撰
 *
 * "试用" 只给 readiness.callable=true 的 Agent 展示。
 */
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { avatarFromSlug } from "./avatar";

type AvailabilityStatus = "unknown" | "healthy" | "degraded" | "unreachable";

interface AgentCardProps {
  agent: {
    slug: string;
    name: string;
    description: string;
    price_per_call_cents: number;
    tags: string[];
    total_calls: number;
    creator: { display_name: string };
    availability?: {
      status: AvailabilityStatus;
      label: string;
      hint: string;
      consecutive_failures: number;
    };
    readiness?: {
      callable: boolean;
      verified?: boolean;
      certified?: boolean;
    };
  };
  active?: boolean;
  locale?: Locale;
}

/** 把 cents → 展示文案。0 视为免费。*/
function formatPrice(cents: number, locale: Locale): { text: string; free: boolean } {
  if (!cents || cents <= 0) return { text: locale === "zh" ? "免费" : "Free", free: true };
  const dollars = cents / 100;
  const suffix = locale === "zh" ? "/次" : "/run";
  if (dollars < 0.01) return { text: `$${dollars.toFixed(3)}${suffix}`, free: false };
  if (dollars < 1) return { text: `$${dollars.toFixed(2)}${suffix}`, free: false };
  return { text: `$${dollars.toFixed(2)}${suffix}`, free: false };
}

/** 把 total_calls → 缩写（1.2k / 31k / 1.2M），用于 meta 行。*/
function formatCalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

/** 每个 tag 跟一个色调走，避免一片灰。 */
function tagColor(tag: string, idx: number): string {
  const lower = tag.toLowerCase();
  if (/(在线|试用|free|免费|审核)/.test(lower)) return "ol-chip-green";
  if (/(a2a|mcp|oauth|api)/.test(lower)) return "ol-chip-blue";
  if (/(beta|预览|实验)/.test(lower)) return "ol-chip-amber";
  // 兜底：按索引轮转
  const palette = ["", "ol-chip-blue", "ol-chip-amber", "ol-chip-green"];
  return palette[idx % palette.length];
}

export function AgentCard({ agent, active = false, locale = "zh" }: AgentCardProps) {
  const avatar = avatarFromSlug(agent.slug);
  const price = formatPrice(agent.price_per_call_cents, locale);
  const availability = agent.availability ?? {
    status: "unknown" as const,
    label: locale === "zh" ? "未验证" : "Unverified",
    hint: locale === "zh" ? "Agent 还没有真实运行记录。" : "This Agent does not have real run evidence yet.",
    consecutive_failures: 0,
  };
  const callable = agent.readiness?.callable ?? availability.status === "healthy";
  const copy =
    locale === "zh"
      ? { calls: "次调用", detail: "详情", try: "试用", waiting: "等待可用" }
      : { calls: "calls", detail: "Details", try: "Try", waiting: "Waiting" };

  return (
    <article className={`ol-agent-card${active ? " active" : ""}`}>
      <div className="ol-app-icon" style={{ background: avatar.color }}>
        {avatar.initials}
      </div>

      <div className="ol-agent-copy">
        <h3>
          <Link
            href={`/agents/${agent.slug}`}
            className="hover:text-[color:var(--ol-primary-dark)]"
          >
            {agent.name}
          </Link>
        </h3>
        <p>{agent.description}</p>
        {agent.tags.length > 0 && (
          <div className="ol-agent-tags">
            {agent.tags.slice(0, 3).map((tag, i) => (
              <span key={tag} className={`ol-chip ${tagColor(tag, i)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ol-agent-meta">
        <div className={`ol-price${price.free ? " free" : ""}`}>
          {price.text}
        </div>
        <div className="ol-meta-sub">
          {formatCalls(agent.total_calls)} {copy.calls}
        </div>
        <span
          className={`ol-chip ${availabilityChipClass(availability.status)}`}
          title={availability.hint}
        >
          {availability.label}
        </span>
        <div className="ol-meta-actions">
          <Link href={`/agents/${agent.slug}`} className="ol-mini-btn">
            {copy.detail}
          </Link>
          {callable ? (
            <Link
              href={`/playground/${agent.slug}`}
              className="ol-mini-btn ol-mini-btn-primary"
            >
              {copy.try}
            </Link>
          ) : (
            <span
              className="ol-mini-btn cursor-not-allowed opacity-60"
              title={availability.hint}
            >
              {copy.waiting}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function availabilityChipClass(status: AvailabilityStatus) {
  if (status === "healthy") return "ol-chip-green";
  if (status === "degraded") return "ol-chip-amber";
  if (status === "unreachable") return "ol-chip-amber";
  return "";
}
