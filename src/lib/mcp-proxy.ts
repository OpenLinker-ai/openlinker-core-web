import { getApiBaseUrlForRequest } from "@/lib/api-root";
import {
  BodyTooLargeError,
  bytesToBodyInit,
  bytesToNullableBodyInit,
  payloadTooLargeResponse,
  requestBodyWithLimit,
  responseBodyWithLimit,
  upstreamResponseTooLargeResponse,
} from "@/lib/proxy-body-limit";

const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "mcp-protocol-version",
  "mcp-session-id",
];

function upstreamHeaders(request: Request) {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function responseHeaders(upstream: Response) {
  const headers = new Headers();
  for (const name of [
    "cache-control",
    "content-type",
    "mcp-session-id",
    "mcp-protocol-version",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return headers;
}

export async function proxyMcpRequest(request: Request, agentId?: string) {
  const apiURL = getApiBaseUrlForRequest(request);
  if (
    agentId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      agentId,
    )
  )
    return Response.json(
      { error: "Invalid Agent identifier" },
      { status: 400 },
    );
  const path = agentId ? `/api/v1/mcp/agents/${agentId}` : "/api/v1/mcp";
  let body: Uint8Array | undefined;
  try {
    body =
      request.method === "POST"
        ? await requestBodyWithLimit(request)
        : undefined;
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return payloadTooLargeResponse("/mcp");
    }
    throw error;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiURL}${path}`, {
      method: request.method,
      redirect: "manual",
      headers: upstreamHeaders(request),
      body: bytesToBodyInit(body),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "MCP upstream unavailable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  let responseBody: Uint8Array | null;
  try {
    responseBody = await responseBodyWithLimit(upstream);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return upstreamResponseTooLargeResponse("/mcp");
    }
    throw error;
  }

  const hasNoBody = request.method === "HEAD" || [204, 205, 304].includes(upstream.status);
  return new Response(hasNoBody ? null : bytesToNullableBodyInit(responseBody), {
    status: upstream.status,
    headers: responseHeaders(upstream),
  });
}
