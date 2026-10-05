const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const referencePath = new RegExp(
  `^/skills/packages/(${uuid})/versions/(${uuid})$`,
  "i",
);
// Human-facing pages must not look like successful MCP responses to a client
// configured with the directory URL by mistake. GET and HEAD remain browsable.
export function mcpPageMethodResponse(pathname, method) {
  if ((pathname === "/mcps" || pathname.startsWith("/mcps/")) && method !== "GET" && method !== "HEAD") {
    return Response.json(
      { error: "This is an MCP directory page. Use /mcp or /mcp/agents/<agent-id> as the protocol endpoint." },
      { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } },
    );
  }
  return null;
}

export function parseSkillReference(value, origin) {
  const url = new URL(value.trim());
  const match = referencePath.exec(url.pathname);
  if (
    url.origin !== new URL(origin).origin ||
    url.username ||
    url.password ||
    url.search ||
    !match ||
    !/^#sha256=[a-f0-9]{64}$/i.test(url.hash)
  )
    throw new Error("Invalid skill reference");
  return {
    source_package_id: match[1],
    source_version_id: match[2],
    expected_digest: url.hash.slice(8).toLowerCase(),
  };
}
export function skillVersionPath(packageId, versionId) {
  return `/skills/packages/${encodeURIComponent(packageId)}/versions/${encodeURIComponent(versionId)}`;
}
export function claudeMcpConfig(origin, agentId) {
  const endpoint = new URL(
    agentId ? `/mcp/agents/${encodeURIComponent(agentId)}` : "/mcp",
    origin,
  );
  return JSON.stringify(
    {
      mcpServers: {
        [agentId ? `openlinker-${agentId}` : "openlinker"]: {
          type: "http",
          url: endpoint.href,
          headers: { Authorization: "Bearer ${OPENLINKER_USER_TOKEN}" },
        },
      },
    },
    null,
    2,
  );
}
export function skillLocalNameCompatible(name, description) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) &&
    name.length <= 64 &&
    !name.includes("claude") && !name.includes("anthropic") &&
    [...description].length <= 1024
  );
}
