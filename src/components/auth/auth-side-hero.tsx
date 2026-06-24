/**
 * <AuthSideHero /> —— 登录/注册右侧深绿渐变 hero 区。
 *
 * 来源：prototype/openlinker-flow-21-auth.png 右栏。
 *   - 径向光晕装饰（::before）由 .ol-auth-side 控制
 *   - 4 行特性列表（圆形勾 ✓）
 *   - 底部 4 数据 grid（auth-stats），半透明卡 + backdrop-blur
 *
 * Phase 1 数据为产品规则，不展示未接真实接口的规模数字。
 */

import type { Locale } from "@/lib/i18n";

const COPY = {
  zh: {
    kicker: "OpenLinker 生态",
    heading: "把可用 Agent\n接到你的业务系统里",
    body: "登录后可以试用 Agent、查看运行历史，也可以开通创作者身份发布自己的 Agent。",
    features: [
      "当前运行免费，后续权益能力逐步开放",
      "内网账号邮箱密码登录",
      "创作者发布 HTTPS Endpoint",
      "运行结果、展示价格和耗时可追踪",
    ],
    stats: [
      { value: "免费", label: "当前运行" },
      { value: "HTTPS", label: "接入方式" },
      { value: "Scope", label: "API 权限" },
      { value: "确认", label: "高风险动作" },
    ],
  },
  en: {
    kicker: "OpenLinker ecosystem",
    heading: "Connect callable Agents\nto business systems",
    body: "After signing in, you can try Agents, inspect run history, or become a creator and publish your own Agent.",
    features: [
      "Current runs are free; later access capabilities will open gradually",
      "Intranet account email/password sign-in",
      "Creators publish HTTPS endpoints",
      "Run results, display price, and duration are traceable",
    ],
    stats: [
      { value: "Free", label: "Current runs" },
      { value: "HTTPS", label: "Connection" },
      { value: "Scope", label: "API access" },
      { value: "Review", label: "High-risk actions" },
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
