"use client";

/**
 * 创作者中心：我的 Agent 横排 item-row 列表。
 *
 * 视觉来自 prototype/openlinker-flow-15-creator-hub.png：
 *   - panel + panel-head（"我的 Agent" + 右"X 个公开 · Y 个待处理"）
 *   - 每行 .ol-item-row：38px dash-icon + 名称/版本/状态 + 右侧 ir-side
 *   - 待处理行：黄色边框 + 渐变背景
 *
 * 数据策略：
 *   - 优先用 dashboard.agents（含 calls_this_month）
 *   - 与原 my-agents-card / agent-row 业务并存：编辑/下架仍走 agent-row（用 native confirm，
 *     避免在两处维护）。本组件不实现下架，把交互入口放到详情页 /agents/[slug]。
 *
 * 字段约束：visibility 决定公开范围，certification_status 仅表达认证进度。
 *
 * Phase 1 不展示真实收入金额。次数：toLocaleString() 千分位。
 */

import Link from "next/link";
import { PlayCircle, Settings } from "lucide-react";
import { useState } from "react";

import { avatarFromSlug } from "@/components/market/avatar";
import { SkillsDialog } from "@/components/creator/skills-dialog";
import type { Locale } from "@/lib/i18n";

import type { AgentResponse } from "@/components/agent/my-agents-card";
import type { AgentStatsItem } from "@/components/agent/agent-stats-list";

interface Props {
  locale: Locale;
  /** dashboard 接口返回的本月统计数据（优先使用） */
  stats: AgentStatsItem[] | null;
  /** /api/v1/creator/agents 原始数据，用于补充 status / 版本号 / 显示待处理 */
  agents: AgentResponse[];
}

/** 把 lifetime calls 缩写成 31k / 1.2M */
function formatCalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

const VISIBILITY_LABEL: Record<string, Record<Locale, string>> = {
  public: { zh: "已公开", en: "Public" },
  unlisted: { zh: "链接可见", en: "Unlisted" },
  private: { zh: "私有", en: "Private" },
};
const CERTIFICATION_LABEL: Record<string, Record<Locale, string>> = {
  unreviewed: { zh: "未认证", en: "Unverified" },
  pending: { zh: "认证中", en: "Verification pending" },
  certified: { zh: "已认证", en: "Verified" },
  rejected: { zh: "认证未通过", en: "Verification rejected" },
};

function isAgentCallable(agent: {
  availability?: AgentResponse["availability"];
  readiness?: AgentResponse["readiness"];
}) {
  return agent.readiness?.callable ?? agent.availability?.status === "healthy";
}

function availabilityLabel(
  availability: AgentResponse["availability"] | undefined,
  callable: boolean,
  locale: Locale,
) {
  if (callable) return locale === "zh" ? "在线" : "Online";
  if (availability?.status === "degraded") return locale === "zh" ? "不稳定" : "Degraded";
  if (availability?.status === "unreachable") return locale === "zh" ? "离线" : "Offline";
  return locale === "zh" ? "未在线" : "Not online";
}

type AgentCounts = {
  total: number;
  online: number;
  public: number;
  unlisted: number;
  private: number;
  pending: number;
};

function computeAgentCounts(
  rows: Array<{
    lifecycleStatus: AgentResponse["lifecycle_status"];
    visibility: AgentResponse["visibility"];
    certificationStatus: AgentResponse["certification_status"];
    availability?: AgentResponse["availability"];
    readiness?: AgentResponse["readiness"];
  }>,
): AgentCounts {
  // 单次遍历计算所有计数，避免多次 filter
  let online = 0, pub = 0, unlisted = 0, priv = 0, pending = 0;
  for (const row of rows) {
    if (row.certificationStatus === "pending") pending++;
    if (row.lifecycleStatus !== "active") continue;
    if (isAgentCallable(row)) online++;
    if (row.visibility === "public") pub++;
    else if (row.visibility === "unlisted") unlisted++;
    else if (row.visibility === "private") priv++;
  }
  return {
    total: rows.length,
    online,
    public: pub,
    unlisted,
    private: priv,
    pending,
  };
}

export function AgentsList({ locale, stats, agents }: Props) {
  const copy =
    locale === "zh"
      ? {
          title: "我的 Agent",
          noneYet: "还没接入",
          empty: "还没有接入 Agent。",
          publish: "立即接入 →",
          summary: (counts: AgentCounts) =>
            `总数 ${counts.total} · 在线 ${counts.online} · 公开 ${counts.public} · 链接 ${counts.unlisted} · 私有 ${counts.private}${
              counts.pending > 0 ? ` · 认证中 ${counts.pending}` : ""
            }`,
        }
      : {
          title: "My Agents",
          noneYet: "No Agents yet",
          empty: "No Agents connected yet.",
          publish: "Connect now →",
          summary: (counts: AgentCounts) =>
            `Total ${counts.total} · Online ${counts.online} · Public ${counts.public} · Unlisted ${counts.unlisted} · Private ${counts.private}${
              counts.pending > 0 ? ` · Pending ${counts.pending}` : ""
            }`,
        };
  // 用 stats 为主，按 id 拼上 agents 里的 status
  // dashboard.agents 没传 status 时（旧版字段为 string），fallback 到 agents 表
  const agentById = new Map<string, AgentResponse>();
  for (const a of agents) {
    agentById.set(a.id, a);
  }

  // 没有本月数据时，全部从 agents 构造（每行无本月数字，只显示 "—"）
  const rows = stats && stats.length > 0
    ? stats.map((s) => {
        const agent = agentById.get(s.id);
        return ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        lifecycleStatus: agent?.lifecycle_status ?? "active",
        visibility: agent?.visibility ?? "public",
          certificationStatus: agent?.certification_status ?? "unreviewed",
          lifetimeCalls: s.lifetime_calls,
          callsThisMonth: s.calls_this_month,
          availability: agent?.availability,
          readiness: agent?.readiness,
      });
      })
    : agents.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        lifecycleStatus: a.lifecycle_status,
        visibility: a.visibility,
          certificationStatus: a.certification_status,
          lifetimeCalls: a.total_calls,
          callsThisMonth: 0,
          availability: a.availability,
          readiness: a.readiness,
      }));

  const counts = computeAgentCounts(rows);

  if (rows.length === 0) {
    return (
      <div className="ol-panel">
        <div className="ol-panel-head">
          <strong>{copy.title}</strong>
          <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
            {copy.noneYet}
          </span>
        </div>
        <div className="px-5 py-10 text-center text-[13px] text-[color:var(--ol-muted)]">
          {copy.empty}
          <Link
            href="/publish"
            className="ml-2 font-bold text-[color:var(--ol-primary-dark)] underline"
          >
            {copy.publish}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ol-panel">
      <div className="ol-panel-head">
        <strong>{copy.title}</strong>
        <span className="text-[12.5px] font-bold text-[color:var(--ol-muted)]">
          {copy.summary(counts)}
        </span>
      </div>
      <div className="p-[18px]">
        {rows.map((row) => (
          <AgentItemRow key={row.id} locale={locale} row={row} />
        ))}
      </div>
    </div>
  );
}

function AgentItemRow({
  locale,
  row,
}: {
  locale: Locale;
  row: {
    id: string;
    slug: string;
    name: string;
    lifecycleStatus: AgentResponse["lifecycle_status"];
    visibility: AgentResponse["visibility"];
      certificationStatus: AgentResponse["certification_status"];
      lifetimeCalls: number;
      callsThisMonth: number;
      availability?: AgentResponse["availability"];
      readiness?: AgentResponse["readiness"];
  };
}) {
  const copy =
    locale === "zh"
      ? {
          totalCalls: "累计调用",
          disabled: "已下架",
          calls: "调用",
          month: "本月",
          records: "记录",
          freeAccess: "免费期",
          playgroundTitle: "打开这个 Agent 的 Playground，直接发起一次测试调用",
          playgroundUnavailable: "离线不可试用",
          skillTitle: "编辑该 Agent 声明的 skill（最多 5 个）",
          setup: "接入",
          setupTitle: "维护能力声明、示例和 dry-run 状态",
          settings: "设置",
          settingsTitle: "编辑基础信息、连接方式和可见性",
          runHistory: "调用记录",
          runHistoryTitle: "查看这个 Agent 被用户、访问令牌或 MCP 触发的调用记录",
          benchmarkTitle: "为已声明 Skill 运行测评，通过后详情页会显示已验证徽章",
          deliveryTitle: "管理通知投递目标与通知投递历史",
          delivery: "投递",
          progress: "查看进度",
          progressLabel: (name: string) => `查看 ${name} 进度`,
        }
      : {
          totalCalls: "total calls",
          disabled: "Disabled",
          calls: "calls",
          month: "this month",
          records: "records",
          freeAccess: "free access",
          playgroundTitle: "Open this Agent in Playground and run a test call",
          playgroundUnavailable: "Offline",
          skillTitle: "Edit this Agent's declared Skills, up to 5",
          setup: "Setup",
          setupTitle: "Maintain capability claims, examples, and dry-run status",
          settings: "Settings",
          settingsTitle: "Edit basic information, connection, and visibility",
          runHistory: "Run history",
          runHistoryTitle: "View calls triggered by users, access tokens, or MCP",
          benchmarkTitle: "Run benchmarks for declared Skills; passed ones show a Verified badge on the detail page",
          deliveryTitle: "Manage notification delivery targets and delivery history",
          delivery: "Delivery",
          progress: "View progress",
          progressLabel: (name: string) => `View ${name} progress`,
        };
  const avatar = avatarFromSlug(row.slug);
  const isPending = row.certificationStatus === "pending";
  const isActive = row.lifecycleStatus === "active";
  const isListed = isActive && row.visibility === "public";
  const callable = isActive && isAgentCallable(row);
  const availabilityText = availabilityLabel(row.availability, callable, locale);
  const [skillsOpen, setSkillsOpen] = useState(false);

  // 待处理行：黄色高亮（按 prompt 要求的样式 token）
  const yellowStyle: React.CSSProperties = isPending
    ? {
        borderColor: "rgba(200, 131, 13, 0.3)",
        background: "linear-gradient(90deg, #fff5df, #fff)",
      }
    : {};

  return (
    <div className="ol-item-row ol-agent-item-row" style={yellowStyle}>
      <div className="ol-dash-icon" style={{ background: avatar.color }}>
        {avatar.initials}
      </div>
      <div className="min-w-0 self-center">
        <h4 className="truncate">
          <Link
            href={row.visibility === "private" ? `/hub/agents/${row.slug}/onboarding` : `/agents/${row.slug}`}
            className="hover:text-[color:var(--ol-primary-dark)]"
          >
            {row.name}
          </Link>
        </h4>
        <p className="truncate">
          {isActive ? (
            <>
              {VISIBILITY_LABEL[row.visibility][locale]} · {availabilityText} · {CERTIFICATION_LABEL[row.certificationStatus][locale]} · {formatCalls(row.lifetimeCalls)} {copy.totalCalls}
            </>
          ) : isPending ? (
            <>{CERTIFICATION_LABEL[row.certificationStatus][locale]} · {VISIBILITY_LABEL[row.visibility][locale]}</>
          ) : (
            <>{copy.disabled}</>
          )}
        </p>
      </div>
      {isActive ? (
          <div className="ol-ir-side flex min-w-0 flex-col items-end gap-2">
            <div>
              <b>{formatCalls(row.callsThisMonth)} {copy.calls}</b>
              <span className="ml-1 text-[12px] font-bold text-[color:var(--ol-muted)]">
                {isListed ? copy.month : copy.records} · {copy.freeAccess}
              </span>
            </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            {callable ? (
              <Link
                href={`/playground/${row.slug}`}
                className="ol-mini-btn ol-mini-btn-primary gap-1.5"
                title={copy.playgroundTitle}
              >
                <PlayCircle className="size-3.5" aria-hidden="true" />
                Playground
              </Link>
            ) : (
              <span
                className="ol-mini-btn cursor-not-allowed gap-1.5 opacity-60"
                title={row.availability?.hint ?? copy.playgroundUnavailable}
              >
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {copy.playgroundUnavailable}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSkillsOpen(true)}
              className="ol-mini-btn"
              title={copy.skillTitle}
            >
              Skill
            </button>
            <Link
              href={`/hub/agents/${row.slug}/settings`}
              className="ol-mini-btn gap-1.5"
              title={copy.settingsTitle}
            >
              <Settings className="size-3.5" aria-hidden="true" />
              {copy.settings}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/onboarding`}
              className="ol-mini-btn"
              title={copy.setupTitle}
            >
              {copy.setup}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/runs`}
              className="ol-mini-btn"
              title={copy.runHistoryTitle}
            >
              {copy.runHistory}
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/benchmarks`}
              className="ol-mini-btn"
              title={copy.benchmarkTitle}
            >
              Benchmark
            </Link>
            <Link
              href={`/hub/agents/${row.slug}/delivery`}
              className="ol-mini-btn"
              title={copy.deliveryTitle}
            >
              {copy.delivery}
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href={`/hub/agents/${row.slug}/onboarding`}
          className="ol-mini-btn"
          aria-label={copy.progressLabel(row.name)}
        >
          {copy.progress}
        </Link>
      )}
      {isActive && skillsOpen ? (
        <>
          {skillsOpen ? (
            <SkillsDialog
              agentId={row.id}
              agentSlug={row.slug}
              agentName={row.name}
              open={true}
              onClose={() => setSkillsOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
