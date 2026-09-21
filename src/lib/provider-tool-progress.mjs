// Provider 工具进度事件的展示文案。
//
// Agent Node 的 providerstream 把 Codex、Claude 的每次工具调用都归一成同一种
// run.status.changed 负载：{ provider, phase, tool_kind }，不带命令、参数或结果。
// 这里只按这三个字段出文案；未知的 provider / 阶段 / 工具类型返回 null，
// 交给调用方的通用分支，不猜测。

const PROVIDER_NAMES = {
  codex: "Codex",
  claude: "Claude",
};

const TOOL_LABELS = {
  zh: {
    web_search: "联网搜索",
    command: "运行命令",
    mcp_tool: "MCP 工具",
    // Claude 的 Read、Edit、Grep 等内置工具都归到这一类。
    tool: "调用工具",
  },
  en: {
    web_search: "Web search",
    command: "Command",
    mcp_tool: "MCP tool",
    tool: "Tool call",
  },
};

// tool_kind 对所有 MCP 调用都是 mcp_tool，而可配置的 MCP 服务器不止浏览器，
// 所以「这一轮到底用了浏览器还是只是搜索」不能从 kind 读出来。Plugin 的可信
// broker 会在负载上带 tool_scope，只有它出现时才按浏览器出文案；缺失就退回
// 通用 MCP 文案，不做推断。
// 标签要同时能填进三个阶段模板（正在X / X完成 / X失败），所以用动名词而不是工具名。
const TOOL_SCOPE_LABELS = {
  zh: { browser_session: "浏览网页" },
  en: { browser_session: "Page browsing" },
};

const PHASES = new Set(["started", "completed", "failed"]);

// 负载来自网络，只认字符串自有键：String(["codex"]) 会变成 "codex"，
// "toString"、"constructor" 这类键会从原型链上查到函数。
function lookup(table, value) {
  return typeof value === "string" && Object.hasOwn(table, value) ? table[value] : null;
}

export function providerToolProgressPresentation(payload, locale) {
  const provider = lookup(PROVIDER_NAMES, payload?.provider);
  if (!provider) return null;
  const phase = payload.phase;
  if (typeof phase !== "string" || !PHASES.has(phase)) return null;
  const isZh = locale === "zh";
  const tool =
    lookup(TOOL_SCOPE_LABELS[isZh ? "zh" : "en"], payload.tool_scope) ??
    lookup(TOOL_LABELS[isZh ? "zh" : "en"], payload.tool_kind);
  if (!tool) return null;
  const browser = lookup(TOOL_SCOPE_LABELS.en, payload.tool_scope) !== null;

  if (phase === "failed") {
    return {
      title: isZh ? `${tool}失败` : `${tool} failed`,
      detail: isZh
        ? `${provider} 未能完成这次工具操作，正在决定是否继续或降级处理。`
        : `${provider} could not complete this tool operation and is deciding whether to continue or fall back.`,
      icon: "warn",
      tone: "bg-[#FFF4D8] text-[#9A6200]",
    };
  }
  if (phase === "completed") {
    return {
      title: isZh ? `${tool}完成` : `${tool} completed`,
      detail: isZh ? `${provider} 已收到工具结果。` : `${provider} received the tool result.`,
      icon: "check",
      tone: "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]",
    };
  }
  return {
    title: isZh ? `正在${tool}` : `${tool} in progress`,
    detail: isZh
      ? `${provider} 已启动工具，正在等待结果。`
      : `${provider} started the tool and is waiting for its result.`,
    icon: payload.tool_kind === "web_search" || browser ? "globe" : "refresh",
    tone: "bg-[color:var(--ol-blue-soft)] text-[color:var(--ol-blue)]",
  };
}
