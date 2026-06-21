"use client";

/**
 * Registry 列表分页器。
 *
 * - 单页时不渲染（totalPages <= 1）
 * - 上/下一页用 next/link，保留 tags / q 查询参数
 * - "加载更多" 风格在多页较多时不友好，这里采用 "上一页 / 下一页 + 当前页码"
 */

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

interface Props {
  currentPage: number;
  totalPages: number;
  searchParams: { tags?: string; q?: string };
  locale?: Locale;
}

export function Pagination({ currentPage, totalPages, searchParams, locale = "zh" }: Props) {
  if (totalPages <= 1) return null;
  const copy =
    locale === "zh"
      ? { prev: "← 上一页", next: "下一页 →", page: "第" }
      : { prev: "← Previous", next: "Next →", page: "Page" };

  const buildHref = (page: number) => {
    const sp = new URLSearchParams();
    if (searchParams.tags) sp.set("tags", searchParams.tags);
    if (searchParams.q) sp.set("q", searchParams.q);
    sp.set("page", String(page));
    return `?${sp.toString()}`;
  };

  return (
    <nav className="flex items-center justify-center gap-3 pt-4">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {copy.prev}
        </Link>
      ) : (
        <span className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
          {copy.prev}
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        {locale === "zh"
          ? `${copy.page} ${currentPage} / ${totalPages} 页`
          : `${copy.page} ${currentPage} / ${totalPages}`}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {copy.next}
        </Link>
      ) : (
        <span className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
          {copy.next}
        </span>
      )}
    </nav>
  );
}
