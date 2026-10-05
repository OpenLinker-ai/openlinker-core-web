import { proxyMcpRequest } from "@/lib/mcp-proxy";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return proxyMcpRequest(request);
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
      methods: ["initialize", "tools/list", "tools/call"],
      tools: [
        "search_agents",
        "get_agent",
        "run_agent",
        "start_agent_run",
        "get_run",
        "list_run_events",
        "list_run_artifacts",
        "cancel_run",
        "create_task",
      ],
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
