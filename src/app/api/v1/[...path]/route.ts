import { getApiBaseUrlForRequest } from "@/lib/api-root";
import {
  upstreamUnavailableHeadResponse,
  upstreamUnavailableResponse,
} from "@/lib/upstream-response";

export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function upstreamURL(request: Request): string {
  const source = new URL(request.url);
  const path = source.pathname.replace(/^\/api\/v1\/?/, "");
  const suffix = path ? `/api/v1/${path}` : "/api/v1";
  return `${getApiBaseUrlForRequest(request)}${suffix}${source.search}`;
}

function requestHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized) || normalized === "cookie") return;
    headers.set(key, value);
  });
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) return;
    headers.set(key, value);
  });
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return headers;
}

async function proxy(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamURL(request), {
      method,
      headers: requestHeaders(request),
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    if (method === "HEAD") {
      return upstreamUnavailableHeadResponse();
    }
    return upstreamUnavailableResponse(new URL(request.url).pathname);
  }

  return new Response(method === "HEAD" ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders(upstream),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
