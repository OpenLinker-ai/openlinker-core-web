import type { Locale } from "@/lib/i18n";

export function McpScopeNotice({ locale }: { locale: Locale }) {
  const copy = locale === "zh" ? {
    title: "MCP 在哪里生效？",
    description: "MCP 服务需要配置到实际调用它的客户端或 Agent 执行环境中。这里可以查看服务、试用并复制连接配置。",
    scope: "网页目前不提供向 Runtime Agent 自动下发 MCP 工具的关联功能。复制配置或在平台试用，不会为当前 Agent 安装工具。",
    verify: "配置完成后，在实际运行 Agent 的客户端中检查连接和工具列表；工具是否可用仍受该执行环境的权限与策略限制。",
  } : {
    title: "Where does MCP take effect?",
    description: "Configure MCP services in the client or Agent runtime that will call them. Here you can inspect services, try them and copy connection settings.",
    scope: "The web app does not currently associate or distribute MCP tools to Runtime Agents. Copying settings or trying a service does not install tools for this Agent.",
    verify: "After setup, check the connection and tool list in the client running your Agent. Its permissions and policies still determine which tools are available.",
  };
  return <section className="space-y-2 rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4 text-sm" aria-label={copy.title}>
    <h3 className="font-bold">{copy.title}</h3>
    <p>{copy.description}</p>
    <p>{copy.scope}</p>
    <p className="text-[color:var(--ol-muted)]">{copy.verify}</p>
  </section>;
}
