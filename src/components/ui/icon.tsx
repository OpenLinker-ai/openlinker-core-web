/**
 * SVG icon sprite + <Icon /> 组件。
 *
 * 来自 prototype/openlinker-flow-prototypes.html 的 41 个 symbol。
 * 用法：
 *   1. 在 RootLayout 渲染一次 <IconSprite />（隐藏，仅注册 symbol）
 *   2. 任何地方用 <Icon name="shield" /> 引用
 *   3. 颜色通过 CSS color 控制（stroke=currentColor）
 *
 * 添加新图标：在 SVG_SPRITE 字符串里加 <symbol id="i-xxx">；
 * IconName 类型自动派生，TypeScript 会校验 name 合法性。
 */

import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export const ICON_NAMES = [
  "shield",
  "lock",
  "globe",
  "flag-eu",
  "flag-cn",
  "medical",
  "card",
  "flask",
  "clipboard",
  "bot",
  "doc",
  "folder",
  "paperclip",
  "flame",
  "bulb",
  "warn",
  "bell",
  "user",
  "users",
  "gear",
  "download",
  "mail",
  "message",
  "pin",
  "target",
  "check",
  "gift",
  "building",
  "chart",
  "home",
  "cart",
  "zap",
  "edit",
  "arrow-up-right",
  "refresh",
  "dollar",
  "receipt",
  "pause",
  "cancel",
  "info",
  "key",
  "x",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "fill"> {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
  /** 是否用 currentColor 填充（默认是 stroke） */
  filled?: boolean;
}

export function Icon({ name, size = "md", filled, className, ...rest }: IconProps) {
  const sizeClass =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : size === "xl" ? "w-7 h-7" : "w-4 h-4";
  return (
    <svg
      aria-hidden="true"
      className={cn("ol-icon", sizeClass, filled && "fill", className)}
      {...rest}
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}

/**
 * 全局 sprite 定义（隐藏，仅注册 symbol）。
 * 在 RootLayout 顶部渲染一次。
 */
export function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      style={{ display: "none" }}
      dangerouslySetInnerHTML={{ __html: SPRITE_SYMBOLS }}
    />
  );
}

// 完整 symbol 定义（来自原型，1:1 复制）。
const SPRITE_SYMBOLS = `
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></symbol>
<symbol id="i-flag-eu" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l1 2h2l-1.6 1.2L11 14l-2-1.4L7 14l.6-1.8L6 11h2zM12 6l.5 1h1l-.8.6.3 1-1-.6-1 .6.3-1L10.5 7h1z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-flag-cn" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7 8l.4 1.2H8.5l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H6.6L7 8zM10.5 7l.5.6L10.6 8l.6-.2v.6l.4-.5.3.5V7.8l.6.2-.4-.4.5-.6h-.7L11.6 6l-.3.6h-.7zM10.5 10l.5.6L10.6 11l.6-.2v.6l.4-.5.3.5V10.8l.6.2-.4-.4.5-.6h-.7L11.6 9l-.3.6h-.7zM7.5 12l.5.6L7.6 13l.6-.2v.6l.4-.5.3.5V12.8l.6.2-.4-.4.5-.6h-.7L8.6 11l-.3.6h-.7z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-medical" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke-width="3"/><rect x="3" y="3" width="18" height="18" rx="3"/></symbol>
<symbol id="i-card" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M7 16h3"/></symbol>
<symbol id="i-flask" viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 19l-5-10V3"/></symbol>
<symbol id="i-clipboard" viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/></symbol>
<symbol id="i-bot" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M12 4v4M9 4h6"/></symbol>
<symbol id="i-doc" viewBox="0 0 24 24"><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></symbol>
<symbol id="i-paperclip" viewBox="0 0 24 24"><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></symbol>
<symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-7 1-10z"/></symbol>
<symbol id="i-bulb" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3A6 6 0 0 1 12 3z"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18.5v.5" stroke-width="2.5"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0M14 19a5 5 0 0 1 7 0"/></symbol>
<symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v12M6 12l6 6 6-6M4 21h16"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></symbol>
<symbol id="i-message" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4V5z"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z"/><circle cx="12" cy="9" r="3"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5 9-11"/></symbol>
<symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M12 9v11M8 9a3 3 0 0 1 0-6c2 0 4 3 4 6M16 9a3 3 0 0 0 0-6c-2 0-4 3-4 6"/></symbol>
<symbol id="i-building" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.5M14.5 7h.5M9 11h.5M14.5 11h.5M9 15h.5M14.5 15h.5M10 21v-3h4v3"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 16V11M12 16V8M16 16v-3"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7H10v7H4a1 1 0 0 1-1-1v-9z"/></symbol>
<symbol id="i-cart" viewBox="0 0 24 24"><path d="M4 5h2l2 12h11l2-9H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></symbol>
<symbol id="i-zap" viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 11-12h-7l0-8z"/></symbol>
<symbol id="i-edit" viewBox="0 0 24 24"><path d="M14 4l6 6L8 22H2v-6L14 4z"/></symbol>
<symbol id="i-arrow-up-right" viewBox="0 0 24 24"><path d="M7 17L17 7M7 7h10v10"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4"/></symbol>
<symbol id="i-dollar" viewBox="0 0 24 24"><path d="M12 3v18M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3"/></symbol>
<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2 2 2v18l-2-2-2 2-2-2-2 2-2-2-2 2zM8 9h8M8 13h8M8 17h5"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></symbol>
<symbol id="i-cancel" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M12 11v6"/></symbol>
<symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l3 3"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
`;
