/**
 * <AuthSideHero /> —— 登录/注册右侧深绿渐变 hero 区。
 *
 * 来源：prototype/openlinker-flow-21-auth.png 右栏。
 *   - 径向光晕装饰（::before）由 .ol-auth-side 控制
 *   - 4 行特性列表（圆形勾 ✓）
 *   - 底部 4 数据 grid（auth-stats），半透明卡 + backdrop-blur
 *
 * 只展示已经落地的自托管能力与已确认的 Core 契约，不使用商业产品或规划中的规模数字。
 */

import type { Locale } from "@/lib/i18n";

const COPY = {
  zh: {
    kicker: "OpenLinker Core",
    heading: "在自己的环境中\n管理和调用 Agent",
    body: "登录当前实例后，可以浏览已登记的 Agent、发起运行、查看记录，并管理自己提供的 Agent。",
    features: [
      "User Token 用于用户侧 API 与 MCP 调用",
      "Agent Token 用于 Agent 注册与运行身份",
      "支持 HTTP、MCP Server、WebSocket 与 Pull 接入",
      "Web、SDK、MCP 与 A2A 共用运行记录",
    ],
    stats: [
      { value: "自托管", label: "部署方式" },
      { value: "4 种", label: "连接模式" },
      { value: "MCP / A2A", label: "协议入口" },
      { value: "可追踪", label: "运行记录" },
    ],
  },
  en: {
    kicker: "OpenLinker Core",
    heading: "Manage and invoke Agents\nin your own environment",
    body: "Sign in to browse registered Agents, start runs, inspect run records, and manage the Agents you provide.",
    features: [
      "User Tokens authorize user-side API and MCP calls",
      "Agent Tokens identify Agent onboarding and runtimes",
      "Connect through HTTP, MCP Server, WebSocket, or Pull",
      "Web, SDK, MCP, and A2A share the same run records",
    ],
    stats: [
      { value: "Self-hosted", label: "Deployment" },
      { value: "4 modes", label: "Connections" },
      { value: "MCP / A2A", label: "Protocols" },
      { value: "Traceable", label: "Run records" },
    ],
  },
};

export function AuthSideHero({ locale = "zh" }: { locale?: Locale }) {
  const copy = COPY[locale];
  return (
    <aside className="ol-auth-side">
      <span className="ol-auth-side-kicker">{copy.kicker}</span>
      <h3>{copy.heading}</h3>
      <p>{copy.body}</p>

      <ul className="ol-auth-features">
        {copy.features.map((feat) => (
          <li key={feat} className="ol-auth-feat">
            <span className="ol-auth-feat-check" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5 9-11" />
              </svg>
            </span>
            {feat}
          </li>
        ))}
      </ul>

      <div className="ol-auth-stats">
        {copy.stats.map((s) => (
          <div key={s.label} className="ol-auth-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
