/**
 * <PreviewStack /> —— 右侧预览栈，列出 4 个核心特性。
 *
 * 来自 prototype 的 .preview-stack / .preview-card：
 *   1 Registry / 2 透明运行日志 / 3 接入方式 / 4 A2A/MCP
 * 第 1 张高亮（active 渐变背景）。
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
    title: "Agent Registry",
    desc: "公开 core Agent、Skill 声明、健康状态和运行证据集中展示。",
    active: true,
  },
  {
    num: 2,
    title: "透明的运行日志",
    desc: "每一步调用了什么工具、耗时多久、后续计划字段如何展示，一目了然。",
  },
  {
    num: 3,
    title: "接入路线",
    desc: "支持 HTTPS Endpoint、Agent Node WebSocket 和 Pull 降级。",
  },
  {
    num: 4,
    title: "A2A / MCP",
    desc: "保留协议入口、调用链、事件流和运行证据。",
  },
  ],
  en: [
    {
      num: 1,
      title: "Agent Registry",
      desc: "Public core Agents, Skill claims, health, and run evidence in one place.",
      active: true,
    },
    {
      num: 2,
      title: "Transparent run logs",
      desc: "See which tools ran, how long they took, and how future plan fields are represented.",
    },
    {
      num: 3,
      title: "Connection paths",
      desc: "Use HTTPS endpoints, Agent Node WebSocket, and Pull fallback.",
    },
    {
      num: 4,
      title: "A2A / MCP",
      desc: "Keep protocol entries, call chains, event streams, and run evidence.",
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
