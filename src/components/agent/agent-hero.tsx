/**
 * Agent 详情页左侧 hero 卡。
 *
 * 视觉对照原型 .hero-agent：
 *   - 大尺寸 app-icon（首字母 + 配色），由 slug 派生
 *   - 名称 / 所有者行 / 简介
 *   - 3 列 score：真实 total_calls / 暂无评分 / 真实可用性标签
 *   - 发布行使用 created_at，不展示伪版本号
 *   - 底部 chip 行拆分 listed/callable/verified/certified，避免把公开可见误写成可调用。
 *
 * 完全静态展示，无交互；Server Component 友好。
 */

import type { Locale } from "@/lib/i18n";

interface AgentHeroProps {
  slug: string;
  name: string;
  description: string;
  totalCalls: number;
  creator: { display_name: string; creator_verified?: boolean };
  certified?: boolean;
  tags: string[];
  createdAt: string;
  availabilityLabel?: string;
  locale?: Locale;
  readiness?: {
    listed?: boolean;
    discoverable?: boolean;
    callable?: boolean;
    verified?: boolean;
    certified?: boolean;
  };
  /** 后端 sibling A 提供，无则降级隐藏。
   *  status 来自 Module B (skill benchmark)：verified/pending/failed/not_run；缺省时不渲染状态后缀。 */
  skills?: { id: string; name: string; status?: "verified" | "pending" | "failed" | "not_run" }[];
}

const SKILL_BADGE_BY_STATUS: Record<NonNullable<NonNullable<AgentHeroProps["skills"]>[number]["status"]>, {
  chipClass: string;
  label: Record<Locale, string>;
}> = {
  verified: { chipClass: "ol-chip-green", label: { zh: "测评通过", en: "Benchmark passed" } },
  pending: { chipClass: "ol-chip-blue", label: { zh: "测评中", en: "Testing" } },
  failed: { chipClass: "ol-chip-amber", label: { zh: "未通过", en: "Failed" } },
  not_run: { chipClass: "ol-chip-mint", label: { zh: "", en: "" } },
};

const ICON_COLORS = [
  "var(--ol-blue)",
  "var(--ol-primary)",
  "var(--ol-violet)",
  "var(--ol-amber)",
  "var(--ol-green)",
] as const;

function pickColor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return ICON_COLORS[h % ICON_COLORS.length];
}

function initials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "AG";
  // 取前两个字母 / 字符（中英混排都能拿到一个稳定缩写）
  const ascii = cleaned.replace(/[^A-Za-z0-9]/g, "");
  if (ascii.length >= 2) return ascii.slice(0, 2).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function formatCalls(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

function formatRelative(iso: string, locale: Locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function AgentHero({
  slug,
  name,
  description,
  totalCalls,
  creator,
  certified = false,
  tags,
  createdAt,
  availabilityLabel = "未验证",
  locale = "zh",
  readiness,
  skills,
}: AgentHeroProps) {
  const copy =
    locale === "zh"
      ? {
          certified: "实例已认证",
          author: "作者：",
          calls: "调用",
          noRating: "暂无评分",
          rating: "评分",
          availability: "可用性",
          published: "接入于",
          visible: "公开可见",
          unlisted: "直链可发现",
          hidden: "未公开展示",
          callable: "可调用",
          notCallable: "暂不可调用",
          verified: "能力测评已验证",
          notVerified: "暂无能力测评验证",
          tags: (n: number) => `${n} 个标签`,
        }
      : {
          certified: "Instance certified",
          author: "by ",
          calls: "Runs",
          noRating: "No rating",
          rating: "Rating",
          availability: "Availability",
          published: "Added",
          visible: "Publicly listed",
          unlisted: "Unlisted link",
          hidden: "Not listed",
          callable: "Callable",
          notCallable: "Not callable",
          verified: "Benchmark verified",
          notVerified: "No Benchmark verification",
          tags: (n: number) => `${n} tags`,
        };
  const color = pickColor(slug);
  const tagCount = tags.length;
  const skillList = Array.isArray(skills) ? skills : [];
  const visibilityChip = readiness?.listed
    ? { label: copy.visible, className: "ol-chip-green" }
    : readiness?.discoverable
    ? { label: copy.unlisted, className: "ol-chip-blue" }
    : { label: copy.hidden, className: "ol-chip-amber" };
  const callableChip = readiness?.callable
    ? { label: copy.callable, className: "ol-chip-green" }
    : { label: copy.notCallable, className: "ol-chip-amber" };
  const verifiedChip = readiness?.verified
    ? { label: copy.verified, className: "ol-chip-blue" }
    : { label: copy.notVerified, className: "ol-chip-mint" };

  return (
    <aside className="ol-panel ol-panel-pad flex h-full min-w-0 flex-col overflow-hidden">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-black text-white shadow-sm"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initials(name)}
      </div>

      <h1 className="mt-4 min-w-0 break-words text-2xl font-black leading-tight text-[color:var(--ol-ink)]">
        {name}
      </h1>

      <p className="mt-2 min-w-0 break-words text-[13px] font-extrabold text-[color:var(--ol-primary-dark)]">
        {copy.author}{creator.display_name}
        {certified ? (
          <>
            {" · "}
            <span className="text-[color:var(--ol-green)]">{copy.certified}</span>
          </>
        ) : null}
      </p>

      <p className="mt-3 min-w-0 break-words line-clamp-5 text-[13px] leading-relaxed text-[color:var(--ol-muted)]">
        {description}
      </p>

      {skillList.length > 0 ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
          {skillList.map((s) => {
            const badge = s.status ? SKILL_BADGE_BY_STATUS[s.status] : SKILL_BADGE_BY_STATUS.not_run;
            return (
              <span
                key={s.id}
                className={`ol-chip ${badge.chipClass} h-6 min-w-0 max-w-full px-2 text-[11.5px]`}
                title={badge.label[locale] || undefined}
              >
                {s.name}
                {badge.label[locale] ? <span className="ml-1 opacity-80">· {badge.label[locale]}</span> : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 grid-cols-3 gap-3">
        <ScoreCell value={formatCalls(totalCalls)} label={copy.calls} />
        <ScoreCell value={copy.noRating} label={copy.rating} />
        <ScoreCell value={availabilityLabel} label={copy.availability} />
      </div>

      <p className="mt-3 break-words text-[12px] text-[color:var(--ol-muted)]">
        {copy.published} {formatRelative(createdAt, locale)}
      </p>

      <div className="mt-auto flex min-w-0 flex-wrap gap-2 pt-5">
        <span className={`ol-chip ${visibilityChip.className} h-[30px] px-3 text-[13px]`}>
          {visibilityChip.label}
        </span>
        <span className={`ol-chip ${callableChip.className} h-[30px] px-3 text-[13px]`}>
          {callableChip.label}
        </span>
        <span className={`ol-chip ${verifiedChip.className} h-[30px] px-3 text-[13px]`}>
          {verifiedChip.label}
        </span>
        {readiness?.certified ? (
          <span className="ol-chip ol-chip-green h-[30px] px-3 text-[13px]">
            {copy.certified}
          </span>
        ) : null}
        {tagCount > 0 ? (
          <span className="ol-chip h-[30px] min-w-0 max-w-full px-3 text-[13px]">
            {copy.tags(tagCount)}
          </span>
        ) : null}
      </div>
    </aside>
  );
}

function ScoreCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <strong className="max-w-full break-words text-xl font-black leading-none text-[color:var(--ol-ink)]">
        {value}
      </strong>
      <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--ol-muted)]">
        {label}
      </span>
    </div>
  );
}
