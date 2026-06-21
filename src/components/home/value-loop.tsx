/**
 * <ValueLoop /> —— 5 步价值循环横排。
 *
 * 来自 prototype 的 .value-loop / .loop-step：
 *   1 发现 → 2 试用 → 3 编排预览 → 4 A2A 预览 → 5 追踪
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
  { num: 1, title: "发现", desc: "搜索可用 Agent" },
  { num: 2, title: "试用", desc: "Playground 直接跑" },
  { num: 3, title: "编排", desc: "工作流入口已承接" },
  { num: 4, title: "A2A", desc: "多 Agent 协作预览" },
  { num: 5, title: "追踪", desc: "结果、日志和免费期" },
  ],
  en: [
    { num: 1, title: "Discover", desc: "Search callable Agents" },
    { num: 2, title: "Try", desc: "Run in Playground" },
    { num: 3, title: "Compose", desc: "Reuse with workflows" },
    { num: 4, title: "A2A", desc: "Preview multi-Agent work" },
    { num: 5, title: "Trace", desc: "Results, logs, free access" },
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
