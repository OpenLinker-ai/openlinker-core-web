"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

type Mode = "endpoint" | "mcp_server" | "runtime_ws" | "sdk" | "mcp";

interface ModeSpec {
  category: string;
  label: string;
  title: string;
  blurb: string;
  bestFor: string;
  icon: IconName;
  accent: string;
  code: string;
  bullets: string[];
}

const MODES: Record<Mode, ModeSpec> = {
  endpoint: {
    category: "Agent connection",
    label: "direct_http",
    title: "Agent 接入：direct_http",
    blurb: "声明一个公开 HTTPS endpoint，当前实例调用时 POST 输入并等待返回。",
    bestFor: "Agent 所有者接入 · 最简方案",
    icon: "zap",
    accent: "var(--ol-primary)",
    code: [
      "# 保存 Agent 时选择 connection_mode=direct_http，并填写 endpoint_url",
      "# 运行时当前实例会向该 endpoint 发送：",
      "POST https://your-agent.example/run",
      "Content-Type: application/json",
      "X-OpenLinker-Run-Id: run_123",
      "X-OpenLinker-User-Id: user_456",
      "",
      "{",
      "  \"input\": { \"query\": \"生成一份竞品定价摘要\" },",
      "  \"metadata\": { \"source\": \"playground\" },",
      "  \"run_id\": \"run_123\"",
      "}",
    ].join("\n"),
    bullets: ["返回 output JSON 即终态", "失败调用只记录状态", "可配置预共享 Header 鉴权"],
  },
  mcp_server: {
    category: "Agent connection",
    label: "MCP Server",
    title: "Agent 接入：mcp_server",
    blurb: "把已有远程 MCP tools/call 工具包装成 Agent；这和客户端调用 OpenLinker 的 /mcp 入口是两个方向。",
    bestFor: "已有远程 MCP 工具",
    icon: "target",
    accent: "var(--ol-amber)",
    code: [
      "{",
      "  \"connection_mode\": \"mcp_server\",",
      "  \"endpoint_url\": \"https://your-mcp.example/mcp\",",
      "  \"mcp_tool_name\": \"analyze_document\",",
      "  \"visibility\": \"private\"",
      "}",
    ].join("\n"),
    bullets: ["目标是远程 HTTP MCP Server", "必须填写 mcp_tool_name", "不是 OpenLinker /mcp 客户端配置"],
  },
  runtime_ws: {
    category: "Agent connection",
    label: "Agent Node",
    title: "Agent Node：runtime_ws / runtime_pull",
    blurb: "Agent Node 首选 runtime_ws 出站长连接；WebSocket 无法稳定维持时再使用 runtime_pull。",
    bestFor: "本地 Agent · 企业内网",
    icon: "bot",
    accent: "var(--ol-blue)",
    code: [
      "# 1. Agent 自注册时选择 connection_mode=runtime_ws",
      "curl -X POST $OPENLINKER_API/api/v1/agent-registration/agents \\",
      "  -H \"Authorization: Bearer $OPENLINKER_AGENT_TOKEN\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"name\":\"Local Analyst\",\"connection_mode\":\"runtime_ws\",\"tags\":[\"data\"]}'",
      "",
      "# 2. 启动 OpenLinker Agent Node，协议由 node 负责",
      "cd openlinker-agent-node",
      "OPENLINKER_API_BASE=$OPENLINKER_API \\",
      "OPENLINKER_AGENT_TOKEN=$OPENLINKER_AGENT_TOKEN \\",
      "OPENLINKER_AGENT_NODE_ADAPTER=openclaw \\",
      "OPENLINKER_AGENT_NODE_HTTP_URL=http://127.0.0.1:18080/run \\",
      "go run ./cmd/openlinker-agent-node",
      "",
      "# 3. 后端只实现业务接口；node 负责 run.assigned、run.event、run.result 和 localhost helper A2A。",
      "#    WebSocket 无法维持时，再降级到 runtime_pull heartbeat + claim。",
    ].join("\n"),
    bullets: ["当前实例不访问你的私网 IPv4", "runtime_ws 实时接收调用", "runtime_pull 用于长连接降级"],
  },
  sdk: {
    category: "Invocation",
    label: "SDK",
    title: "从应用侧调用 Agent",
    blurb: "用 User Token 触发 Run；可订阅 SSE 实时事件流；run_id 持久可查。",
    bestFor: "生产应用 · 嵌入式集成",
    icon: "bot",
    accent: "var(--ol-blue)",
    code: [
      "const res = await fetch(`${OPENLINKER_API}/api/v1/runs`, {",
      "  method: \"POST\",",
      "  headers: {",
      "    \"Authorization\": `Bearer ${OPENLINKER_USER_TOKEN}`,",
      "    \"Content-Type\": \"application/json\"",
      "  },",
      "  body: JSON.stringify({",
      "    agent_id: \"agent_uuid\",",
      "    input: { query: \"检查供应商报价\" }",
      "  })",
      "});",
      "",
      "const run = await res.json();",
      "console.log(run.run_id, run.status);",
      "",
      "const events = await fetch(",
      "  `${OPENLINKER_API}/api/v1/runs/${run.run_id}/stream`,",
      "  {",
      "    headers: {",
      "      \"Authorization\": `Bearer ${OPENLINKER_USER_TOKEN}`,",
      "      \"Accept\": \"text/event-stream\"",
      "    }",
      "  }",
      ");",
    ].join("\n"),
    bullets: ["返回 run_id + running", "SSE 事件流可订阅", "GET /runs/{id} 查终态"],
  },
  mcp: {
    category: "Invocation",
    label: "MCP Client",
    title: "调用入口：OpenLinker MCP",
    blurb: "MCP 客户端可直接连接主站 /mcp；旧脚本仍可使用 /api/v1/mcp/* REST 兼容接口。",
    bestFor: "AI 客户端工具 · 跨 Agent 调用",
    icon: "target",
    accent: "var(--ol-green)",
    code: [
      "# MCP endpoint（二选一）",
      "export OPENLINKER_MCP_URL=$OPENLINKER_WEB/mcp",
      "# export OPENLINKER_MCP_URL=$OPENLINKER_API/api/v1/mcp",
      "",
      "# 1. 初始化 MCP 会话（JSON response mode，不要求 SSE）",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"my-mcp-client\",\"version\":\"0.1.0\"}}}'",
      "",
      "# 2. MCP tools/list：发现 OpenLinker 暴露的工具",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}'",
      "",
      "# 3. MCP tools/call：搜索并调用 Agent",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"search_agents\",\"arguments\":{\"query\":\"翻译\",\"limit\":5}}}'",
      "",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"run_agent\",\"arguments\":{\"agent_id\":\"agent_uuid\",\"input\":{\"text\":\"hi\"}}}}'",
    ].join("\n"),
    bullets: [
      "主站 /mcp 就是 MCP 服务端入口；API 等价入口为 /api/v1/mcp",
      "仅接受 User Token（ol_user_...），不使用网页登录会话",
      "工具：search_agents / get_agent / create_task / run_agent / get_run",
      "调用写入 runs.source='mcp'",
    ],
  },
};

const SDKS = ["TypeScript", "Python", "Go", "cURL"];

const MODE_COPY: Record<Locale, Record<Mode, Pick<ModeSpec, "category" | "label" | "title" | "blurb" | "bestFor" | "bullets">>> = {
  zh: {
    endpoint: {
      category: "Agent 接入",
      label: "direct_http",
      title: "Agent 接入：direct_http",
      blurb: "声明一个公网 HTTPS 调用端点，当前实例调用时 POST 输入并等待返回。",
      bestFor: "Agent 所有者接入 · 最简方案",
      bullets: ["返回 output JSON 即终态", "失败调用保留错误状态", "可配置预共享 Header 鉴权"],
    },
    mcp_server: {
      category: "Agent 接入",
      label: "MCP Server",
      title: "Agent 接入：mcp_server",
      blurb: "把已有远程 MCP tools/call 工具包装成 Agent；这和客户端调用 OpenLinker 的 /mcp 入口是两个方向。",
      bestFor: "已有远程 MCP 工具",
      bullets: ["目标是远程 HTTP MCP Server", "必须填写 mcp_tool_name", "不是 OpenLinker /mcp 客户端配置"],
    },
    runtime_ws: {
      category: "Agent 接入",
      label: "Agent Node",
      title: "Agent Node：runtime_ws / runtime_pull",
      blurb: "Agent Node 首选 runtime_ws 出站长连接；WebSocket 无法稳定维持时再使用 runtime_pull。",
      bestFor: "本地 Agent · 企业内网",
      bullets: ["当前实例不访问你的私网 IPv4", "runtime_ws 实时接收调用", "runtime_pull 用于长连接降级"],
    },
    sdk: {
      category: "调用入口",
      label: "SDK",
      title: "从应用侧调用 Agent",
      blurb: "用 User Token 触发运行；可订阅 SSE 实时事件流；run_id 持久可查。",
      bestFor: "生产应用 · 嵌入式集成",
      bullets: ["返回 run_id + running", "SSE 事件流可订阅", "GET /runs/{id} 查终态"],
    },
    mcp: {
      category: "调用入口",
      label: "MCP 客户端",
      title: "调用入口：OpenLinker MCP",
      blurb: "MCP 客户端可直接连接主站 /mcp；旧脚本仍可使用 /api/v1/mcp/* REST 兼容接口。",
      bestFor: "AI 客户端工具 · 跨 Agent 调用",
      bullets: [
        "主站 /mcp 就是 MCP 服务端入口；API 等价入口为 /api/v1/mcp",
        "仅接受 User Token（ol_user_...），不使用网页登录会话",
        "工具：search_agents / get_agent / create_task / run_agent / get_run",
        "调用写入 runs.source='mcp'",
      ],
    },
  },
  en: {
    endpoint: {
      category: "Agent connection",
      label: "direct_http",
      title: "Agent connection: direct_http",
      blurb: "Declare a public HTTPS endpoint. OpenLinker POSTs input and waits for the response.",
      bestFor: "Agent owner setup · simplest path",
      bullets: ["Return output JSON as the final state", "Failed invocations retain their error state", "Optional pre-shared header auth"],
    },
    mcp_server: {
      category: "Agent connection",
      label: "MCP Server",
      title: "Agent connection: mcp_server",
      blurb: "Wrap an existing remote MCP tools/call tool as an Agent. This is the opposite direction from clients calling OpenLinker's /mcp endpoint.",
      bestFor: "Existing remote MCP tools",
      bullets: ["Target a remote HTTP MCP Server", "mcp_tool_name is required", "Not an OpenLinker /mcp client configuration"],
    },
    runtime_ws: {
      category: "Agent connection",
      label: "Agent Node",
      title: "Agent Node: runtime_ws / runtime_pull",
      blurb: "Agent Node prefers an outbound runtime_ws connection and falls back to runtime_pull only when WebSocket cannot stay connected.",
      bestFor: "Local Agents · private networks",
      bullets: ["OpenLinker does not reach into your private IPv4 network", "runtime_ws receives calls in real time", "runtime_pull is the connection fallback"],
    },
    sdk: {
      category: "Invocation",
      label: "SDK",
      title: "Invoke Agents from your app",
      blurb: "Use a User Token to start a Run, subscribe to SSE, and look up the persistent run_id.",
      bestFor: "Production apps · embedded integration",
      bullets: ["Returns run_id + running", "SSE event stream is subscribable", "GET /runs/{id} reads the final state"],
    },
    mcp: {
      category: "Invocation",
      label: "MCP Client",
      title: "Invocation: OpenLinker MCP",
      blurb: "MCP clients can connect to /mcp directly; older scripts can keep using the /api/v1/mcp/* REST compatibility endpoints.",
      bestFor: "AI clients · cross-Agent invocation",
      bullets: [
        "The main /mcp route is the MCP server entry; /api/v1/mcp is equivalent",
        "User Tokens only (ol_user_...); browser sessions are not used",
        "Tools: search_agents / get_agent / create_task / run_agent / get_run",
        "Invocations are recorded as runs.source='mcp'",
      ],
    },
  },
};

function codeForLocale(mode: Mode, code: string, locale: Locale) {
  if (locale === "zh") return code;
  if (mode === "endpoint") {
    return code
      .replace("# 保存 Agent 时选择 connection_mode=direct_http，并填写 endpoint_url", "# Save the Agent with connection_mode=direct_http and an endpoint_url")
      .replace("# 运行时当前实例会向该 endpoint 发送：", "# At runtime, this instance sends:");
  }
  if (mode === "mcp") {
    return code
      .replace("# MCP endpoint（二选一）", "# MCP endpoint (choose one)")
      .replace("# 1. 初始化 MCP 会话（JSON response mode，不要求 SSE）", "# 1. Initialize an MCP session (JSON response mode; SSE is optional)")
      .replace("# 2. MCP tools/list：发现 OpenLinker 暴露的工具", "# 2. MCP tools/list: discover OpenLinker tools")
      .replace("# 3. MCP tools/call：搜索并调用 Agent", "# 3. MCP tools/call: search and invoke Agents")
      .replace("\"query\":\"翻译\"", "\"query\":\"translate\"");
  }
  if (mode === "runtime_ws") {
    return code
      .replace("# 1. Agent 自注册时选择 connection_mode=runtime_ws", "# 1. Choose connection_mode=runtime_ws during Agent registration")
      .replace("# 2. 启动 OpenLinker Agent Node，协议由 node 负责", "# 2. Start OpenLinker Agent Node; the node owns the protocol")
      .replace("# 3. 后端只实现业务接口；node 负责 run.assigned、run.event、run.result 和 localhost helper A2A。", "# 3. The backend only implements business logic; the node owns run.assigned, run.event, run.result, and localhost helper A2A.")
      .replace("#    WebSocket 无法维持时，再降级到 runtime_pull heartbeat + claim。", "#    Fall back to runtime_pull heartbeat + claim only when WebSocket cannot stay connected.");
  }
  return code;
}

export function ConnectConsole({ locale = "zh" }: { locale?: Locale }) {
  const [mode, setMode] = useState<Mode>("endpoint");
  const [copied, setCopied] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const active = { ...MODES[mode], ...MODE_COPY[locale][mode], code: codeForLocale(mode, MODES[mode].code, locale) };
  const copy =
    locale === "zh"
      ? {
          title: "按用途选择入口",
          hint: "点击卡片查看代码",
          bestFor: "适合：",
          copied: "已复制",
          copy: "复制",
          checklist: "检查项",
          simpleCurl: "最简 cURL",
          auth: "User Token 调用",
          tokenStatus: "User Token 已纳入 Core 正式契约，本地签发、scope 校验与撤销正在实现；已配置外部兼容验证器的部署可继续使用现有 ol_user_* Token。",
          agentAuth: "Agent 接入凭据",
          agentAuthBody: "Agent Node 使用 Agent Token 完成注册并标识运行身份；direct_http 与 mcp_server 的目标端鉴权在 Agent 配置中单独设置。",
          rate: "速率",
          rateValue: "按服务端配置",
          baseURL: "基础 URL",
          authLabel: "鉴权",
          scope: "权限范围",
          timezone: "时区",
          userTokenSettings: "查看 User Token 状态",
          agentTokenAccess: "管理 Agent Token",
          status: "实例状态",
          statusBody: "当前实例的服务状态由探针实时检测；开发者文档不预设健康结论。",
          viewStatus: "查看全部状态",
          languages: "支持的语言",
          sdkDocs: "查看 SDK 文档",
        }
      : {
          title: "Choose a path by purpose",
          hint: "Click a card to view code",
          bestFor: "Best for: ",
          copied: "Copied",
          copy: "Copy",
          checklist: "Checklist",
          simpleCurl: "Minimal cURL",
          auth: "User Token calls",
          tokenStatus: "User Tokens are part of the defined Core contract. Local issuance, scope validation, and revocation are in progress; deployments with the external compatibility verifier can keep using existing ol_user_* tokens.",
          agentAuth: "Agent connection credentials",
          agentAuthBody: "Agent Node uses an Agent Token for registration and runtime identity. Target authentication for direct_http and mcp_server is configured separately on the Agent.",
          rate: "Rate",
          rateValue: "Server configured",
          baseURL: "Base URL",
          authLabel: "Auth",
          scope: "Scope",
          timezone: "Timezone",
          userTokenSettings: "View User Token status",
          agentTokenAccess: "Manage Agent Tokens",
          status: "Instance status",
          statusBody: "This instance is checked by probes in real time; the docs do not assume health.",
          viewStatus: "View all status",
          languages: "Supported languages",
          sdkDocs: "View SDK docs",
        };

  const curl = useMemo(
    () =>
      [
        "curl -X POST $OPENLINKER_API/api/v1/runs \\",
        "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
        "  -H \"Content-Type: application/json\" \\",
        "  -d '{\"agent_id\":\"agent_uuid\",\"input\":{\"query\":\"hello\"}}'",
        "",
        "curl -N $OPENLINKER_API/api/v1/runs/RUN_ID/stream \\",
        "  -H \"Authorization: Bearer $OPENLINKER_USER_TOKEN\" \\",
        "  -H \"Accept: text/event-stream\"",
      ].join("\n"),
    [],
  );

  const localizedCurl = locale === "zh" ? curl : curl.replace("query\":\"hello", "query\":\"hello");
  const isInvocation = mode === "sdk" || mode === "mcp";

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to the textarea fallback below.
      }
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        return true;
      } finally {
        document.body.removeChild(textarea);
      }
    } catch {
      return false;
    }
  };

  const copyCode = async () => {
    const copiedOK = await copyToClipboard(active.code);
    setCopied(copiedOK);
    if (copiedOK) window.setTimeout(() => setCopied(false), 1200);
  };

  const showSdkDocs = () => {
    setMode("sdk");
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[18px] font-[900] text-[color:var(--ol-ink)]">{copy.title}</h2>
            <span className="text-[11.5px] font-[800] text-[color:var(--ol-subtle)]">
              {copy.hint}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(MODES) as Mode[]).map((id) => {
              const m = MODES[id];
              const mCopy = MODE_COPY[locale][id];
              const isActive = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className="ol-panel flex cursor-pointer flex-col gap-2.5 p-4 text-left transition-all"
                  style={{
                    borderColor: isActive ? "rgba(15,145,135,0.45)" : "var(--ol-line)",
                    background: isActive ? "linear-gradient(135deg, #fff, #effbf8)" : "#fff",
                    boxShadow: isActive ? "0 8px 24px rgba(15,145,135,0.14)" : "none",
                  }}
                >
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[12px]"
                    style={{
                    background: isActive ? m.accent : "var(--ol-soft)",
                    color: isActive ? "#fff" : m.accent,
                    }}
                  >
                    <Icon name={m.icon} size="md" />
                  </span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.08em] text-[color:var(--ol-subtle)]">
                      {mCopy.category}
                    </div>
                    <div className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{mCopy.label}</div>
                    <p className="mt-1.5 text-[12px] leading-snug text-[color:var(--ol-muted)]">
                      {mCopy.blurb}
                    </p>
                  </div>
                  <div className="mt-auto text-[11px] font-[800] text-[color:var(--ol-subtle)]">
                    {copy.bestFor}{mCopy.bestFor}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id="sdk" ref={detailRef} className="ol-panel scroll-mt-24 overflow-hidden">
          <div className="ol-panel-head">
            <strong className="inline-flex items-center gap-2.5">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] text-white"
                style={{ background: active.accent }}
              >
                <Icon name={active.icon} size="sm" />
              </span>
              {active.title}
            </strong>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--ol-line)] bg-white px-2.5 text-[12px] font-bold text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/40"
            >
              <Icon name={copied ? "check" : "clipboard"} size="sm" />
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
            <pre className="overflow-x-auto rounded-[16px] bg-[#102033] p-4 text-[12.5px] leading-relaxed text-white">
              <code>{active.code}</code>
            </pre>
            <aside className="rounded-[16px] bg-[color:var(--ol-soft)] p-4">
              <h3 className="text-[13px] font-[900] text-[color:var(--ol-ink)]">{copy.checklist}</h3>
              <div className="mt-3 grid gap-2">
                {active.bullets.map((b) => (
                  <div
                    key={b}
                    className="flex gap-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]"
                  >
                    <Icon name="check" size="sm" className="mt-0.5 text-[color:var(--ol-green)]" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
          {mode === "sdk" ? (
            <div className="border-t border-[color:var(--ol-line)] bg-white/70 p-5">
              <div className="text-[13px] font-[900] text-[color:var(--ol-ink)]">{copy.simpleCurl}</div>
              <pre className="mt-3 overflow-x-auto rounded-[14px] border border-[color:var(--ol-line)] bg-white p-4 text-[12.5px] leading-relaxed text-[color:var(--ol-ink)]">
                <code>{localizedCurl}</code>
              </pre>
            </div>
          ) : null}
        </section>

      </div>

      <aside className="grid content-start gap-3.5 lg:sticky lg:top-24">
        {isInvocation ? (
          <div className="ol-panel ol-panel-pad">
            <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.auth}</strong>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">{copy.tokenStatus}</p>
            <div className="mt-3 grid gap-2 text-[12px]">
              {[
                { l: copy.baseURL, v: "/mcp · /api/v1" },
                { l: copy.authLabel, v: "Bearer ol_user_..." },
                { l: copy.rate, v: copy.rateValue },
                { l: copy.scope, v: "agents:read · agents:run · runs:read · tasks:write" },
                { l: copy.timezone, v: "UTC · ISO8601" },
              ].map((it) => (
                <div key={it.l} className="grid grid-cols-[68px_1fr] gap-2">
                  <span className="text-[11.5px] font-[800] text-[color:var(--ol-muted)]">{it.l}</span>
                  <span className="break-words font-mono text-[11.5px] font-[900] text-[color:var(--ol-ink)]">
                    {it.v}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/settings/user-tokens"
              className="ol-mini-btn mt-3 inline-flex w-full items-center justify-center gap-1.5 bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
            >
              <Icon name="key" size="sm" />
              {copy.userTokenSettings}
            </Link>
          </div>
        ) : (
          <div className="ol-panel ol-panel-pad">
            <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.agentAuth}</strong>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ol-muted)]">{copy.agentAuthBody}</p>
            <Link
              href="/hub/access"
              className="ol-mini-btn mt-3 inline-flex w-full items-center justify-center gap-1.5 bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
            >
              <Icon name="bot" size="sm" />
              {copy.agentTokenAccess}
            </Link>
          </div>
        )}

        <div className="ol-panel ol-panel-pad">
          <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.status}</strong>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.statusBody}
          </p>
          <Link
            href="/status"
            className="ol-mini-btn mt-3 inline-flex w-full items-center justify-center bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
          >
            {copy.viewStatus}
          </Link>
        </div>

        <div
          className="ol-panel ol-panel-pad"
          style={{ background: "linear-gradient(135deg, #effbf8, #fff)" }}
        >
          <strong className="text-[13px] font-[900] text-[color:var(--ol-primary-dark)]">
            {copy.languages}
          </strong>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SDKS.map((s) => (
              <span key={s} className="ol-chip ol-chip-mint">
                {s}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={showSdkDocs}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-[900] text-[color:var(--ol-primary-dark)] hover:underline"
          >
            {copy.sdkDocs} <Icon name="arrow-up-right" size="sm" />
          </button>
        </div>
      </aside>
    </div>
  );
}
