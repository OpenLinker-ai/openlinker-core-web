/**
 * <NavTabs /> —— 顶部胶囊式导航条。
 *
 * 来自 prototype 的 .flow-tabs。
 *   首页 / Registry / 接入 / A2A / 运行 / 状态
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
    label: { zh: "Registry", en: "Registry" },
    href: "/registry",
    match: (p) => p.startsWith("/registry") || p.startsWith("/agents"),
  },
  {
    label: { zh: "接入", en: "Connect" },
    href: "/connect",
    match: (p) =>
      p.startsWith("/connect") ||
      p.startsWith("/hub") ||
      p.startsWith("/publish") ||
      p.startsWith("/skills"),
  },
  {
    label: { zh: "A2A", en: "A2A" },
    href: "/a2a",
    match: (p) => p.startsWith("/a2a"),
  },
  {
    label: { zh: "运行", en: "Runs" },
    href: "/runs",
    match: (p) =>
      p.startsWith("/runs") ||
      p.startsWith("/playground") ||
      p.startsWith("/run"),
  },
  {
    label: { zh: "状态", en: "Status" },
    href: "/status",
    match: (p) => p.startsWith("/status"),
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
