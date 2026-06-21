import { getApiBaseUrlForRequest } from "@/lib/api-root";
import {
  upstreamUnavailableHeadResponse,
  upstreamUnavailableResponse,
} from "@/lib/upstream-response";

export const dynamic = "force-dynamic";

async function loadManifest(request: Request) {
  return fetch(`${getApiBaseUrlForRequest(request)}/.well-known/openlinker.json`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  try {
    const upstream = await loadManifest(request);
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "Cache-Control": upstream.headers.get("Cache-Control") ?? "public, max-age=300",
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8",
      },
    });
  } catch {
    return upstreamUnavailableResponse("/.well-known/openlinker.json");
  }
}

export async function HEAD(request: Request) {
  try {
    const upstream = await loadManifest(request);

    return new Response(null, {
      status: upstream.status,
      headers: {
        "Cache-Control": upstream.headers.get("Cache-Control") ?? "public, max-age=300",
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8",
      },
    });
  } catch {
    return upstreamUnavailableHeadResponse();
  }
}
