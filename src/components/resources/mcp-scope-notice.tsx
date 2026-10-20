import type { Locale } from "@/lib/i18n";

export function McpScopeNotice({ locale }: { locale: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "MCP 在哪里生效？",
          description:
            "这里可以浏览和试用 MCP 服务，并查看外部客户端连接 OpenLinker 平台的配置。",
          scope:
            "要让 Runtime Agent 使用工具，请在该 Agent 的“技能与工具 → MCP 工具”中选择并保存。浏览目录或在平台试用不会自动关联。",
          verify:
            "兼容的 Plugin 和 Node 会在下一次运行自动提供已选择的工具。可在关联面板查看模型是否发现工具、是否调用成功；本机的其他 MCP 配置不会自动下发。",
        }
      : {
          title: "Where does MCP take effect?",
          description:
            "Browse and try MCP services here, or get settings for an external client to connect to the OpenLinker platform.",
          scope:
            "To enable tools for a Runtime Agent, select and save them under its Skills and tools → MCP tools panel. Browsing or trying a service does not automatically associate it.",
          verify:
            "Compatible Plugin and Node hosts expose the selected tools on the next Run. The association panel shows discovery and successful calls. Other local MCP settings are not automatically distributed.",
        };
  return (
    <section
      className="space-y-2 rounded-xl border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] p-4 text-sm"
      aria-label={copy.title}
    >
      <h3 className="font-bold">{copy.title}</h3>
      <p>{copy.description}</p>
      <p>{copy.scope}</p>
      <p className="text-[color:var(--ol-muted)]">{copy.verify}</p>
    </section>
  );
}
