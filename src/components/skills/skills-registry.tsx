"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  CATEGORY_ORDER,
  categoryLabel as getCategoryLabel,
  type Skill,
} from "@/lib/skills";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ALL_FILTER = "all";
const FILTERS = [ALL_FILTER, ...CATEGORY_ORDER] as const;
type FilterKey = (typeof FILTERS)[number];
type SortKey = "order" | "category" | "name";

export function SkillsRegistry({ locale, skills }: { locale: Locale; skills: Skill[] }) {
  const [filter, setFilter] = useState<FilterKey>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("order");
  const [query, setQuery] = useState("");
  const copy =
    locale === "zh"
      ? {
          all: "全部",
          allCategories: "全部分类",
          sort: [
            { id: "order" as const, label: "推荐顺序" },
            { id: "category" as const, label: "分类" },
            { id: "name" as const, label: "名称" },
          ],
          categoryTitle: "能力分类",
          offerSkill: "提供 Skill",
          directory: "Skill 目录",
          search: "搜索 Skill、ID 或描述",
          category: "分类",
          usedFor: "用于",
          entry: "入口",
          usage: "任务推荐、Agent 声明、Benchmark 和 MCP 运行证据",
          findAgents: "查 Agent",
          postTask: "发任务",
          unavailable: "Skill 目录暂时不可用，请稍后重试。",
          noMatch: "没有匹配的 Skill。",
          currentDirectory: "当前目录",
          currentSummary: (total: number, shown: number) => `后端返回 ${total} 个标准 Skill；当前筛选显示 ${shown} 个。`,
          noData: "当前没有拿到后端 Skill 目录，页面不会展示静态假数据。",
          pathTitle: "使用路径",
          paths: [
            ["描述任务匹配", "/task"],
            ["市场按 Skill 搜索", "/market"],
            ["接入 Agent 声明 Skill", "/publish"],
            ["MCP/API 接入说明", "/connect"],
          ],
        }
      : {
          all: "All",
          allCategories: "All categories",
          sort: [
            { id: "order" as const, label: "Recommended" },
            { id: "category" as const, label: "Category" },
            { id: "name" as const, label: "Name" },
          ],
          categoryTitle: "Capability Categories",
          offerSkill: "Offer a Skill",
          directory: "Skill Directory",
          search: "Search Skill, ID, or description",
          category: "Category",
          usedFor: "Used for",
          entry: "Entry",
          usage: "Task matching, Agent claims, benchmarks, and MCP run evidence",
          findAgents: "Find Agents",
          postTask: "Post task",
          unavailable: "Skill directory is temporarily unavailable. Try again later.",
          noMatch: "No matching Skills.",
          currentDirectory: "Current directory",
          currentSummary: (total: number, shown: number) => `${total} standard Skills returned; ${shown} shown by the current filter.`,
          noData: "No Skill directory data was returned, so the page is not showing static placeholder data.",
          pathTitle: "Usage path",
          paths: [
            ["Describe a task", "/task"],
            ["Search market by Skill", "/market"],
            ["Declare Skills for an Agent", "/publish"],
            ["MCP/API integration guide", "/connect"],
          ],
        };
  const categoryLabel = (category: Skill["category"]) =>
    getCategoryLabel(category, locale);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return skills
      .filter((skill) => {
        const filterOK = filter === ALL_FILTER || skill.category === filter;
        const queryOK =
          !term ||
          skill.name.toLowerCase().includes(term) ||
          skill.id.toLowerCase().includes(term) ||
          skill.description.toLowerCase().includes(term);
        return filterOK && queryOK;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "category") {
          const categoryDiff =
            CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
          if (categoryDiff !== 0) return categoryDiff;
        }
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
      });
  }, [filter, query, skills, sort]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<Skill["category"], number>();
    for (const skill of skills) {
      counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
    }
    return counts;
  }, [skills]);

  const currentCategoryLabel =
    filter === ALL_FILTER ? copy.allCategories : categoryLabel(filter);

  return (
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <aside className="ol-panel ol-panel-pad h-fit">
        <div className="ol-kicker">skill registry</div>
        <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
          {copy.categoryTitle}
        </h2>
        <div className="mt-4 ol-filter-list">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn("ol-filter-item", filter === item && "active")}
            >
              {item === ALL_FILTER ? copy.all : categoryLabel(item)}
              <span>
                {item === ALL_FILTER ? skills.length : categoryCounts.get(item) ?? 0}
              </span>
            </button>
          ))}
        </div>
        <Link
          href="/publish"
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-[color:var(--ol-primary)] text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          <Icon name="gift" size="sm" />
          {copy.offerSkill}
        </Link>
      </aside>

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.directory}</strong>
          <div className="ol-code-tabs">
            {copy.sort.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSort(item.id)}
                className={cn("ol-code-tab", sort === item.id && "active")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-[color:var(--ol-line)] bg-white/70 p-4">
          <div className="ol-search w-full">
            <Icon name="target" size="sm" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[color:var(--ol-soft)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
              <tr>
                <th className="px-4 py-3 font-black">Skill</th>
                <th className="px-4 py-3 font-black">{copy.category}</th>
                <th className="px-4 py-3 font-black">ID</th>
                <th className="px-4 py-3 font-black">{copy.usedFor}</th>
                <th className="px-4 py-3 font-black">{copy.entry}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((skill) => (
                <tr key={skill.id} className="border-t border-[color:var(--ol-line)] bg-white">
                  <td className="px-4 py-4">
                    <div className="text-[14px] font-black text-[color:var(--ol-ink)]">
                      {skill.name}
                    </div>
                    <div className="mt-1 max-w-[360px] text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                      {skill.description}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="ol-chip ol-chip-mint">
                      {categoryLabel(skill.category)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <code className="font-mono text-[12px] font-bold text-[color:var(--ol-muted)]">
                      {skill.id}
                    </code>
                  </td>
                  <td className="px-4 py-4 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                    {copy.usage}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/market?q=${encodeURIComponent(skill.id)}`}
                        className="inline-flex h-8 items-center rounded-[11px] border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
                      >
                        {copy.findAgents}
                      </Link>
                      <Link
                        href="/task"
                        className="inline-flex h-8 items-center rounded-[11px] bg-[color:var(--ol-mint)] px-3 text-[12px] font-black text-[color:var(--ol-primary-dark)] hover:bg-[color:var(--ol-primary)] hover:text-white"
                      >
                        {copy.postTask}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t border-[color:var(--ol-line)] bg-white">
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] font-semibold text-[color:var(--ol-muted)]">
                    {skills.length === 0
                      ? copy.unavailable
                      : copy.noMatch}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.currentDirectory}
          </h2>
          <div className="mt-4 rounded-[16px] bg-[color:var(--ol-blue-soft)] p-4">
            <div className="text-[13px] font-black text-[color:var(--ol-blue)]">
              {currentCategoryLabel}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
              {skills.length > 0
                ? copy.currentSummary(skills.length, rows.length)
                : copy.noData}
            </p>
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.pathTitle}
          </h2>
          <div className="mt-4 grid gap-2">
            {copy.paths.map(([label, href], index) => (
              <Link key={href} className={cn("ol-filter-item", index === 0 && "active")} href={href}>
                {label} <span>→</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
