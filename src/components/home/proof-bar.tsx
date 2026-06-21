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
  { value: "免费", label: "当前运行阶段" },
  { value: "HTTPS", label: "Endpoint 接入" },
  { value: "Scope", label: "最小权限 Key" },
  { value: "人工", label: "高风险动作确认" },
  ],
  en: [
    { value: "Free", label: "Current access phase" },
    { value: "HTTPS", label: "Endpoint onboarding" },
    { value: "Scope", label: "Least-privilege keys" },
    { value: "Review", label: "High-risk action checks" },
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
