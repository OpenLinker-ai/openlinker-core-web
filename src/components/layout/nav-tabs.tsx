/**
 * <NavTabs /> —— 顶部胶囊式导航条。
 *
 * 来自 prototype 的 .flow-tabs。
 *   首页 / 任务 / 市场 / 工作流 / A2A / 我的
 *
 * 工作流 / A2A 当前有明确承接页，避免用户点到断口。
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  label: Record<Locale, string>;
  href: string;
  match: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  { label: { zh: "首页", en: "Home" }, href: "/", match: (p) => p === "/" },
  {
    label: { zh: "任务", en: "Tasks" },
    href: "/tasks",
    match: (p) =>
      p === "/task" || p.startsWith("/tasks") || p.startsWith("/board"),
  },
  {
    label: { zh: "市场", en: "Market" },
    href: "/market",
    match: (p) => p.startsWith("/market") || p.startsWith("/agents"),
  },
  {
    label: { zh: "工作流", en: "Workflow" },
    href: "/workflow",
    match: (p) => p.startsWith("/workflow"),
  },
  {
    label: { zh: "A2A", en: "A2A" },
    href: "/a2a",
    match: (p) => p.startsWith("/a2a"),
  },
  {
    label: { zh: "我的", en: "My" },
    href: "/my",
    match: (p) =>
      p.startsWith("/my") ||
      p.startsWith("/runs") ||
      p.startsWith("/hub") ||
      p.startsWith("/publish") ||
      p.startsWith("/settings") ||
      p.startsWith("/playground") ||
      p.startsWith("/inbox") ||
      p.startsWith("/run"),
  },
];

export function NavTabs({ className, locale = "zh" }: { className?: string; locale?: Locale }) {
  const pathname = usePathname() || "/";

  return (
    <nav className={cn("ol-flow-tabs", className)} aria-label={locale === "zh" ? "主导航" : "Primary navigation"}>
      {ITEMS.map((item) => {
        const isActive = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(isActive && "active")}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
