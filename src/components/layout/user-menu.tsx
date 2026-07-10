"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import type { Locale } from "@/lib/i18n";

type UserMenuProps = {
  userName: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  locale: Locale;
};

type MenuItem = {
  href: string;
  icon: IconName;
  label: string;
  desc?: string;
};

export function UserMenu({ userName, userEmail, isAdmin, locale }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = userName || userEmail || (locale === "zh" ? "已登录" : "Signed in");
  const initials = useMemo(() => userInitials(displayName), [displayName]);
  const copy =
    locale === "zh"
      ? {
          menu: "用户菜单",
          overview: "我的主页",
          overviewDesc: "个人入口总览",
          creator: "Agent 管理",
          creatorDesc: "管理 Agent、接入与 Bridge",
          inbox: "通知",
          inboxDesc: "告警与运行消息",
          status: "实例状态",
          statusDesc: "服务健康与事件记录",
          settings: "设置",
          settingsDesc: "账号、安全与令牌",
          admin: "管理台",
          adminDesc: "用户、Agent 与当前实例运营",
          signOut: "退出登录",
        }
      : {
          menu: "User menu",
          overview: "My home",
          overviewDesc: "Personal overview",
          creator: "Agent Console",
          creatorDesc: "Manage Agents, connections, and Bridge",
          inbox: "Inbox",
          inboxDesc: "Alerts and run messages",
          status: "Instance status",
          statusDesc: "Service health and incidents",
          settings: "Settings",
          settingsDesc: "Account, security, tokens",
          admin: "Admin",
          adminDesc: "Users, Agents, and instance operations",
          signOut: "Sign out",
        };

  const primaryItems: MenuItem[] = [
    { href: "/my", icon: "user", label: copy.overview, desc: copy.overviewDesc },
    { href: "/hub", icon: "bot", label: copy.creator, desc: copy.creatorDesc },
  ];
  const secondaryItems: MenuItem[] = [
    { href: "/inbox", icon: "bell", label: copy.inbox, desc: copy.inboxDesc },
    { href: "/status", icon: "info", label: copy.status, desc: copy.statusDesc },
    { href: "/settings", icon: "gear", label: copy.settings, desc: copy.settingsDesc },
    ...(isAdmin
      ? [{ href: "/admin", icon: "shield" as const, label: copy.admin, desc: copy.adminDesc }]
      : []),
  ];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="ol-user-menu">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.menu}
        className="ol-user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ol-user-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="ol-user-trigger-copy">
          <span className="ol-user-trigger-name">{displayName}</span>
        </span>
        <span className="ol-user-menu-caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="ol-user-menu-panel" role="menu">
          <div className="ol-user-menu-head">
            <span className="ol-user-avatar ol-user-avatar-lg" aria-hidden="true">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="ol-user-menu-name">{displayName}</div>
              {userEmail ? <div className="ol-user-menu-email">{userEmail}</div> : null}
            </div>
          </div>

          <nav className="ol-user-menu-list" aria-label={copy.menu}>
            {primaryItems.map((item) => (
              <UserMenuLink
                key={item.href}
                item={item}
                onSelect={() => setOpen(false)}
              />
            ))}
          </nav>

          <div className="ol-user-menu-separator" />

          <nav className="ol-user-menu-list" aria-label={copy.menu}>
            {secondaryItems.map((item) => (
              <UserMenuLink
                key={item.href}
                item={item}
                onSelect={() => setOpen(false)}
              />
            ))}
          </nav>

          <button
            type="button"
            className="ol-user-menu-signout"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
          >
            <Icon name="x" size="sm" />
            {copy.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function UserMenuLink({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.href}
      role="menuitem"
      className="ol-user-menu-item"
      onClick={onSelect}
    >
      <span className="ol-user-menu-icon">
        <Icon name={item.icon} size="sm" />
      </span>
      <span className="min-w-0">
        <span className="ol-user-menu-label">{item.label}</span>
        {item.desc ? <span className="ol-user-menu-desc">{item.desc}</span> : null}
      </span>
    </Link>
  );
}

function userInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "U";
  const parts = trimmed
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? trimmed[0] ?? "U";
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}
