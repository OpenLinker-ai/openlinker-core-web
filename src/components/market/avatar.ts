/**
 * 由 agent.slug 派生 app-icon 的「字母 + 颜色」。
 *
 * - 取 slug 的前两个字符大写作为字母（无字母时退回 'OA'）
 * - 颜色用首字符 charCode 哈希到固定 palette，保证刷新后稳定
 *
 * 放在 components/market 下作为视图层 helper，不进 lib/*。
 */

const COLORS = [
  "#3176ed", // blue
  "#218a52", // green
  "#c8830d", // amber
  "#715bd9", // violet
  "#0f9187", // primary
] as const;

export function avatarFromSlug(slug: string): {
  initials: string;
  color: string;
} {
  const cleaned = (slug ?? "").replace(/[^a-z0-9]/gi, "");
  const seed = cleaned.length > 0 ? cleaned : "oa";
  const initials = seed.slice(0, 2).toUpperCase();
  const idx = seed.charCodeAt(0) % COLORS.length;
  return { initials, color: COLORS[idx] };
}
