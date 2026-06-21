"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type WorkspaceItem = {
  label: Record<Locale, string>;
  desc: Record<Locale, string>;
  href: string;
  icon: IconName;
  match: (pathname: string) => boolean;
};

const ITEMS: ReadonlyArray<WorkspaceItem> = [
  {
    label: { zh: "工作台", en: "Workspace" },
    desc: { zh: "我的总入口", en: "Home base" },
    href: "/my",
    icon: "home",
    match: (p) => p === "/my",
  },
  {
    label: { zh: "运行记录", en: "Runs" },
    desc: { zh: "调用 / 事件", en: "Calls / events" },
    href: "/runs",
    icon: "chart",
    match: (p) =>
      p.startsWith("/runs") || p.startsWith("/run") || p.startsWith("/playground"),
  },
  {
    label: { zh: "任务", en: "Tasks" },
    desc: { zh: "发布 / 接活", en: "Post / claim" },
    href: "/tasks",
    icon: "target",
    match: (p) => p === "/task" || p.startsWith("/tasks") || p.startsWith("/board"),
  },
  {
    label: { zh: "工作流", en: "Workflow" },
    desc: { zh: "编排复用", en: "Compose and reuse" },
    href: "/workflow",
    icon: "folder",
    match: (p) => p.startsWith("/workflow"),
  },
  {
    label: { zh: "创作者", en: "Creator" },
    desc: { zh: "我的 Agent", en: "My Agents" },
    href: "/hub",
    icon: "bot",
    match: (p) => p.startsWith("/hub"),
  },
  {
    label: { zh: "接入 Agent", en: "Publish Agent" },
    desc: { zh: "Endpoint 发布", en: "Endpoint setup" },
    href: "/publish",
    icon: "edit",
    match: (p) => p.startsWith("/publish"),
  },
  {
    label: { zh: "设置", en: "Settings" },
    desc: { zh: "账户安全", en: "Account security" },
    href: "/settings",
    icon: "gear",
    match: (p) => p.startsWith("/settings"),
  },
  {
    label: { zh: "通知", en: "Inbox" },
    desc: { zh: "事件中心", en: "Event center" },
    href: "/inbox",
    icon: "bell",
    match: (p) => p.startsWith("/inbox"),
  },
];

export function MyWorkspaceSwitcher({ className, locale = "zh" }: { className?: string; locale?: Locale }) {
  const pathname = usePathname() || "/";
  const activeItem = ITEMS.find((item) => item.match(pathname)) ?? ITEMS[0];

  return (
    <section
      className={cn(
        "ol-panel overflow-hidden border-[color:var(--ol-line)]/80 bg-white/88",
        className,
      )}
      aria-label={locale === "zh" ? "我的工作台导航" : "Workspace navigation"}
    >
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]">
              <Icon name={activeItem.icon} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="ol-kicker block">my workspace</span>
              <strong className="mt-0.5 block truncate text-[14px] font-black text-[color:var(--ol-ink)]">
                {locale === "zh" ? "当前：" : "Current: "}{activeItem.label[locale]}
              </strong>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-[color:var(--ol-line)] bg-white px-3 py-1.5 text-[12px] font-black text-[color:var(--ol-primary-dark)]">
            {locale === "zh" ? "展开切换" : "Switch"}
          </span>
        </summary>

        <nav
          className="grid gap-2 border-t border-[color:var(--ol-line)] px-3 py-3 sm:grid-cols-2 lg:grid-cols-5"
          aria-label={locale === "zh" ? "我的工作台快捷入口" : "Workspace shortcuts"}
        >
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-[13px] border px-3 py-2.5 transition-colors",
                  active
                    ? "border-[color:var(--ol-primary)]/30 bg-[color:var(--ol-mint)] text-[color:var(--ol-primary-dark)]"
                    : "border-[color:var(--ol-line)] bg-white text-[color:var(--ol-muted)] hover:border-[color:var(--ol-primary)]/35 hover:text-[color:var(--ol-ink)]",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-[12px]",
                    active
                      ? "bg-[color:var(--ol-primary)] text-white"
                      : "bg-[color:var(--ol-soft)] text-[color:var(--ol-muted)]",
                  )}
                >
                  <Icon name={item.icon} size="sm" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black">
                    {item.label[locale]}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold opacity-75">
                    {item.desc[locale]}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </details>
    </section>
  );
}
