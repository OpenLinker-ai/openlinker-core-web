import type { Locale } from "@/lib/i18n";

export function McpScopeNotice({ locale }: { locale: Locale }) {
  const copy = locale === "zh" ? {
    title: "MCP 在哪里生效？",
    description: "这里可以浏览和试用 MCP 服务，并查看外部客户端连接 OpenLinker 平台的配置。",
    scope: "网页目前不提供向 Runtime Agent 自动下发 MCP 工具的关联功能。浏览目录、复制配置或在平台试用，都不会为 Agent 安装工具。",
    verify: "Plugin 容器和 Node 隔离环境需要执行端显式支持相应工具；本机的 MCP 配置不会自动进入沙箱。请在实际客户端核对连接和工具列表。",
  } : {
    title: "Where does MCP take effect?",
    description: "Browse and try MCP services here, or get settings for an external client to connect to the OpenLinker platform.",
    scope: "The web app does not currently associate or distribute MCP tools to Runtime Agents. Browsing, copying settings or trying a service does not install tools for an Agent.",
    verify: "Plugin containers and isolated Node environments require explicit runtime support for tools. Local MCP settings do not automatically enter the sandbox. Check connections and available tools in the actual client.",
  };
  return <section className="space-y-2 rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4 text-sm" aria-label={copy.title}>
    <h3 className="font-bold">{copy.title}</h3>
    <p>{copy.description}</p>
    <p>{copy.scope}</p>
    <p className="text-[color:var(--ol-muted)]">{copy.verify}</p>
  </section>;
}
