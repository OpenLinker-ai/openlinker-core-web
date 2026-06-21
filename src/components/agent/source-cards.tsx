/**
 * 发布页"选择来源" 3 张卡（HTTP Endpoint / HTTP JSON-RPC / MCP / Runtime Pull）。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .source-tabs：
 * 现在是受控组件：选择会写入后端 connection_mode。
 */

export type AgentConnectionMode = "direct_http" | "runtime_pull" | "mcp_server";

import type { Locale } from "@/lib/i18n";

interface SourceCardSpec {
  key: AgentConnectionMode;
  icon: string;
  iconClass: "" | "blue" | "amber";
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
}

const SOURCES: readonly SourceCardSpec[] = [
  {
    key: "direct_http",
    icon: "URL",
    iconClass: "",
    title: { zh: "HTTP Endpoint", en: "HTTP Endpoint" },
    desc: {
      zh: "填写可调用的 HTTPS 地址，平台负责调用与记录；当前运行免费。",
      en: "Provide a callable HTTPS URL. OpenLinker handles invocation and run history. Current runs are free.",
    },
  },
  {
    key: "mcp_server",
    icon: "MCP",
    iconClass: "amber",
    title: { zh: "HTTP JSON-RPC / MCP", en: "HTTP JSON-RPC / MCP" },
    desc: {
      zh: "已有 HTTP JSON-RPC 或 MCP Server？粘贴 URL、工具名和鉴权即可公开。",
      en: "Already hosting an HTTP JSON-RPC or MCP Server? Add its URL, tool name, and auth to list it.",
    },
  },
  {
    key: "runtime_pull",
    icon: "Pull",
    iconClass: "blue",
    title: { zh: "Runtime Pull 降级", en: "Runtime Pull Fallback" },
    desc: {
      zh: "仅当 Agent 在内网或 IPv4/NAT 后面、无法接收入站调用时，用绑定令牌主动领取运行请求。",
      en: "Use only when private-network or IPv4/NAT Agents cannot accept inbound calls. The runtime claims run requests with its bound token.",
    },
  },
] as const;

export function SourceCards({
  value,
  onChange,
  locale = "zh",
}: {
  value: AgentConnectionMode;
  onChange: (value: AgentConnectionMode) => void;
  locale?: Locale;
}) {
  return (
    <div className="ol-source-tabs">
      {SOURCES.map((s) => {
        const active = s.key === value;
        const className = [
          "ol-source-card",
          active ? "active" : "",
        ].join(" ");
        const iconClassName = [
          "ol-src-ico",
          s.iconClass,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={s.key}
            type="button"
            className={className}
            aria-pressed={active}
            onClick={() => onChange(s.key)}
          >
            <div className={iconClassName}>{s.icon}</div>
            <h3>{s.title[locale]}</h3>
            <p>{s.desc[locale]}</p>
          </button>
        );
      })}
    </div>
  );
}
