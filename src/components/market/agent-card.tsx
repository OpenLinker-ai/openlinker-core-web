/**
 * Agent 库列表项。
 *
 * 视觉来自 prototype/openlinker-flow-07-market.png 的 .agent-card：
 *   - 宽容器为图标 / 文案 / meta 三列，窄容器把 meta 移到第二行
 *   - active 卡（仅父组件传 active 时）淡绿渐变背景
 *   - tag 用 .ol-chip / .ol-chip-green / .ol-chip-blue / .ol-chip-amber 区分
 *   - price_per_call_cents 只作外部系统兼容元数据，不参与 Core 结算
 *   - 评分接口暂无，仅显示真实调用次数 total_calls
 *
 * "调用" 只给 readiness.callable=true 的 Agent 展示。
 */
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import {
  availabilityStatusHint,
  availabilityStatusLabel,
} from "@/lib/i18n-labels";
import { avatarFromSlug } from "./avatar";

type AvailabilityStatus = "unknown" | "healthy" | "degraded" | "unreachable" | string;

interface AgentCardProps {
  agent: {
    slug: string;
    name: string;
    description: string;
    price_per_call_cents: number;
    tags: string[];
    skills?: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
    total_calls: number;
    creator: { display_name: string };
    availability?: {
      status: AvailabilityStatus;
      label?: string;
      hint?: string;
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

/** 把 cents 转成参考价格；0 表示未设置。 */
function formatReferencePrice(cents: number, locale: Locale): string | null {
  if (!cents || cents <= 0) return null;
  const dollars = cents / 100;
  const amount = dollars < 0.01 ? dollars.toFixed(3) : dollars.toFixed(2);
  return locale === "zh" ? `$${amount}/次` : `$${amount}/call`;
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
  const referencePrice = formatReferencePrice(agent.price_per_call_cents, locale);
  const availabilityStatus = agent.availability?.status ?? "unknown";
  const availabilityLabel = availabilityStatusLabel(availabilityStatus, locale, agent.availability?.label);
  const availabilityHint = availabilityStatusHint(availabilityStatus, locale, agent.availability?.hint);
  const callable = agent.readiness?.callable ?? availabilityStatus === "healthy";
  const copy =
    locale === "zh"
      ? {
          referencePrice: (price: string) => `参考价 ${price}`,
          noReferencePrice: "未标注参考价",
          referenceHint: "可选兼容元数据，Core 不据此扣费",
          callUnit: { one: "次调用", other: "次调用" },
          detail: "查看详情",
          try: "调用",
          waiting: "暂不可调用",
        }
      : {
          referencePrice: (price: string) => `Reference price ${price}`,
          noReferencePrice: "No reference price",
          referenceHint: "Optional compatibility metadata; Core does not use it for billing",
          callUnit: { one: "call", other: "calls" },
          detail: "View details",
          try: "Run",
          waiting: "Not callable",
        };
  const referencePriceLabel = referencePrice
    ? copy.referencePrice(referencePrice)
    : copy.noReferencePrice;

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
        {(agent.skills?.length ?? 0) > 0 ? (
          <div className="ol-agent-tags">
            {agent.skills?.slice(0, 3).map((skill) => (
              <span
                key={skill.id}
                className="ol-chip ol-chip-mint ol-agent-tag"
                title={skill.description ? `${skill.name} — ${skill.description}` : skill.name}
              >
                <span className="ol-agent-tag-label">{skill.name}</span>
              </span>
            ))}
          </div>
        ) : agent.tags.length > 0 ? (
          <div className="ol-agent-tags">
            {agent.tags.slice(0, 3).map((tag, i) => (
              <span
                key={tag}
                className={`ol-chip ol-agent-tag ${tagColor(tag, i)}`}
                title={tag}
              >
                <span className="ol-agent-tag-label">{tag}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ol-agent-meta">
        <div
          className="ol-price"
          title={copy.referenceHint}
          aria-label={`${referencePriceLabel}. ${copy.referenceHint}`}
        >
          {referencePriceLabel}
        </div>
        <div className="ol-meta-sub">
          {formatCalls(agent.total_calls)} {copy.callUnit[agent.total_calls === 1 ? "one" : "other"]}
        </div>
        <span
          className={`ol-chip ${availabilityChipClass(availabilityStatus)}`}
          title={availabilityHint}
        >
          {availabilityLabel}
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
              title={availabilityHint}
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
