import { apiFetchAuthed } from "@/lib/api";

export type CreatorAgentLookup = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  endpoint_url?: string;
  price_per_call_cents?: number;
  tags?: string[];
  status?: "pending" | "approved" | "rejected" | "disabled";
  lifecycle_status?: "active" | "disabled";
  visibility?: "public" | "unlisted" | "private";
  certification_status?: "unreviewed" | "pending" | "certified" | "rejected";
  rejection_reason?: string | null;
  total_calls?: number;
  total_revenue_cents?: number;
  connection_mode?: "direct_http" | "mcp_server" | "runtime";
  mcp_tool_name?: string | null;
  availability?: unknown;
  readiness?: unknown;
  created_at?: string;
};

export type CreatorAgentVisibility = "public" | "unlisted" | "private";

export async function fetchCreatorAgentByParam<T extends CreatorAgentLookup = CreatorAgentLookup>(
  param: string,
): Promise<T | null> {
  const normalized = param.trim();
  if (!normalized) return null;
  const path = isUUID(normalized)
    ? `/api/v1/creator/agents/${encodeURIComponent(normalized)}`
    : `/api/v1/creator/agents/by-slug/${encodeURIComponent(normalized)}`;
  return apiFetchAuthed<CreatorAgentLookup>(path)
    .then((agent) => normalizeCreatorAgent(agent) as T)
    .catch(() => null);
}

export async function fetchActiveCreatorAgents<T extends CreatorAgentLookup = CreatorAgentLookup>(
  visibilities: CreatorAgentVisibility[] = ["public", "unlisted", "private"],
): Promise<T[]> {
  const pages = await Promise.all(
    visibilities.map((visibility) => fetchActiveCreatorAgentsByVisibility<T>(visibility)),
  );
  const seen = new Set<string>();
  const agents: T[] = [];
  for (const agent of pages.flat()) {
    if (seen.has(agent.id)) continue;
    seen.add(agent.id);
    agents.push(agent);
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

async function fetchActiveCreatorAgentsByVisibility<T extends CreatorAgentLookup>(
  visibility: CreatorAgentVisibility,
): Promise<T[]> {
  const limit = 100;
  const first = await fetchActiveCreatorAgentPage(visibility, limit, 0);
  const items = [...normalizeAgentPage(first)];
  const total = first.total ?? items.length;
  const offsets: number[] = [];
  for (let offset = limit; offset < total; offset += limit) {
    offsets.push(offset);
  }
  if (offsets.length > 0) {
    const rest = await Promise.all(offsets.map((offset) => fetchActiveCreatorAgentPage(visibility, limit, offset)));
    for (const page of rest) {
      items.push(...normalizeAgentPage(page));
    }
  }
  return items
    .filter((agent) => agent.lifecycle_status === "active" && agent.visibility === visibility)
    .map((agent) => normalizeCreatorAgent(agent) as T);
}

function fetchActiveCreatorAgentPage(
  visibility: CreatorAgentVisibility,
  limit: number,
  offset: number,
) {
  const params = new URLSearchParams({
    status: "active",
    visibility,
    sort_by: "name",
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetchAuthed<{ items?: CreatorAgentLookup[]; total?: number }>(
    `/api/v1/creator/agents?${params.toString()}`,
  );
}

function normalizeAgentPage(payload: CreatorAgentLookup[] | { items?: CreatorAgentLookup[] }) {
  return Array.isArray(payload) ? payload : payload.items ?? [];
}

function normalizeCreatorAgent(agent: CreatorAgentLookup): CreatorAgentLookup {
  const lifecycle = agent.lifecycle_status ?? "active";
  const certification = agent.certification_status ?? "unreviewed";
  return {
    ...agent,
    description: agent.description ?? "",
    endpoint_url: agent.endpoint_url ?? "",
    price_per_call_cents: agent.price_per_call_cents ?? 0,
    tags: agent.tags ?? [],
    status: agent.status ?? legacyStatus(lifecycle, certification),
    lifecycle_status: lifecycle,
    visibility: agent.visibility ?? "private",
    certification_status: certification,
    total_calls: agent.total_calls ?? 0,
    total_revenue_cents: agent.total_revenue_cents ?? 0,
    connection_mode: agent.connection_mode ?? "direct_http",
  };
}

function legacyStatus(
  lifecycle: CreatorAgentLookup["lifecycle_status"],
  certification: CreatorAgentLookup["certification_status"],
) {
  if (lifecycle === "disabled") return "disabled";
  if (certification === "pending") return "pending";
  if (certification === "rejected") return "rejected";
  return "approved";
}

function isUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
