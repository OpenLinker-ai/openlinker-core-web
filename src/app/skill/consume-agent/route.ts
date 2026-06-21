import { getApiBaseUrlForRequest } from "@/lib/api-root";

export const dynamic = "force-dynamic";

async function loadConsumeAgentSkill(request: Request) {
  return fetch(`${getApiBaseUrlForRequest(request)}/skill/consume-agent`, {
    headers: { Accept: "text/plain" },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  const upstream = await loadConsumeAgentSkill(request);
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Cache-Control": upstream.headers.get("Cache-Control") ?? "public, max-age=300",
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/markdown; charset=utf-8",
    },
  });
}

export async function HEAD(request: Request) {
  const upstream = await loadConsumeAgentSkill(request);

  return new Response(null, {
    status: upstream.status,
    headers: {
      "Cache-Control": upstream.headers.get("Cache-Control") ?? "public, max-age=300",
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/markdown; charset=utf-8",
    },
  });
}
