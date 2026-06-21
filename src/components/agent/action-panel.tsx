/**
 * Agent 详情页右侧 action-card：开始使用 / API 示例 / 未来价格参考。
 *
 * 视觉对照原型 .action-card：
 *   - 头部 "开始使用" + 4 按钮
 *   - 「在线试用」只在 readiness.callable=true 时展示，走 TryButton（Client，处理登录态跳转）
 *   - 「打开工作流」跳到已上线的工作流编排页
 *   - 「部署/租用」属于后续计划能力，保持不可用
 *   - 「获取 API」滚动到下方 API 示例锚点（用 anchor 简单实现）
 *   - 下方 API 示例区，复用 ApiSnippet（保留 3 tab）
 *   - 未来价格参考：黄色 info-card，根据 price_per_call_cents × 1000 估算，不代表当前扣费
 *
 * Server Component（内嵌 client 子组件 TryButton / ApiSnippet）。
 */

import Link from "next/link";

import { ApiSnippet } from "./api-snippet";
import { TryButton } from "./try-button";
import type { Locale } from "@/lib/i18n";

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
  // 1,000 次/月未来价格参考（cents → USD）
  const monthlyEstimate = ((pricePerCallCents * 1000) / 100).toFixed(2);
  const copy =
    locale === "zh"
      ? {
          start: "开始使用",
          unavailableTitle: availabilityHint || "该 Agent 当前缺少可调用证据。",
          unavailable: "暂不可试用",
          unavailableBody: availabilityHint || "需要最近一次健康检查或成功运行记录后才开放直接试用。",
          workflow: "打开工作流",
          api: "获取 API",
          task: "发布任务匹配 Agent",
          apiExample: "API 示例",
          related: "关联入口",
          futurePrice: "展示价格参考",
          priceBody: `当前免费；1,000 次/月展示价约 $${monthlyEstimate}`,
        }
      : {
          start: "Start Using",
          unavailableTitle: availabilityHint || "This Agent does not have callable evidence yet.",
          unavailable: "Not callable yet",
          unavailableBody: availabilityHint || "Direct trial opens after a recent health check or successful run record.",
          workflow: "Open workflow",
          api: "Get API",
          task: "Post task to match Agent",
          apiExample: "API Example",
          related: "Related Entry Points",
          futurePrice: "Display price reference",
          priceBody: `Current runs are free. Display price for 1,000 runs/month is about $${monthlyEstimate}.`,
        };

  return (
    <aside className="flex flex-col gap-3">
      {/* 开始使用 */}
      <div className="ol-panel ol-panel-pad">
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
            <p className="rounded-xl bg-[color:var(--ol-soft)] px-3 py-2 text-[12px] font-semibold leading-5 text-[color:var(--ol-muted)]">
              {copy.unavailableBody}
            </p>
          ) : null}
          <a
            href="/workflow"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[color:var(--ol-blue-soft)] px-4 text-[13px] font-bold text-[color:var(--ol-blue)] hover:bg-[color:var(--ol-blue-soft)]/80"
          >
            {copy.workflow}
          </a>
          <a
            href="#api-snippet"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-bold text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.api}
          </a>
          <Link
            href="/task"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[color:var(--ol-line)] bg-white px-4 text-[13px] font-bold text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-soft)]"
          >
            {copy.task}
          </Link>
        </div>
      </div>

      {/* API 示例 */}
      <div id="api-snippet" className="ol-panel ol-panel-pad">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.apiExample}
        </h3>
        <div className="mt-3">
          <ApiSnippet agentID={agentID} slug={slug} sampleInput={sampleInput} locale={locale} />
        </div>
      </div>

      <div className="ol-panel ol-panel-pad">
        <h3 className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.related}
        </h3>
        <div className="mt-3 grid gap-2 text-[12.5px] font-semibold leading-5 text-[color:var(--ol-muted)]">
          <Link href="/connect" className="ol-mini-btn justify-center">
            MCP/API 接入
          </Link>
          <Link href="/a2a" className="ol-mini-btn justify-center">
            A2A 调用链
          </Link>
        </div>
      </div>

        {/* 未来价格参考（黄色 info-card） */}
      <div
        className="rounded-2xl border px-4 py-3"
        style={{
          background: "var(--ol-amber-soft)",
          borderColor: "rgba(200, 131, 13, 0.18)",
        }}
      >
          <strong className="block text-[13px] font-black text-[color:var(--ol-amber)]">
            {copy.futurePrice}
          </strong>
          <span className="mt-1 block text-[12.5px] font-semibold text-[color:var(--ol-ink)]">
            {copy.priceBody}
          </span>
      </div>
    </aside>
  );
}
