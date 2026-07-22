import { getApiBaseUrlForRequest } from "@/lib/api-root";
import { upstreamUnavailableHeadResponse, upstreamUnavailableResponse } from "@/lib/upstream-response";

export const dynamic = "force-dynamic";

async function loadReadiness(request: Request) {
  return fetch(`${getApiBaseUrlForRequest(request)}/readyz`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
}

async function proxyReadiness(request: Request, head = false) {
  try {
    const upstream = await loadReadiness(request);
    return new Response(head ? null : await upstream.text(), {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8",
      },
    });
  } catch {
    return head ? upstreamUnavailableHeadResponse() : upstreamUnavailableResponse("/readyz");
  }
}

export async function GET(request: Request) {
  return proxyReadiness(request);
}

export async function HEAD(request: Request) {
  return proxyReadiness(request, true);
}
