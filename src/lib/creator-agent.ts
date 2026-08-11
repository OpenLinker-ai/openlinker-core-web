import { ApiError, apiFetchAuthed } from "@/lib/api";
import {
  fetchCreatorAgentByParamWith,
  fetchCreatorAgentPagesWith,
} from "@/lib/creator-agent-fetch.mjs";

export type CreatorAgentLookup = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  endpoint_url?: string;
  price_per_call_cents?: number;
  tags?: string[];
  skill_ids?: string[];
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
export const CREATOR_AGENT_MAX_CONCURRENCY = 4;

export async function fetchCreatorAgentByParam<T extends CreatorAgentLookup = CreatorAgentLookup>(
  param: string,
): Promise<T | null> {
  const agent = await fetchCreatorAgentByParamWith(
    (path) => apiFetchAuthed<CreatorAgentLookup>(path),
    param,
    (error) => error instanceof ApiError && (error.status === 403 || error.status === 404),
  );
  return agent ? normalizeCreatorAgent(agent) as T : null;
}

export function isCreatorAgentUnauthorized(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export async function fetchActiveCreatorAgents<T extends CreatorAgentLookup = CreatorAgentLookup>(
  visibilities: CreatorAgentVisibility[] = ["public", "unlisted", "private"],
): Promise<T[]> {
  const groups = await fetchCreatorAgentPagesWith(
    fetchActiveCreatorAgentPage,
    visibilities,
    { limit: 100, maxConcurrency: CREATOR_AGENT_MAX_CONCURRENCY },
  );
  const seen = new Set<string>();
  const agents: T[] = [];
  for (const { visibility, pages } of groups) {
    for (const page of pages) {
      for (const agent of normalizeAgentPage(page)) {
        if (
          agent.lifecycle_status !== "active" ||
          agent.visibility !== visibility ||
          seen.has(agent.id)
        ) {
          continue;
        }
        seen.add(agent.id);
        agents.push(normalizeCreatorAgent(agent) as T);
      }
    }
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
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
