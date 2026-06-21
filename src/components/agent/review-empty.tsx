/**
 * 评价区空状态。
 *
 * Phase 1 没有评价系统，按 PNG 占位：
 *   - 文案 "还没有用户评价"
 *   - 副文 解释当前阶段
 *   - 按钮 "成为第一个评价" disabled，title 提示 v2 启用
 *
 * 用 ol-panel 包裹保持视觉一致。
 */

import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

export function ReviewEmpty({ locale = "zh" }: { locale?: Locale }) {
  const copy =
    locale === "zh"
      ? {
          title: "用户反馈",
          status: "后续开放",
          empty: "还没有用户反馈",
          body: "这个 Agent 还没有累计公开反馈。等反馈能力开放后，会展示评分、评论和调用证据。",
        }
      : {
          title: "User Feedback",
          status: "Planned",
          empty: "No public feedback yet",
          body: "This Agent does not have public feedback yet. Ratings, comments, and run evidence will appear when that capability is available.",
        };

  return (
    <div className="ol-panel ol-panel-pad">
      <div className="flex items-center justify-between">
        <strong className="text-[15px] font-black text-[color:var(--ol-ink)]">
          {copy.title}
        </strong>
        <span className="text-[12px] text-[color:var(--ol-muted)]">
          {copy.status}
        </span>
      </div>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[color:var(--ol-subtle)]">
          <Icon name="message" size="lg" />
        </span>
        <p className="text-[13.5px] font-bold text-[color:var(--ol-ink)]">
          {copy.empty}
        </p>
        <p className="max-w-sm text-[12px] text-[color:var(--ol-muted)]">
          {copy.body}
        </p>
      </div>
    </div>
  );
}
