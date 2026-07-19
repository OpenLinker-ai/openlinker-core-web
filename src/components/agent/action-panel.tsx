/**
 * Agent 详情页右侧 action-card：开始使用 / API 示例 / 外部参考价格元数据。
 *
 * 视觉对照原型 .action-card：
 *   - 头部 "开始使用" + 4 按钮
 *   - 「在线试用」只在 readiness.callable=true 时展示，走 TryButton（Client，处理登录态跳转）
 *   - 「获取 API」滚动到下方 API 示例锚点（用 anchor 简单实现）
 *   - 下方 API 示例区，复用 ApiSnippet（保留 3 tab）
 *   - 外部参考价格：黄色 info-card，明确 price_per_call_cents 是可选兼容元数据
 *
 * Server Component（内嵌 client 子组件 TryButton / ApiSnippet）。
 */

import Link from "next/link";

import { ApiSnippet } from "./api-snippet";
import { TryButton } from "./try-button";
import type { Locale } from "@/lib/i18n";
import { getPublicApiBaseUrl } from "@/lib/api-root";

interface ActionPanelProps {
  agentID: string;
  slug: string;
  pricePerCallCents: number;
  callable?: boolean;
  availabilityHint?: string;
  sampleInput?: Record<string, unknown>;
  locale?: Locale;
}

export function ActionPanel({
  agentID,
  slug,
  pricePerCallCents,
  callable = false,
  availabilityHint,
  sampleInput,
  locale = "zh",
}: ActionPanelProps) {
  const registryPrice = formatRegistryPrice(pricePerCallCents, locale);
  const apiBaseUrl = getPublicApiBaseUrl();
  const copy =
    locale === "zh"
      ? {
          start: "开始使用",
          unavailableTitle: availabilityHint || "该 Agent 当前暂不可试用。",
          unavailable: "暂不可试用",
          unavailableBody: availabilityHint || "需要最近一次健康检查或成功运行记录后才开放直接试用。",
          api: "获取 API",
          apiExample: "API 示例",
          related: "关联入口",
          mcpApi: "MCP/API 接入",
          a2aChains: "A2A 调用链",
          registryPrice: "外部参考价格（兼容元数据）",
          priceBody: registryPrice
            ? `Agent 资料提供的外部参考价格为 ${registryPrice}。这是可选兼容元数据，OpenLinker Core 不会据此扣费或结算。`
            : "Agent 未提供外部参考价格。该字段为可选兼容元数据，OpenLinker Core 不会据此扣费或结算。",
        }
      : {
          start: "Start Using",
          unavailableTitle: availabilityHint || "This Agent is not available for a trial yet.",
          unavailable: "Not callable yet",
          unavailableBody: availabilityHint || "A trial becomes available after a successful health check or run.",
          api: "Get API",
          apiExample: "API Example",
          related: "Related Entry Points",
          mcpApi: "MCP/API setup",
          a2aChains: "A2A call chains",
          registryPrice: "External reference price (compatibility metadata)",
          priceBody: registryPrice
            ? `The Agent profile provides an external reference price of ${registryPrice}. This is optional compatibility metadata and does not trigger charging or settlement in OpenLinker Core.`
            : "The Agent does not provide an external reference price. This field is optional compatibility metadata and does not trigger charging or settlement in OpenLinker Core.",
        };

  return (
    <aside className="flex min-w-0 flex-col gap-3 overflow-hidden">
      {/* 开始使用 */}
      <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.start}
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {callable ? (
            <TryButton slug={slug} locale={locale} />
          ) : (
            <button
              type="button"
              disabled
              title={copy.unavailableTitle}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[color:var(--ol-amber-soft)] px-4 text-[13px] font-bold text-[color:var(--ol-amber)] opacity-90 cursor-not-allowed"
            >
              {copy.unavailable}
            </button>
          )}
          {!callable ? (
            <p className="break-words rounded-xl bg-[color:var(--ol-soft)] px-3 py-2 text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
              {copy.unavailableBody}
            </p>
          ) : null}
          <a
            href="#api-snippet"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-bold text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.api}
          </a>
        </div>
      </div>

      {/* API 示例 */}
      <div id="api-snippet" className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.apiExample}
        </h3>
        <div className="mt-3 min-w-0">
          <ApiSnippet
            agentID={agentID}
            slug={slug}
            sampleInput={sampleInput}
            apiBaseUrl={apiBaseUrl}
            locale={locale}
          />
        </div>
      </div>

      <div className="ol-panel ol-panel-pad min-w-0 overflow-hidden">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.related}
        </h3>
        <div className="mt-3 grid gap-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
          <Link href="/connect" className="ol-mini-btn justify-center">
            {copy.mcpApi}
          </Link>
          <Link href="/a2a" className="ol-mini-btn justify-center">
            {copy.a2aChains}
          </Link>
        </div>
      </div>

      {/* 外部参考价格兼容元数据（黄色 info-card） */}
      <div
        className="min-w-0 overflow-hidden rounded-2xl border px-4 py-3"
        style={{
          background: "var(--ol-amber-soft)",
          borderColor: "rgba(200, 131, 13, 0.18)",
        }}
      >
        <strong className="block text-[13px] font-black text-[color:var(--ol-amber)]">
          {copy.registryPrice}
        </strong>
        <span className="mt-1 block break-words text-[12.5px] font-semibold text-[color:var(--ol-ink)]">
          {copy.priceBody}
        </span>
      </div>
    </aside>
  );
}

function formatRegistryPrice(cents: number, locale: Locale): string | null {
  if (!cents || cents <= 0) return null;
  const dollars = cents / 100;
  const amount = dollars < 0.01 ? dollars.toFixed(3) : dollars.toFixed(2);
  return locale === "zh" ? `$${amount}/次` : `$${amount}/invocation`;
}
