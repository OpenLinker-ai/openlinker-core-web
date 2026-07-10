/**
 * <ProofBar /> —— 4 个数据指标横排。
 *
 * 来自 prototype 的 .proof-bar / .proof-stat：
 *   当前运行阶段的核心规则与能力。
 */

import type { Locale } from "@/lib/i18n";

interface ProofStat {
  value: string;
  label: string;
}

const STATS: Record<Locale, ProofStat[]> = {
  zh: [
    { value: "4 种", label: "Agent 连接模式" },
    { value: "A2A / MCP", label: "开放协议入口" },
    { value: "Run ID", label: "关联状态、事件与结果" },
    { value: "已定义", label: "User Token 契约" },
  ],
  en: [
    { value: "4 modes", label: "Agent connections" },
    { value: "A2A / MCP", label: "Open protocol entry points" },
    { value: "Run ID", label: "Links status, events, and results" },
    { value: "Defined", label: "User Token contract" },
  ],
};

export function ProofBar({ locale = "zh" }: { locale?: Locale }) {
  return (
    <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[color:var(--ol-line)] py-3.5">
      {STATS[locale].map((stat) => (
        <div key={stat.label}>
          <div className="text-[22px] font-extrabold text-[color:var(--ol-ink)]">
            {stat.value}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--ol-muted)]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
