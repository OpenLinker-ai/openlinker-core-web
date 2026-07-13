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
    { value: "3 种", label: "Agent 连接模式" },
    { value: "WS + 长轮询", label: "Runtime Worker 双通道" },
    { value: "Run / Attempt", label: "派发、事件与结果" },
    { value: "User / Agent", label: "两类用户可见 Token" },
  ],
  en: [
    { value: "3 modes", label: "Agent connections" },
    { value: "WS + long poll", label: "Runtime Worker dual transport" },
    { value: "Run / Attempt", label: "Dispatch, events, and results" },
    { value: "User / Agent", label: "Two user-facing token types" },
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
