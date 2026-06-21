"use client";

/**
 * 市场页 page-head：左 kicker + h1 + 副标题；右 搜索框。
 *
 * 仅负责把搜索关键词回写到 URL；tag 筛选已下沉到 SidebarFilters。
 *
 * - 输入受控：避免每次按键都触发导航（按下回车或失焦再 push）
 * - 提交时 currentTags 透传，搜索词换页要回到第 1 页（不带 page 参数）
 * - kicker / h1 / 副标题按 prototype/openlinker-flow-07-market.png 视觉
 */

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";

interface Props {
  currentTags: string[];
  currentQ: string;
  locale?: Locale;
}

export function MarketHeader({ currentTags, currentQ, locale = "zh" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(currentQ);
  const copy =
    locale === "zh"
      ? {
          heading: "优先发现可调用的 Agent",
          lead: "按关键词和场景筛选；只有具备可调用证据的 Agent 才提供 Playground 试用入口。",
          placeholder: "搜索财务、客服、代码审查",
        }
      : {
          heading: "Find callable Agents first",
          lead: "Filter by keyword and scenario. Playground trials are shown only for Agents with callable evidence.",
          placeholder: "Search finance, support, code review",
        };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (currentTags.length) sp.set("tags", currentTags.join(","));
    const trimmed = q.trim();
    if (trimmed) sp.set("q", trimmed);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="ol-page-head">
      <div className="ol-page-title">
        <div className="ol-kicker">step 1 / discover</div>
        <h1>{copy.heading}</h1>
        <p>{copy.lead}</p>
      </div>

      <form onSubmit={handleSubmit} className="ol-search">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.placeholder}
        />
      </form>
    </div>
  );
}
