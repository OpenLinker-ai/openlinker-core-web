/**
 * <Brand /> + <BrandFull /> —— OpenLinker 品牌标识。
 *
 * 使用 public/openlinker-logo.svg 品牌资产。
 *   - 默认渲染为可点击的回首页链接
 *   - BrandFull 含 core 版副标题
 */

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BrandProps {
  /** 是否包裹成 Link 跳首页（默认 true） */
  asLink?: boolean;
  /** 是否显示副标题（默认 true） */
  withSubtitle?: boolean;
  locale?: Locale;
  className?: string;
}

export function Brand({ asLink = true, withSubtitle = true, locale = "zh", className }: BrandProps) {
  const inner = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="ol-brand-logo" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block text-[19px] font-extrabold tracking-tight text-[color:var(--ol-ink)]">
          OpenLinker
        </span>
        {withSubtitle && (
          <span className="mt-0.5 hidden text-[12px] text-[color:var(--ol-muted)] sm:block">
            {locale === "zh" ? "Agent 注册与运行" : "Agent registration & runs"}
          </span>
        )}
      </span>
    </span>
  );

  if (!asLink) return inner;
  return (
    <Link href="/" className="inline-flex items-center hover:opacity-90 transition">
      {inner}
    </Link>
  );
}
