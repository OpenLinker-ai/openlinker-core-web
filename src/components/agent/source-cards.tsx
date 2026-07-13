/**
 * 发布页"选择接入方式"卡片（HTTP Endpoint / SDK Runtime Worker / MCP Tool）。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .source-tabs：
 * 现在是受控组件：选择会写入后端 connection_mode。
 */

export type AgentConnectionMode = "direct_http" | "runtime" | "mcp_server";

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
    title: { zh: "HTTP 端点", en: "HTTP Endpoint" },
    desc: {
      zh: "填写可调用的 HTTPS 地址，当前实例负责发起调用并记录 Run。",
      en: "Provide a callable HTTPS URL. This OpenLinker Core instance invokes it and records each Run.",
    },
  },
  {
    key: "runtime",
    icon: "Node",
    iconClass: "blue",
    title: { zh: "Runtime Worker", en: "Runtime Worker" },
    desc: {
      zh: "使用 Go、TypeScript 或 Python SDK 直接运行，适合本地、内网与 NAT 后的 Agent。已有服务可暂用 Agent Node Adapter。",
      en: "Run directly with the Go, TypeScript, or Python SDK. Existing backends can temporarily use Agent Node Adapter.",
    },
  },
  {
    key: "mcp_server",
    icon: "MCP",
    iconClass: "amber",
    title: { zh: "已有 MCP 工具（高级）", en: "Existing MCP tool (advanced)" },
    desc: {
      zh: "用于把已有远程 HTTP JSON-RPC / MCP 工具包装成 Agent，不是独立部署 MCP Server 的入口。",
      en: "Not the MCP Server listing flow. Use only to wrap a remote HTTP JSON-RPC / MCP tool as an Agent.",
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
