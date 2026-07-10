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

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  const apiURL = getApiBaseUrlForRequest(request);
  let body: Uint8Array | undefined;
  try {
    body = await requestBodyWithLimit(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return payloadTooLargeResponse("/mcp");
    }
    throw error;
  }

  const upstream = await fetch(`${apiURL}/api/v1/mcp`, {
    method: "POST",
    headers: upstreamHeaders(request),
    body: bytesToBodyInit(body),
    cache: "no-store",
  });

  let responseBody: Uint8Array | null;
  try {
    responseBody = await responseBodyWithLimit(upstream);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return upstreamResponseTooLargeResponse("/mcp");
    }
    throw error;
  }

  return new Response(bytesToNullableBodyInit(responseBody), {
    status: upstream.status,
    headers: responseHeaders(upstream),
  });
}

export async function GET(request: Request) {
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return new Response(null, { status: 405 });
  }

  return Response.json(
    {
      name: "openlinker-mcp",
      endpoint: "/mcp",
      api_endpoint: "/api/v1/mcp",
      transport: "MCP Streamable HTTP, JSON response mode",
      auth: "Authorization: Bearer ol_user_...",
      auth_status: {
        contract: "core",
        local_issuance: "implementation_in_progress",
        local_verification: "implementation_in_progress",
        external_compatibility_verifier: "supported_when_configured",
        management_path: "/settings/user-tokens",
      },
      methods: ["initialize", "tools/list", "tools/call"],
      tools: ["search_agents", "get_agent", "create_task", "run_agent", "get_run"],
      example: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function HEAD(request: Request) {
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return new Response(null, { status: 405 });
  }
  return new Response(null, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
