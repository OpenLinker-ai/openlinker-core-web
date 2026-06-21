/**
 * OpenLinker 首页 `/`。
 *
 * 视觉来自 prototype/openlinker-flow-01-home.png（#flow-home）：
 *   1. <Topbar />（左 Brand + 中 NavTabs + 右登录态 CTA）
 *   2. Hero 区：kicker + h1 + lead + <HeroDual />（双卡）
 *   3. <ValueLoop /> 5 步流程
 *   4. <ProofBar /> 4 个数据
 *   5. 右侧 <PreviewStack /> 4 张特性卡（lg+ 才显示）
 *   6. 已登录用户在 hero 下方追加 <AuthDashboard />（保留原 page.tsx 的业务）
 *
 * Server Component：通过 `auth()` 直接读 session，
 * 已登录时 GET /api/v1/dashboard 拿 core 概览数据；后端未就绪时 catch 兜底为 null。
 *
 * Phase 1 简化：原型左卡"发布任务"功能未上线，
 * 改为"成为创作者 → /publish"，避免误导用户。
 */

import { apiFetchAuthed } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { Topbar } from "@/components/layout/topbar";
import { HeroDual } from "@/components/home/hero-dual";
import { ValueLoop } from "@/components/home/value-loop";
import { ProofBar } from "@/components/home/proof-bar";
import { PreviewStack } from "@/components/home/preview-stack";
import { AuthDashboard } from "@/components/home/auth-dashboard";

interface DashboardData {
  is_creator: boolean;
  usage: {
    this_month_calls: number;
    this_month_spent_cents: number;
    total_calls: number;
  };
  creator?: {
    this_month_calls_received: number;
    this_month_revenue_cents: number;
    total_agents: number;
    pending_agents: number;
  };
}

export default async function Home() {
  const session = await auth();
  const locale = await getLocale();
  const copy =
    locale === "zh"
      ? {
          kicker: "两种使用方式",
          title: (
            <>
              描述任务，或浏览市场，
              <br className="hidden sm:inline" />
              让 AI Agent 为你做事
            </>
          ),
          lead: "不知道用哪个 Agent？直接发布任务由平台匹配。已有目标？浏览市场自由组合。",
        }
      : {
          kicker: "Two ways to start",
          title: (
            <>
              Describe a task, or browse the market,
              <br className="hidden sm:inline" />
              {" "}
              and let AI Agents do the work
            </>
          ),
          lead: "Not sure which Agent to use? Describe the task and get matched. Already know what you need? Browse callable Agents directly.",
        };

  let dashboard: DashboardData | null = null;
  if (session) {
    dashboard = await apiFetchAuthed<DashboardData>("/api/v1/dashboard").catch(
      () => null,
    );
  }

  const userName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <>
      <Topbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-20 pt-10 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-11 lg:items-start">
          {/* 左：hero + 双卡 + value loop + proof bar */}
          <section>
            <div className="ol-kicker">{copy.kicker}</div>
            <h1 className="mt-3 max-w-[720px] text-[40px] font-extrabold leading-[1.12] tracking-tight text-[color:var(--ol-ink)] sm:text-[48px] lg:text-[58px]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-[680px] text-[16px] leading-[1.75] text-[color:var(--ol-muted)] lg:text-[18px]">
              {copy.lead}
            </p>

            <HeroDual locale={locale} />
            <ValueLoop locale={locale} />
            <ProofBar locale={locale} />
          </section>

          {/* 右：preview stack（移动端隐藏，避免重复信息挤压） */}
          <div className="hidden lg:block lg:sticky lg:top-24">
            <PreviewStack locale={locale} />
          </div>
        </div>

        {/* 已登录用户追加概览（PNG 未画，业务必须保留） */}
        {userName ? (
          <AuthDashboard userName={userName} dashboard={dashboard} locale={locale} />
        ) : null}
      </main>
    </>
  );
}
