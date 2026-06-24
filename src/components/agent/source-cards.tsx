/**
 * 发布页"选择接入方式"卡片（HTTP Endpoint / Agent Node / Runtime Pull / MCP Tool）。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .source-tabs：
 * 现在是受控组件：选择会写入后端 connection_mode。
 */

export type AgentConnectionMode = "direct_http" | "runtime_ws" | "runtime_pull" | "mcp_server";

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
    key: "runtime_ws",
    icon: "WS",
    iconClass: "blue",
    title: { zh: "Agent Node / WebSocket", en: "Agent Node / WebSocket" },
    desc: {
      zh: "本地、内网或 NAT 后的 Agent 默认选择；Agent Node 出站长连接接收运行请求。",
      en: "Default for local, private-network, or NAT Agents. Agent Node receives run requests over an outbound socket.",
    },
  },
  {
    key: "runtime_pull",
    icon: "Pull",
    iconClass: "blue",
    title: { zh: "Runtime Pull 高级降级", en: "Runtime Pull Advanced Fallback" },
    desc: {
      zh: "仅当 WebSocket 无法保活时使用；runtime 用绑定令牌 heartbeat + claim 主动领取运行请求。",
      en: "Use only when WebSocket cannot stay connected. The runtime uses heartbeat + claim with its bound token.",
    },
  },
  {
    key: "mcp_server",
    icon: "MCP",
    iconClass: "amber",
    title: { zh: "已有 MCP 工具（高级）", en: "Existing MCP tool (advanced)" },
    desc: {
      zh: "不是 MCP Server 上架入口；仅用于把远程 HTTP JSON-RPC / MCP 工具包装成 Agent。",
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
