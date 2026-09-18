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
  const tool = lookup(TOOL_LABELS[isZh ? "zh" : "en"], payload.tool_kind);
  if (!tool) return null;

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
    icon: payload.tool_kind === "web_search" ? "globe" : "refresh",
    tone: "bg-[color:var(--ol-blue-soft)] text-[color:var(--ol-blue)]",
  };
}
