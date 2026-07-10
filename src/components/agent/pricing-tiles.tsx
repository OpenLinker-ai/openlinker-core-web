"use client";

/**
 * 接入页右侧的外部参考价格字段说明。
 *
 * price_usd 是可选兼容元数据，不触发 OpenLinker Core 扣费或结算。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .pricing-grid。
 */

import type { Locale } from "@/lib/i18n";

interface PricingTilesProps {
  /** 表单当前 price_usd（USD，小数）；非正数或无效值视为未提供。 */
  priceUsd: number;
  locale?: Locale;
}

function formatPrice(p: number): string | null {
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p < 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(2)}`;
}

export function PricingTiles({ priceUsd, locale = "zh" }: PricingTilesProps) {
  const copy =
    locale === "zh"
      ? {
          fieldRole: "字段用途",
          compatibilityMetadata: "可选兼容元数据",
          displayPrice: "外部参考价格",
          notProvided: "未提供",
          displayHint: "该字段用于兼容外部系统，不会触发 OpenLinker Core 扣费或结算。",
        }
      : {
          fieldRole: "Field purpose",
          compatibilityMetadata: "Optional compatibility metadata",
          displayPrice: "External reference price",
          notProvided: "Not provided",
          displayHint: "This field supports compatibility with external systems and does not trigger charging or settlement in OpenLinker Core.",
        };

  return (
    <div className="ol-pricing-grid">
      <div className="ol-pricing-tile active" title={copy.displayHint}>
        <strong>{copy.fieldRole}</strong>
        {copy.compatibilityMetadata}
      </div>
      <div className="ol-pricing-tile" title={copy.displayHint}>
        {copy.displayPrice}
        <br />
        {formatPrice(priceUsd) ?? copy.notProvided}
      </div>
    </div>
  );
}
