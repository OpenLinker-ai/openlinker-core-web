/**
 * 设置页左侧导航（240px 宽）。
 *
 * 视觉来自 prototype/openlinker-flow-23-settings.png + #flow-settings：
 *   - 已落地设置入口（带左侧 ico 方块 + 标签）
 *   - active 项：mint 背景 + primary-dark 文字 + ico 实心 primary 背景
 *   - 其余项：muted 文字 + soft 背景 ico；hover 高亮
 *   - 底部 dashed 边框小帮助卡
 *
 * 行为：每个已实现设置分区都有独立分页 URL，避免账户、安全、
 * 通知偏好全部堆在一个长页面里。
 *
 * `active` prop 标识当前页面对应的导航项 key（如 "account"）。
 */
import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: Record<Locale, string>;
  icon: IconName;
  href: string;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { key: "account", label: { zh: "账户", en: "Account" }, icon: "info", href: "/settings?tab=account" },
  { key: "security", label: { zh: "安全", en: "Security" }, icon: "lock", href: "/settings?tab=security" },
  { key: "notifications", label: { zh: "通知能力", en: "Notifications" }, icon: "bell", href: "/settings?tab=notifications" },
];

interface Props {
  /** 当前 active 项 key（如 "account"） */
  active?: string;
  locale?: Locale;
}

export function SettingsSidebarNav({ active = "account", locale = "zh" }: Props) {
  const help =
    locale === "zh"
      ? { title: "需要帮助？", body: "查看文档 · 联系客服 · 提交反馈" }
      : { title: "Need help?", body: "Read docs · Contact support · Send feedback" };

  return (
    <aside className="ol-panel p-4 self-start">
      <nav className="grid gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const baseRow = cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-bold transition-colors",
            isActive
              ? "bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
              : "text-[color:var(--ol-muted)] hover:bg-[color:var(--ol-soft)]",
          );

          const ico = (
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-md text-[10px] font-black",
                isActive
                  ? "bg-[color:var(--ol-primary)] text-white"
                  : "bg-[color:var(--ol-soft)] text-[color:var(--ol-muted)]",
              )}
            >
              <Icon name={item.icon} size="sm" />
            </span>
          );

          return (
            <Link
              key={item.key}
              href={item.href}
              className={baseRow}
              aria-current={isActive ? "page" : undefined}
            >
              {ico}
              {item.label[locale]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-dashed border-[color:var(--ol-line)] p-3 text-[12px] leading-[1.55] text-[color:var(--ol-muted)]">
        <b className="mb-1 block text-[color:var(--ol-ink)]">{help.title}</b>
        {help.body}
      </div>
    </aside>
  );
}
