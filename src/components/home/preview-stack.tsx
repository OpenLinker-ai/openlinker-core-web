/**
 * <PreviewStack /> —— 右侧预览栈，列出 4 个核心特性。
 *
 * 来自 prototype 的 .preview-stack / .preview-card：
 *   1 任务驱动入口 / 2 透明的运行日志 / 3 可视化工作流 / 4 多 Agent 协作
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
    title: "任务驱动入口",
    desc: "新用户描述需求即可，平台推荐 3 个 Agent 方案。",
    active: true,
  },
  {
    num: 2,
    title: "透明的运行日志",
    desc: "每一步调用了什么工具、耗时多久、后续计划字段如何展示，一目了然。",
  },
  {
    num: 3,
    title: "工作流路线",
    desc: "入口已补齐，当前先从单 Agent 调用沉淀可复用流程。",
  },
  {
    num: 4,
    title: "A2A 路线",
    desc: "复杂任务拆解、子 Agent 状态和汇总报告会分阶段上线。",
  },
  ],
  en: [
    {
      num: 1,
      title: "Task-first entry",
      desc: "New users describe the outcome and get matched with Agent options.",
      active: true,
    },
    {
      num: 2,
      title: "Transparent run logs",
      desc: "See which tools ran, how long they took, and how future plan fields are represented.",
    },
    {
      num: 3,
      title: "Workflow path",
      desc: "Compose reusable flows once single-Agent runs produce stable evidence.",
    },
    {
      num: 4,
      title: "A2A path",
      desc: "Complex task delegation, child-Agent status, and summaries will arrive in stages.",
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
