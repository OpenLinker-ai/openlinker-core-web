/**
 * <PreviewStack /> —— 首页右侧的四项核心能力概览。
 */

import type { Locale } from "@/lib/i18n";

interface PreviewItem {
  num: number;
  title: string;
  desc: string;
  active?: boolean;
}

const ITEMS: Record<Locale, PreviewItem[]> = {
  zh: [
  {
    num: 1,
    title: "Agent 目录（Registry）",
    desc: "在同一目录查看公开 Agent、Skill 声明、可用性和能力测评证据。",
    active: true,
  },
  {
    num: 2,
    title: "统一运行记录",
    desc: "按 Run ID 查看请求状态、服务端事件、消息、产物和最终结果。",
  },
  {
    num: 3,
    title: "四种连接模式",
    desc: "支持 HTTP 直连、MCP Server、Agent Node WebSocket 和 Agent Node（长轮询）。",
  },
  {
    num: 4,
    title: "A2A / MCP",
    desc: "用 MCP 连接客户端与 Agent，用 A2A 查看跨 Agent 任务关系。",
  },
  ],
  en: [
    {
      num: 1,
      title: "Agent Registry",
      desc: "Browse public Agents, Skill claims, availability, and benchmark evidence in one catalog.",
      active: true,
    },
    {
      num: 2,
      title: "Unified run records",
      desc: "Use a Run ID to inspect request status, server events, messages, artifacts, and the final result.",
    },
    {
      num: 3,
      title: "Four connection modes",
      desc: "Connect over direct HTTP, MCP Server, Agent Node WebSocket, or Runtime Pull.",
    },
    {
      num: 4,
      title: "A2A / MCP",
      desc: "Use MCP to connect clients and Agents, and A2A to inspect cross-Agent task relationships.",
    },
  ],
};

export function PreviewStack({ locale = "zh" }: { locale?: Locale }) {
  return (
    <aside className="grid gap-3.5 rounded-[30px] border border-[color:var(--ol-primary)]/20 bg-white/85 p-6 shadow-[var(--ol-shadow)]">
      {ITEMS[locale].map((item) => (
        <div
          key={item.num}
          className={
            item.active
              ? "rounded-[20px] border border-[color:var(--ol-primary)]/35 bg-gradient-to-br from-white to-[#ecfaf7] p-4"
              : "rounded-[20px] border border-[color:var(--ol-line)] bg-white p-4"
          }
        >
          <strong className="flex items-center gap-2 text-[17px] text-[color:var(--ol-ink)]">
            <span className="inline-grid h-6 w-6 flex-none place-items-center rounded-full bg-[color:var(--ol-mint)] text-[12px] font-black text-[color:var(--ol-primary-dark)]">
              {item.num}
            </span>
            {item.title}
          </strong>
          <span className="mt-2 block text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
            {item.desc}
          </span>
        </div>
      ))}
    </aside>
  );
}
