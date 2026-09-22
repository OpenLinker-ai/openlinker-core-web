import { apiFetch } from "@/lib/api";
import { fetchSkillsPage, type Skill } from "@/lib/skills";
import type { Locale } from "@/lib/i18n";
export const capabilityPath = (id: string) =>
  `/skills/capabilities/${id.split("/").map(encodeURIComponent).join("/")}`;
export async function fetchCapability(id: string): Promise<Skill> {
  return apiFetch<Skill>(
    `/api/v1/skills/${id.split("/").map(encodeURIComponent).join("/")}`,
  );
}
export async function fetchCompleteSkillCatalog(
  locale?: Locale,
): Promise<Skill[]> {
  const items: Skill[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const result = await fetchSkillsPage({ page, size: 200, locale });
    const additions = result.items.filter((s) => !seen.has(s.id));
    for (const item of additions) {
      seen.add(item.id);
      items.push(item);
    }
    if (
      items.length >= (result.total ?? Infinity) ||
      result.items.length < (result.size ?? 200)
    )
      return items;
    if (!additions.length)
      throw new Error("Capability pagination made no progress");
  }
}
export type CapabilityAgent = {
  agent_id: string;
  slug: string;
  name: string;
  description: string;
  average_score: number;
};
export async function fetchCapabilityAgents(
  id: string,
): Promise<CapabilityAgent[]> {
  const result = await apiFetch<{ items: CapabilityAgent[] }>(
    `/api/v1/skills/${id.split("/").map(encodeURIComponent).join("/")}/top-agents?limit=3`,
  );
  return result.items;
}
