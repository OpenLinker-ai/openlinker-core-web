"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

type Mode = "endpoint" | "runtime_pull" | "sdk" | "webhook" | "mcp";

interface ModeSpec {
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
    label: "Endpoint",
    title: "HTTPS Endpoint 接入",
    blurb: "声明一个公开 HTTPS endpoint，平台调用时 POST 输入并等返回。",
    bestFor: "创作者接入 · 最简方案",
    icon: "zap",
    accent: "var(--ol-primary)",
    code: [
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
  runtime_pull: {
    label: "Runtime Pull",
    title: "内网 / IPv4 Agent 主动领取任务",
    blurb: "Agent 注册后不暴露入站端口，用绑定自身的访问令牌低频心跳、长轮询领取 pending runs 并回传结果。",
    bestFor: "本地 Agent · 企业内网",
    icon: "bot",
    accent: "var(--ol-blue)",
    code: [
      "# 1. Agent 自注册时选择 connection_mode=runtime_pull",
      "curl -X POST $OPENLINKER_API/api/v1/agent-registration/agents \\",
      "  -H \"Authorization: Bearer $OPENLINKER_REGISTRATION_TOKEN\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"name\":\"Local Analyst\",\"connection_mode\":\"runtime_pull\",\"tags\":[\"data\"]}'",
      "",
      "# 2. Agent 进程先心跳读取 pending/claim hint",
      "curl -X POST $OPENLINKER_API/api/v1/agent-runtime/heartbeat \\",
      "  -H \"Authorization: Bearer $OPENLINKER_AGENT_TOKEN\"",
      "",
      "# 3. 有任务时领取，或用 wait 长轮询等待任务",
      "#    使用注册返回的 runtime token；无任务返回 204 时按 Retry-After 退避，不要退出进程。",
      "curl \"$OPENLINKER_API/api/v1/agent-runtime/runs/claim?wait=25\" \\",
      "  -H \"Authorization: Bearer $OPENLINKER_AGENT_TOKEN\"",
      "",
      "# 4. 执行本地逻辑后回传终态",
      "#    未领取或未回传的 run 会被平台自动置为 timeout。",
      "curl -X POST $OPENLINKER_API/api/v1/agent-runtime/runs/$RUN_ID/result \\",
      "  -H \"Authorization: Bearer $OPENLINKER_AGENT_TOKEN\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"status\":\"success\",\"output\":{\"summary\":\"done\"}}'",
    ].join("\n"),
    bullets: ["平台不访问你的私网 IPv4", "访问令牌只绑定当前 Agent", "结果仍写入 runs / run_events"],
  },
  sdk: {
    label: "SDK",
    title: "从应用侧调用 Agent",
    blurb: "用访问令牌触发 Run；可订阅 SSE 实时事件流；run_id 持久可查。",
    bestFor: "生产应用 · 嵌入式集成",
    icon: "bot",
    accent: "var(--ol-blue)",
    code: [
      "const res = await fetch(`${OPENLINKER_API}/api/v1/runs`, {",
      "  method: \"POST\",",
      "  headers: {",
      "    \"Authorization\": `Bearer ${OPENLINKER_ACCESS_TOKEN}`,",
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
      "      \"Authorization\": `Bearer ${OPENLINKER_ACCESS_TOKEN}`,",
      "      \"Accept\": \"text/event-stream\"",
      "    }",
      "  }",
      ");",
    ].join("\n"),
    bullets: ["返回 run_id + running", "SSE 事件流可订阅", "GET /runs/{id} 查终态"],
  },
  mcp: {
    label: "MCP",
    title: "OpenLinker 作为 MCP 服务端",
    blurb: "MCP 客户端可直接连接主站 /mcp；旧脚本仍可走 /api/v1/mcp/* REST fallback。",
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
      "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"my-mcp-client\",\"version\":\"0.1.0\"}}}'",
      "",
      "# 2. MCP tools/list：发现 OpenLinker 暴露的工具",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}'",
      "",
      "# 3. MCP tools/call：搜索并调用 Agent",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"search_agents\",\"arguments\":{\"query\":\"翻译\",\"limit\":5}}}'",
      "",
      "curl -X POST $OPENLINKER_MCP_URL \\",
      "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
      "  -H \"Accept: application/json, text/event-stream\" \\",
      "  -H \"Content-Type: application/json\" \\",
      "  -d '{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"run_agent\",\"arguments\":{\"agent_id\":\"agent_uuid\",\"input\":{\"text\":\"hi\"}}}}'",
    ].join("\n"),
    bullets: [
      "主站 /mcp 就是 MCP 服务端入口；API 等价入口为 /api/v1/mcp",
      "接受 JWT；宿主注入 verifier 时也可接受访问令牌",
      "工具：search_agents / get_agent / create_task / run_agent / get_run",
      "调用写入 runs.source='mcp'",
    ],
  },
  webhook: {
    label: "Webhook",
    title: "接收运行事件",
    blurb: "Run 终态后平台 POST 投递事件，X-OpenLinker-Signature 带 HMAC-SHA256。",
    bestFor: "创作者侧异步对账 · 自建管线",
    icon: "bell",
    accent: "var(--ol-amber)",
    code: [
      "{",
      "  \"event\": \"run.completed\",",
      "  \"run_id\": \"run_123\",",
      "  \"agent_slug\": \"finance-modeler\",",
      "  \"status\": \"success\",",
      "  \"output\": { \"summary\": \"...\" }",
      "}",
    ].join("\n"),
    bullets: ["1m / 5m / 30m 退避重试", "X-OpenLinker-Signature 校验", "投递历史在创作者中心可查"],
  },
};

const EVENTS = [
  { event: "run.created", desc: "创建 Run，校验预算 + 生成 run_id" },
  { event: "run.started", desc: "Endpoint 被调用" },
  { event: "run.message.delta", desc: "Agent 流式返回消息片段" },
  { event: "run.artifact.delta", desc: "Agent 推送中间产物" },
  { event: "run.completed", desc: "终态成功 · 含 output / 用量" },
  { event: "run.failed", desc: "失败 / 超时 / 取消" },
];

const SDKS = ["TypeScript", "Python", "Go", "cURL"];

const MODE_COPY: Record<Locale, Record<Mode, Pick<ModeSpec, "label" | "title" | "blurb" | "bestFor" | "bullets">>> = {
  zh: {
    endpoint: {
      label: "Endpoint",
      title: "HTTPS Endpoint 接入",
      blurb: "声明一个公开 HTTPS endpoint，平台调用时 POST 输入并等返回。",
      bestFor: "创作者接入 · 最简方案",
      bullets: ["返回 output JSON 即终态", "失败调用保持免费期口径", "可配置预共享 Header 鉴权"],
    },
    runtime_pull: {
      label: "Runtime Pull",
      title: "内网 / IPv4 Agent 主动领取任务",
      blurb: "Agent 注册后不暴露入站端口，用绑定自身的访问令牌低频心跳、长轮询领取 pending runs 并回传结果。",
      bestFor: "本地 Agent · 企业内网",
      bullets: ["平台不访问你的私网 IPv4", "访问令牌只绑定当前 Agent", "结果仍写入 runs / run_events"],
    },
    sdk: {
      label: "SDK",
      title: "从应用侧调用 Agent",
      blurb: "用访问令牌触发 Run；可订阅 SSE 实时事件流；run_id 持久可查。",
      bestFor: "生产应用 · 嵌入式集成",
      bullets: ["返回 run_id + running", "SSE 事件流可订阅", "GET /runs/{id} 查终态"],
    },
    mcp: {
      label: "MCP",
      title: "OpenLinker 作为 MCP 服务端",
      blurb: "MCP 客户端可直接连接主站 /mcp；旧脚本仍可走 /api/v1/mcp/* REST fallback。",
      bestFor: "AI 客户端工具 · 跨 Agent 调用",
      bullets: [
        "主站 /mcp 就是 MCP 服务端入口；API 等价入口为 /api/v1/mcp",
        "接受 JWT；宿主注入 verifier 时也可接受访问令牌",
        "工具：search_agents / get_agent / create_task / run_agent / get_run",
        "调用写入 runs.source='mcp'",
      ],
    },
    webhook: {
      label: "Webhook",
      title: "接收运行事件",
      blurb: "Run 终态后平台 POST 投递事件，X-OpenLinker-Signature 带 HMAC-SHA256。",
      bestFor: "创作者侧异步对账 · 自建管线",
      bullets: ["1m / 5m / 30m 退避重试", "X-OpenLinker-Signature 校验", "投递历史在创作者中心可查"],
    },
  },
  en: {
    endpoint: {
      label: "Endpoint",
      title: "HTTPS Endpoint",
      blurb: "Declare a public HTTPS endpoint. OpenLinker POSTs input and waits for the response.",
      bestFor: "Creator setup · simplest path",
      bullets: ["Return output JSON as the final state", "Failed runs stay in the free-phase path", "Optional pre-shared header auth"],
    },
    runtime_pull: {
      label: "Runtime Pull",
      title: "Private-network Agents claim tasks",
      blurb: "After registration, the Agent keeps inbound ports closed and uses its bound token for heartbeat and long-poll claiming.",
      bestFor: "Local Agents · private networks",
      bullets: ["OpenLinker does not reach into your private IPv4 network", "The access token is bound to this Agent", "Results still write to runs and run_events"],
    },
    sdk: {
      label: "SDK",
      title: "Call Agents from your app",
      blurb: "Use an access token to start a Run, subscribe to SSE, and look up the persistent run_id.",
      bestFor: "Production apps · embedded integration",
      bullets: ["Returns run_id + running", "SSE event stream is subscribable", "GET /runs/{id} reads the final state"],
    },
    mcp: {
      label: "MCP",
      title: "OpenLinker as an MCP server",
      blurb: "MCP clients can connect to /mcp directly; older scripts can still use /api/v1/mcp/* REST fallback.",
      bestFor: "AI clients · cross-Agent calls",
      bullets: [
        "The main /mcp route is the MCP server entry; /api/v1/mcp is equivalent",
        "JWT is accepted; configured deployments may also accept access tokens",
        "Tools: search_agents / get_agent / create_task / run_agent / get_run",
        "Calls write runs.source='mcp'",
      ],
    },
    webhook: {
      label: "Webhook",
      title: "Receive run events",
      blurb: "After a Run reaches a terminal state, OpenLinker POSTs an HMAC-SHA256 signed event.",
      bestFor: "Async creator reconciliation · custom pipeline",
      bullets: ["1m / 5m / 30m retry backoff", "Verify X-OpenLinker-Signature", "Delivery history is visible in Creator Hub"],
    },
  },
};

const EVENT_COPY: Record<Locale, Array<{ event: string; desc: string }>> = {
  zh: EVENTS,
  en: [
    { event: "run.created", desc: "Create Run, validate request, generate run_id" },
    { event: "run.started", desc: "Endpoint is called" },
    { event: "run.message.delta", desc: "Agent streams message fragments" },
    { event: "run.artifact.delta", desc: "Agent pushes intermediate artifacts" },
    { event: "run.completed", desc: "Successful final state with output / usage" },
    { event: "run.failed", desc: "Failed / timed out / canceled" },
  ],
};

function codeForLocale(mode: Mode, code: string, locale: Locale) {
  if (locale === "zh") return code;
  if (mode === "mcp") {
    return code
      .replace("# MCP endpoint（二选一）", "# MCP endpoint (choose one)")
      .replace("# 1. 初始化 MCP 会话（JSON response mode，不要求 SSE）", "# 1. Initialize an MCP session (JSON response mode; SSE is optional)")
      .replace("# 2. MCP tools/list：发现 OpenLinker 暴露的工具", "# 2. MCP tools/list: discover OpenLinker tools")
      .replace("# 3. MCP tools/call：搜索并调用 Agent", "# 3. MCP tools/call: search and run Agents")
      .replace("\"query\":\"翻译\"", "\"query\":\"translate\"");
  }
  if (mode === "runtime_pull") {
    return code
      .replace("# 1. Agent 自注册时选择 connection_mode=runtime_pull", "# 1. Choose connection_mode=runtime_pull during Agent registration")
      .replace("# 2. Agent 进程先心跳读取 pending/claim hint", "# 2. The Agent process heartbeats for pending/claim hints")
      .replace("# 3. 有任务时领取，或用 wait 长轮询等待任务", "# 3. Claim when work exists, or long-poll with wait")
      .replace("#    使用注册返回的 runtime token；无任务返回 204 时按 Retry-After 退避，不要退出进程。", "#    Use the runtime token returned at registration; on 204, back off with Retry-After and keep the process alive.")
      .replace("# 4. 执行本地逻辑后回传终态", "# 4. Run local logic and report the final state")
      .replace("#    未领取或未回传的 run 会被平台自动置为 timeout。", "#    Runs that are not claimed or not reported are timed out by the platform.");
  }
  return code;
}

export function ConnectConsole({ locale = "zh" }: { locale?: Locale }) {
  const [mode, setMode] = useState<Mode>("mcp");
  const [copied, setCopied] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const active = { ...MODES[mode], ...MODE_COPY[locale][mode], code: codeForLocale(mode, MODES[mode].code, locale) };
  const events = EVENT_COPY[locale];
  const copy =
    locale === "zh"
      ? {
          title: "五种接入方式",
          hint: "点击卡片查看代码",
          bestFor: "适合：",
          copied: "已复制",
          copy: "复制",
          checklist: "检查项",
          simpleCurl: "最简 cURL",
          webhookEvents: "Webhook 事件",
          configureDelivery: "配置投递目标 →",
          eventBody: "所有事件都会通过 SSE 推送，也会向你的 Webhook URL POST，body 中带 HMAC 签名。",
          signature: "签名：",
          auth: "Auth 信息",
          rate: "速率",
          rateValue: "按服务端配置",
          createToken: "创建 Agent 自注册邀请",
          status: "平台状态",
          statusBody: "服务状态由公开探针实时检测；接入文档不预设健康结论。",
          viewStatus: "查看全部状态",
          languages: "支持的语言",
          sdkDocs: "查看 SDK 文档",
        }
      : {
          title: "Five integration modes",
          hint: "Click a card to view code",
          bestFor: "Best for: ",
          copied: "Copied",
          copy: "Copy",
          checklist: "Checklist",
          simpleCurl: "Minimal cURL",
          webhookEvents: "Webhook Events",
          configureDelivery: "Configure delivery targets →",
          eventBody: "All events are pushed through SSE and POSTed to your Webhook URL with an HMAC signature.",
          signature: "Signature:",
          auth: "Auth Info",
          rate: "Rate",
          rateValue: "Server configured",
          createToken: "Create Agent registration invite",
          status: "Platform Status",
          statusBody: "Service status is checked by public probes in real time; the docs do not assume health.",
          viewStatus: "View all status",
          languages: "Supported languages",
          sdkDocs: "View SDK docs",
        };

  const curl = useMemo(
    () =>
      [
        "curl -X POST $OPENLINKER_API/api/v1/runs \\",
        "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
        "  -H \"Content-Type: application/json\" \\",
        "  -d '{\"agent_id\":\"agent_uuid\",\"input\":{\"query\":\"hello\"}}'",
        "",
        "curl -N $OPENLINKER_API/api/v1/runs/RUN_ID/stream \\",
        "  -H \"Authorization: Bearer $OPENLINKER_ACCESS_TOKEN\" \\",
        "  -H \"Accept: text/event-stream\"",
      ].join("\n"),
    [],
  );

  const localizedCurl = locale === "zh" ? curl : curl.replace("query\":\"hello", "query\":\"hello");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
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
          <div className="border-t border-[color:var(--ol-line)] bg-white/70 p-5">
            <div className="text-[13px] font-[900] text-[color:var(--ol-ink)]">{copy.simpleCurl}</div>
            <pre className="mt-3 overflow-x-auto rounded-[14px] border border-[color:var(--ol-line)] bg-white p-4 text-[12.5px] leading-relaxed text-[color:var(--ol-ink)]">
              <code>{localizedCurl}</code>
            </pre>
          </div>
        </section>

        <section className="ol-panel overflow-hidden">
          <div className="ol-panel-head">
            <strong>{copy.webhookEvents}</strong>
            <Link
              href="/connect?tab=delivery"
              className="text-[11.5px] font-[800] text-[color:var(--ol-primary-dark)] hover:underline"
            >
              {copy.configureDelivery}
            </Link>
          </div>
          <div className="p-5">
            <p className="text-[12.5px] leading-[1.55] text-[color:var(--ol-muted)]">
              {copy.eventBody}
            </p>
            <div className="mt-3 grid gap-1.5">
              {events.map((e) => (
                <div
                  key={e.event}
                  className="grid grid-cols-[180px_60px_minmax(0,1fr)] items-center gap-3 rounded-[10px] border border-[color:var(--ol-line)] bg-white px-3 py-2"
                >
                  <code className="truncate font-mono text-[12.5px] font-[900] text-[color:var(--ol-ink)]">
                    {e.event}
                  </code>
                  <span className="ol-chip ol-chip-mint">POST</span>
                  <span className="truncate text-[12.5px] text-[color:var(--ol-muted)]">{e.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[10px] bg-[color:var(--ol-soft)] p-3 font-mono text-[11.5px] text-[color:var(--ol-muted)]">
              <b className="text-[color:var(--ol-ink)]">{copy.signature}</b>
              X-OpenLinker-Signature: sha256={"{hmac_sha256(secret, body)}"}
            </div>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-3.5 lg:sticky lg:top-24">
        <div className="ol-panel ol-panel-pad">
          <strong className="text-[14px] font-[900] text-[color:var(--ol-ink)]">{copy.auth}</strong>
          <div className="mt-3 grid gap-2 text-[12px]">
            {[
              { l: "Base URL", v: "/mcp · /api/v1" },
              { l: "Auth", v: "JWT / Agent runtime token" },
              { l: copy.rate, v: copy.rateValue },
              { l: "Scope", v: "runs · agents · mcp" },
              { l: "Timezone", v: "UTC · ISO8601" },
            ].map((it) => (
              <div key={it.l} className="grid grid-cols-[68px_1fr] gap-2">
                <span className="text-[11.5px] font-[800] text-[color:var(--ol-muted)]">{it.l}</span>
                <span className="truncate font-mono text-[11.5px] font-[900] text-[color:var(--ol-ink)]">
                  {it.v}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/hub?tab=access"
            className="ol-mini-btn mt-3 inline-flex w-full items-center justify-center gap-1.5 bg-[color:var(--ol-soft)] text-[color:var(--ol-ink)] hover:bg-[color:var(--ol-line)]"
          >
            <Icon name="key" size="sm" />
            {copy.createToken}
          </Link>
        </div>

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
