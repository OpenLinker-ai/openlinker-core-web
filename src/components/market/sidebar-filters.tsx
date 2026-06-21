"use client";

/**
 * 左侧筛选侧栏。
 *
 * 仅展示已接后端 `?tags=` 的真实筛选项；不保留无法点击的高级筛选占位。
 */

import { useRouter, usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n";

const FILTER_TAGS: Array<{ label: Record<Locale, string>; tag: string }> = [
  { label: { zh: "财务审计", en: "Finance audit" }, tag: "finance" },
  { label: { zh: "数据分析", en: "Data analysis" }, tag: "data" },
  { label: { zh: "代码审查", en: "Code review" }, tag: "code" },
  { label: { zh: "内容生成", en: "Content generation" }, tag: "writing" },
  { label: { zh: "分析研究", en: "Research" }, tag: "analysis" },
];

interface Props {
  currentTags: string[];
  currentQ: string;
  total: number;
  locale?: Locale;
}

export function SidebarFilters({ currentTags, currentQ, total, locale = "zh" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const copy =
    locale === "zh"
      ? { all: "全部 Agent", tags: "按标签" }
      : { all: "All Agents", tags: "By tag" };

  const pushWith = (nextTags: string[]) => {
    const sp = new URLSearchParams();
    if (nextTags.length) sp.set("tags", nextTags.join(","));
    if (currentQ) sp.set("q", currentQ);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const toggleSceneTag = (tag: string) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    pushWith(next);
  };

  const allActive = currentTags.length === 0;

  return (
    <aside className="ol-panel ol-panel-pad">
      <div className="ol-filter-list">
        <button
          type="button"
          onClick={() => pushWith([])}
          className={`ol-filter-item${allActive ? " active" : ""}`}
        >
          {copy.all} <span>{total.toLocaleString()}</span>
        </button>

        <div className="ol-filter-divider">{copy.tags}</div>

        {FILTER_TAGS.map((item) => {
          const active = currentTags.includes(item.tag);
          return (
            <button
              key={item.tag}
              type="button"
              onClick={() => toggleSceneTag(item.tag)}
              className={`ol-filter-item${active ? " active" : ""}`}
              aria-pressed={active}
            >
              {item.label[locale]}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
