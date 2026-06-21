import { getApiBaseUrlForRequest } from "@/lib/api-root";
import { upstreamUnavailableResponse } from "@/lib/upstream-response";

export const dynamic = "force-dynamic";

async function loadDBHealth(request: Request) {
  return fetch(`${getApiBaseUrlForRequest(request)}/healthz/db`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
}

function proxyJSON(upstream: Response, body: BodyInit | null) {
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8",
    },
  });
}

function headOK() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  if (request.method === "HEAD") {
    return headOK();
  }
  try {
    const upstream = await loadDBHealth(request);
    return proxyJSON(upstream, await upstream.text());
  } catch {
    return upstreamUnavailableResponse("/healthz/db");
  }
}

export async function HEAD() {
  return headOK();
}
