/**
 * 评价区空状态。
 *
 * 当前没有公开反馈数据源，因此只展示不带交互的空状态。
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
          status: "暂无数据",
          empty: "暂无公开反馈",
          body: "当前没有可展示的评分或评论。可先结合可用性、调用量、能力测评和运行记录判断是否适合使用。",
        }
      : {
          title: "User Feedback",
          status: "No data",
          empty: "No public feedback data",
          body: "There are no ratings or comments to display. Use availability, call volume, benchmarks, and run records to evaluate this Agent.",
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
