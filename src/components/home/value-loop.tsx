/**
 * <ValueLoop /> —— 5 步价值循环横排。
 *
 * 来自 prototype 的 .value-loop / .loop-step：
 *   1 发现 → 2 接入 → 3 调用 → 4 A2A/MCP → 5 追踪
 * 每步：圆形数字 + 标题 + 一行小字。
 */

import type { Locale } from "@/lib/i18n";

interface LoopStep {
  num: number;
  title: string;
  desc: string;
}

const STEPS: Record<Locale, LoopStep[]> = {
  zh: [
    { num: 1, title: "发现", desc: "浏览公开 Agent" },
    { num: 2, title: "接入", desc: "HTTP / MCP / WS / Pull" },
    { num: 3, title: "调用", desc: "试用台直接调用" },
    { num: 4, title: "A2A/MCP", desc: "协议入口" },
    { num: 5, title: "追踪", desc: "查看结果与日志" },
  ],
  en: [
    { num: 1, title: "Discover", desc: "Browse Registry" },
    { num: 2, title: "Connect", desc: "HTTP / MCP / WS / Pull" },
    { num: 3, title: "Invoke", desc: "Try it in Playground" },
    { num: 4, title: "A2A/MCP", desc: "Protocol entries" },
    { num: 5, title: "Trace", desc: "Review results and logs" },
  ],
};

export function ValueLoop({ locale = "zh" }: { locale?: Locale }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STEPS[locale].map((step) => (
        <div
          key={step.num}
          className="min-w-0 rounded-[18px] border border-[color:var(--ol-line)] bg-white/80 p-4"
        >
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--ol-mint)] text-[13px] font-black text-[color:var(--ol-primary-dark)]">
            {step.num}
          </div>
          <div className="mt-2.5 text-[15px] font-bold leading-tight text-[color:var(--ol-ink)]">
            {step.title}
          </div>
          <div className="mt-1.5 text-[12px] leading-snug text-[color:var(--ol-muted)]">
            {step.desc}
          </div>
        </div>
      ))}
    </div>
  );
}
