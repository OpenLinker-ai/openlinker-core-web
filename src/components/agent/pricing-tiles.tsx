"use client";

/**
 * 发布页右侧"定价方式" 4 tile（免费 / 买断 / 订阅 / 按调用）。
 *
 * Phase 1：运行免费，按调用价格仅作为未来展示字段。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .pricing-grid。
 */

import type { Locale } from "@/lib/i18n";

interface PricingTilesProps {
  /** 表单当前 price_usd（USD，小数）；非数字或 NaN 时显示 $0.00 */
  priceUsd: number;
  locale?: Locale;
}

function formatPrice(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "$0.00";
  if (p < 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(2)}`;
}

export function PricingTiles({ priceUsd, locale = "zh" }: PricingTilesProps) {
  const copy =
    locale === "zh"
      ? {
          free: "免费",
          current: "当前",
          plannedTitle: "后续开放",
          lifetime: "买断",
          subscription: "订阅",
          monthly: "$9/月",
          reservedTitle: "后续计划启用",
          previewPrice: "预留价格",
        }
      : {
          free: "Free",
          current: "Current",
          plannedTitle: "Planned later",
          lifetime: "Lifetime",
          subscription: "Subscription",
          monthly: "$9/mo",
          reservedTitle: "Enabled in a later plan",
          previewPrice: "Preview price",
        };

  return (
    <div className="ol-pricing-grid">
      <div className="ol-pricing-tile active">
        <strong>{copy.free}</strong>
        {copy.current}
      </div>
      <div className="ol-pricing-tile" title={copy.plannedTitle}>
        {copy.lifetime}
        <br />
        $29
      </div>
      <div className="ol-pricing-tile" title={copy.plannedTitle}>
        {copy.subscription}
        <br />
        {copy.monthly}
      </div>
      <div className="ol-pricing-tile" title={copy.reservedTitle}>
        {copy.previewPrice}
        <br />
        {formatPrice(priceUsd)}
      </div>
    </div>
  );
}
