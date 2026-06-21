/**
 * Skill 共享类型 + 公开目录拉取（子轮 2.3）。
 *
 * 后端契约：
 *   GET /api/v1/skills （public）→ { items: Skill[] }
 *
 * 6 个分类：content / dev / data / media / ops / ai，每类 5 个，共 30。
 *
 * 同构模块：Server Component / Client Component 都可直接 import 类型；
 * fetchSkills 走公开 apiFetch，不需要 token。
 */

import { apiFetch } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export type Skill = {
  id: string;
  category: "content" | "dev" | "data" | "media" | "ops" | "ai";
  name: string;
  description: string;
  sort_order: number;
};

export const CATEGORY_LABELS: Record<Skill["category"], string> = {
  content: "内容创作",
  dev: "研发工程",
  data: "数据分析",
  media: "图像音视频",
  ops: "业务流程",
  ai: "AI 工程",
};

export const CATEGORY_LABELS_EN: Record<Skill["category"], string> = {
  content: "Content creation",
  dev: "Development",
  data: "Data analysis",
  media: "Image and video",
  ops: "Business workflow",
  ai: "AI engineering",
};

export function categoryLabel(category: Skill["category"], locale: Locale): string {
  return locale === "zh" ? CATEGORY_LABELS[category] : CATEGORY_LABELS_EN[category];
}

/** 分类显示顺序（与 CATEGORY_LABELS 顺序保持一致）。 */
export const CATEGORY_ORDER: Skill["category"][] = [
  "content",
  "dev",
  "data",
  "media",
  "ops",
  "ai",
];

/** 单个 agent 最多绑定的 skill 数量（与后端 PATCH 限制保持一致）。 */
export const MAX_SKILLS_PER_AGENT = 5;

interface SkillsResponse {
  items: Skill[];
}

/**
 * 拉取完整 Skill 目录（公开接口，不带 JWT）。
 *
 * 失败时抛 ApiError，由调用方决定降级（如发布表单选择隐藏整个分区）。
 */
export async function fetchSkills(): Promise<Skill[]> {
  const data = await apiFetch<SkillsResponse>("/api/v1/skills");
  return data.items ?? [];
}
