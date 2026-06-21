"use client";

/**
 * SkillPicker：可控的 Skill 多选组件（最多 5 个，子轮 2.3）。
 *
 * 父组件（发布表单 / 创作者中心 dialog）持有 selected ids 的状态；
 * 本组件只负责呈现 + onChange，不发起请求。
 *
 * 视觉规则：
 *   - 顶部已选区：Badge × N，每个 Badge 含 × 按钮
 *   - 6 个分类按 CATEGORY_ORDER 顺序展开为 collapsible <details> 区块
 *     每段头部显示 "已选 X/5" 计数（只统计该分类内的选中数）
 *   - 当达到 max（默认 5）：未选中的 row 整行 disabled + 灰色
 *   - 单行：name 加粗 + description 小号灰字 + 末尾原生 checkbox
 *
 * 验证策略：onChange 回调前先 clamp 到 max；超 max 时静默忽略
 * （用户已经看到 disabled，无需额外提示）。
 */

import { useMemo } from "react";

import {
  CATEGORY_ORDER,
  MAX_SKILLS_PER_AGENT,
  categoryLabel,
  type Skill,
} from "@/lib/skills";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  /** 完整目录（父级一次拉取后传入）。 */
  skills: Skill[];
  /** 当前选中的 skill id 列表。 */
  value: string[];
  /** 选中变化。永远是 length <= max 的新数组。 */
  onChange: (ids: string[]) => void;
  /** 最多可选数量，默认 5。 */
  max?: number;
  locale?: Locale;
}

export function SkillPicker({
  skills,
  value,
  onChange,
  max = MAX_SKILLS_PER_AGENT,
  locale = "zh",
}: Props) {
  const copy =
    locale === "zh"
      ? {
          empty: `未选择技能（最多选 ${max} 个）`,
          selected: "已选",
          remove: "移除",
        }
      : {
          empty: `No Skills selected (up to ${max})`,
          selected: "Selected",
          remove: "Remove",
        };
  const selectedSet = useMemo(() => new Set(value), [value]);

  // 按分类分组并按 sort_order 排序（避免对父级 props 排序产生副作用）
  const grouped = useMemo(() => {
    const map = new Map<Skill["category"], Skill[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const s of skills) {
      const list = map.get(s.category);
      if (list) list.push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [skills]);

  // value 中可能含有目录里没有的 id（旧数据），渲染 chip 时找原始 skill
  const skillById = useMemo(() => {
    const m = new Map<string, Skill>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  const reachedMax = value.length >= max;

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    if (value.length >= max) return; // clamp，静默忽略
    onChange([...value, id]);
  };

  const remove = (id: string) => {
    if (!selectedSet.has(id)) return;
    onChange(value.filter((x) => x !== id));
  };

  return (
    <div className="space-y-3">
      {/* 已选 chips */}
      <div className="flex min-h-[32px] flex-wrap items-center gap-1.5 rounded-md border border-dashed border-[color:var(--ol-line)] bg-muted/40 px-2 py-1.5">
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {copy.empty}
          </span>
        ) : (
          value.map((id) => {
            const s = skillById.get(id);
            const category = s ? categoryLabel(s.category, locale) : null;
            const label = s
              ? `${category} · ${s.name}`
              : id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ol-line)] bg-background px-2.5 py-0.5 text-[12px] font-semibold text-foreground hover:border-destructive hover:text-destructive"
                aria-label={`${copy.remove} ${label}`}
              >
                <span>{label}</span>
                <span aria-hidden className="text-base leading-none">
                  ×
                </span>
              </button>
            );
          })
        )}
        <span className="ml-auto text-[11px] font-bold text-muted-foreground">
          {copy.selected} {value.length}/{max}
        </span>
      </div>

      {/* 分类列表 */}
      <div className="space-y-2">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped.get(cat) ?? [];
          if (list.length === 0) return null;
          const inCat = list.filter((s) => selectedSet.has(s.id)).length;

          return (
            <details
              key={cat}
              className="group rounded-md border border-[color:var(--ol-line)] bg-background"
              open={inCat > 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted/40">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground transition-transform group-open:rotate-90">
                    ›
                  </span>
                  <span>{categoryLabel(cat, locale)}</span>
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {copy.selected} {inCat}/{max}
                </span>
              </summary>
              <ul className="divide-y divide-[color:var(--ol-line)] border-t border-[color:var(--ol-line)]">
                {list.map((s) => {
                  const checked = selectedSet.has(s.id);
                  const disabled = !checked && reachedMax;
                  return (
                    <li key={s.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors",
                          checked && "bg-[color:var(--ol-primary)]/5",
                          disabled &&
                            "cursor-not-allowed opacity-50 hover:bg-transparent",
                          !disabled && !checked && "hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[color:var(--ol-primary)] disabled:cursor-not-allowed"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(s.id)}
                          aria-label={s.name}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground">
                            {s.name}
                          </div>
                          <div className="text-[12px] leading-[1.5] text-muted-foreground">
                            {s.description}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
