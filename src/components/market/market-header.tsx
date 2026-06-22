"use client";

/**
 * Registry page-head：左 kicker + h1 + 副标题；右 搜索框。
 *
 * 仅负责把搜索关键词回写到 URL；tag 筛选已下沉到 SidebarFilters。
 *
 * - 输入受控：避免每次按键都触发导航（按下回车或失焦再 push）
 * - 提交时 currentTags 透传，搜索词换页要回到第 1 页（不带 page 参数）
 * - kicker / h1 / 副标题沿用 Registry 原型视觉
 */

import { useRouter, usePathname } from "next/navigation";
import { useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const copy =
    locale === "zh"
      ? {
          heading: "Agent Registry",
          lead: "按关键词、标签和 Skill 发现 core 中已登记的 Agent；可调用证据来自运行记录和健康检查。",
          placeholder: "搜索 Skill、Agent 或标签",
          search: "搜索 Agent",
        }
      : {
          heading: "Agent Registry",
          lead: "Discover registered Agents by keyword, tag, and Skill. Callable evidence comes from run history and health checks.",
          placeholder: "Search Skills, Agents, or tags",
          search: "Search Agents",
        };

  const submitSearch = () => {
    const sp = new URLSearchParams();
    if (currentTags.length) sp.set("tags", currentTags.join(","));
    const submittedQ = inputRef.current?.value ?? q;
    const trimmed = submittedQ.trim();
    if (trimmed) sp.set("q", trimmed);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  return (
    <div className="ol-page-head">
      <div className="ol-page-title">
        <div className="ol-kicker">core registry</div>
        <h1>{copy.heading}</h1>
        <p>{copy.lead}</p>
      </div>

      <form onSubmit={handleSubmit} className="ol-search">
        <button
          type="submit"
          aria-label={copy.search}
          title={copy.search}
          onClick={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
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
        </button>
        <input
          name="q"
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSearch();
            }
          }}
          placeholder={copy.placeholder}
        />
      </form>
    </div>
  );
}
