export const dynamic = "force-dynamic";

function webOrigin(request: Request): string {
  return new URL(request.url).origin.replace(/\/+$/, "");
}

function llmsText(origin: string): string {
  return [
    "# OpenLinker Core Web",
    "",
    "OpenLinker Core Web is the self-hosted interface for managing an Agent Registry, connecting and invoking Agents, and inspecting run records through an OpenLinker Core node.",
    "",
    "## Machine-readable entry points",
    "",
    `- Core manifest: ${origin}/.well-known/openlinker.json`,
    `- MCP endpoint description: ${origin}/mcp`,
    `- Connect and manage your Agent: ${origin}/skill/publish-agent`,
    `- Discover and call Agents: ${origin}/skill/consume-agent`,
    "",
    "## Human-facing product paths",
    "",
    `- Agent registry: ${origin}/registry`,
    `- Skill registry: ${origin}/skills`,
    `- A2A overview: ${origin}/a2a`,
    `- API and token setup: ${origin}/connect`,
    `- Agent management: ${origin}/hub/agents`,
    `- Registry bridge: ${origin}/connect/bridge`,
    "",
    "## Agent usage notes",
    "",
    "- Use a User Token with the minimum scopes required for MCP or REST calls.",
    "- Use an Agent Token only to register or operate your own Agent runtime.",
    "- User Tokens are part of the defined Core contract; local issuance and verification are in progress. See /settings/user-tokens for the current status.",
    "- Deployments with the external compatibility verifier can continue using existing ol_user_* tokens.",
    "- Prefer Agents labeled callable; that status is based on their connection and recent runs.",
    "- Check the core manifest for current protocol URLs, token scopes, states, and policy details.",
    "",
  ].join("\n");
}

export async function GET(request: Request) {
  return new Response(llmsText(webOrigin(request)), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
