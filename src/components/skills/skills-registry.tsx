"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import {
  CATEGORY_ORDER,
  categoryLabel as getCategoryLabel,
  type Skill,
} from "@/lib/skills";
import type { Locale } from "@/lib/i18n";
import { skillRegistryMessages } from "@/messages/skill";
import { cn } from "@/lib/utils";

const ALL_FILTER = "all";
const FILTERS = [ALL_FILTER, ...CATEGORY_ORDER] as const;
type FilterKey = (typeof FILTERS)[number];
type SortKey = "order" | "category" | "name";

type SkillProposal = {
  id: string;
  agent_id?: string;
  proposed_skill_id: string;
  category: string;
  name: string;
  description: string;
  source: "manual" | "imported_text" | "imported_json" | string;
  status: "pending" | "merged" | "rejected" | string;
  matched_skill_id?: string;
  created_at: string;
  updated_at: string;
};

type ProposalDraft = {
  proposed_skill_id: string;
  category: string;
  name: string;
  description: string;
};

const EMPTY_PROPOSAL: ProposalDraft = {
  proposed_skill_id: "",
  category: "data",
  name: "",
  description: "",
};

export function SkillsRegistry({ locale, skills }: { locale: Locale; skills: Skill[] }) {
  const { fetch: apiFetch, isAuthenticated, isLoading: authLoading } = useApi();
  const [filter, setFilter] = useState<FilterKey>(ALL_FILTER);
  const [sort, setSort] = useState<SortKey>("order");
  const [query, setQuery] = useState("");
  const [proposal, setProposal] = useState<ProposalDraft>(EMPTY_PROPOSAL);
  const [importText, setImportText] = useState("");
  const [proposals, setProposals] = useState<SkillProposal[]>([]);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const copy = skillRegistryMessages[locale];
  const categoryLabel = (category: Skill["category"]) =>
    getCategoryLabel(category, locale);

  const reloadProposals = async () => {
    if (!isAuthenticated) {
      setProposals([]);
      return;
    }
    setProposalLoading(true);
    try {
      const data = await apiFetch<{ items: SkillProposal[] }>(
        "/api/v1/creator/skill-proposals",
        { signOutOnUnauthorized: false },
      );
      setProposals(data.items ?? []);
    } catch {
      setProposals([]);
    } finally {
      setProposalLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }
    let active = true;
    void apiFetch<{ items: SkillProposal[] }>(
      "/api/v1/creator/skill-proposals",
      { signOutOnUnauthorized: false },
    )
      .then((data) => {
        if (active) {
          setProposals(data.items ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setProposals([]);
        }
      });
    return () => {
      active = false;
    };
  }, [apiFetch, authLoading, isAuthenticated]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return skills
      .filter((skill) => {
        const filterOK = filter === ALL_FILTER || skill.category === filter;
        const queryOK =
          !term ||
          skill.name.toLowerCase().includes(term) ||
          skill.id.toLowerCase().includes(term) ||
          skill.description.toLowerCase().includes(term);
        return filterOK && queryOK;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "category") {
          const categoryDiff =
            CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
          if (categoryDiff !== 0) return categoryDiff;
        }
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
      });
  }, [filter, query, skills, sort]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<Skill["category"], number>();
    for (const skill of skills) {
      counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
    }
    return counts;
  }, [skills]);

  const currentCategoryLabel =
    filter === ALL_FILTER ? copy.allCategories : categoryLabel(filter);

  const submitProposal = async (draft: ProposalDraft, source: SkillProposal["source"]) => {
    if (!isAuthenticated) {
      toast.error(copy.signInRequired);
      return false;
    }
    const body = normalizeProposalDraft(draft);
    if (!body) {
      toast.error(copy.proposalRequired);
      return false;
    }
    try {
      const created = await apiFetch<SkillProposal>("/api/v1/skills/proposals", {
        method: "POST",
        body: { ...body, source },
      });
      setProposals((items) => upsertProposal(items, created));
      return true;
    } catch (err) {
      toast.error(localizedErrorMessage(err, locale, copy.proposalFailed));
      return false;
    }
  };

  const submitSingleProposal = async () => {
    setProposalSubmitting(true);
    try {
      const ok = await submitProposal(proposal, "manual");
      if (ok) {
        toast.success(copy.proposalSubmitted);
        setProposal(EMPTY_PROPOSAL);
      }
    } finally {
      setProposalSubmitting(false);
    }
  };

  const importProposals = async () => {
    const drafts = parseProposalImport(importText, filter, locale);
    if (drafts.length === 0) {
      toast.error(copy.importEmpty);
      return;
    }
    setProposalSubmitting(true);
    try {
      let count = 0;
      for (const draft of drafts) {
        if (await submitProposal(draft, "imported_text")) {
          count += 1;
        }
      }
      if (count > 0) {
        toast.success(copy.importDone(count));
        setImportText("");
        await reloadProposals();
      }
    } finally {
      setProposalSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <aside className="ol-panel ol-panel-pad h-fit">
        <div className="ol-kicker">{copy.registryKicker}</div>
        <h2 className="mt-2 text-[18px] font-black text-[color:var(--ol-ink)]">
          {copy.categoryTitle}
        </h2>
        <div className="mt-4 ol-filter-list">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn("ol-filter-item", filter === item && "active")}
            >
              {item === ALL_FILTER ? copy.all : categoryLabel(item)}
              <span>
                {item === ALL_FILTER ? skills.length : categoryCounts.get(item) ?? 0}
              </span>
            </button>
          ))}
        </div>
        <Link
          href="/publish"
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-[color:var(--ol-primary)] text-[13px] font-black text-white hover:bg-[color:var(--ol-primary-dark)]"
        >
          <Icon name="gift" size="sm" />
          {copy.offerSkill}
        </Link>
      </aside>

      <section className="ol-panel overflow-hidden">
        <div className="ol-panel-head">
          <strong>{copy.directory}</strong>
          <div className="ol-code-tabs">
            {copy.sort.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSort(item.id)}
                className={cn("ol-code-tab", sort === item.id && "active")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-[color:var(--ol-line)] bg-white/70 p-4">
          <div className="ol-search w-full">
            <Icon name="target" size="sm" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[color:var(--ol-soft)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--ol-subtle)]">
              <tr>
                <th className="px-4 py-3 font-black">Skill</th>
                <th className="px-4 py-3 font-black">{copy.category}</th>
                <th className="px-4 py-3 font-black">ID</th>
                <th className="px-4 py-3 font-black">{copy.usedFor}</th>
                <th className="px-4 py-3 font-black">{copy.entry}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((skill) => (
                <tr key={skill.id} className="border-t border-[color:var(--ol-line)] bg-white">
                  <td className="px-4 py-4">
                    <div className="text-[14px] font-black text-[color:var(--ol-ink)]">
                      {skill.name}
                    </div>
                    <div className="mt-1 max-w-[360px] text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                      {skill.description}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="ol-chip ol-chip-mint">
                      {categoryLabel(skill.category)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <code className="font-mono text-[12px] font-bold text-[color:var(--ol-muted)]">
                      {skill.id}
                    </code>
                  </td>
                  <td className="px-4 py-4 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
                    {copy.usage}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/registry?q=${encodeURIComponent(skill.id)}`}
                        className="inline-flex h-8 items-center rounded-[11px] border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40"
                      >
                        {copy.findAgents}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t border-[color:var(--ol-line)] bg-white">
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] font-semibold text-[color:var(--ol-muted)]">
                    {skills.length === 0
                      ? copy.unavailable
                      : copy.noMatch}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.currentDirectory}
          </h2>
          <div className="mt-4 rounded-[16px] bg-[color:var(--ol-blue-soft)] p-4">
            <div className="text-[13px] font-black text-[color:var(--ol-blue)]">
              {currentCategoryLabel}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
              {skills.length > 0
                ? copy.currentSummary(skills.length, rows.length)
                : copy.noData}
            </p>
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.proposalTitle}
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--ol-muted)]">
            {copy.proposalLead}
          </p>
          <div className="mt-4 grid gap-2">
            <input
              value={proposal.proposed_skill_id}
              onChange={(event) =>
                setProposal((value) => ({
                  ...value,
                  proposed_skill_id: event.target.value,
                }))
              }
              className="h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-bold outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.proposalIDPlaceholder}
              aria-label={copy.proposalID}
            />
            <input
              value={proposal.category}
              onChange={(event) =>
                setProposal((value) => ({ ...value, category: event.target.value }))
              }
              className="h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-bold outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.proposalCategory}
              aria-label={copy.proposalCategory}
            />
            <input
              value={proposal.name}
              onChange={(event) =>
                setProposal((value) => ({ ...value, name: event.target.value }))
              }
              className="h-10 w-full rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12.5px] font-bold outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.proposalName}
              aria-label={copy.proposalName}
            />
            <textarea
              value={proposal.description}
              onChange={(event) =>
                setProposal((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              className="min-h-[82px] w-full resize-none rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[12.5px] font-semibold leading-relaxed outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.proposalDescriptionPlaceholder}
              aria-label={copy.proposalDescription}
            />
            <button
              type="button"
              disabled={proposalSubmitting || authLoading}
              onClick={() => void submitSingleProposal()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[color:var(--ol-primary)] px-3 text-[12.5px] font-black text-white disabled:cursor-wait disabled:opacity-65"
            >
              <Icon name="edit" size="sm" />
              {copy.submitProposal}
            </button>
          </div>
          <div className="mt-5 border-t border-[color:var(--ol-line)] pt-4">
            <strong className="text-[13px] font-black text-[color:var(--ol-ink)]">
              {copy.importTitle}
            </strong>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              className="mt-2 min-h-[88px] w-full resize-none rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 py-2 text-[12.5px] font-semibold leading-relaxed outline-none focus:border-[color:var(--ol-primary)]"
              placeholder={copy.importPlaceholder}
            />
            <button
              type="button"
              disabled={proposalSubmitting || authLoading}
              onClick={() => void importProposals()}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[12px] border border-[color:var(--ol-line)] bg-white px-3 text-[12px] font-black text-[color:var(--ol-ink)] hover:border-[color:var(--ol-primary)]/40 disabled:cursor-wait disabled:opacity-65"
            >
              <Icon name="download" size="sm" />
              {copy.importButton}
            </button>
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.proposalListTitle}
          </h2>
          <div className="mt-4 grid gap-2">
            {proposalLoading ? (
              <p className="text-[12.5px] font-semibold text-[color:var(--ol-muted)]">
                {copy.proposalListLoading}
              </p>
            ) : proposals.length === 0 ? (
              <p className="text-[12.5px] font-semibold text-[color:var(--ol-muted)]">
                {copy.proposalListEmpty}
              </p>
            ) : (
              proposals.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[13px] border border-[color:var(--ol-line)] bg-white p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[12.5px] font-black text-[color:var(--ol-ink)]">
                      {item.name}
                    </strong>
                    <span className="ol-chip ol-chip-mint">
                      {copy.statusLabels[item.status as keyof typeof copy.statusLabels] ??
                        item.status}
                    </span>
                  </div>
                  <code className="mt-2 block break-all font-mono text-[11.5px] font-bold text-[color:var(--ol-muted)]">
                    {item.proposed_skill_id}
                  </code>
                  <div className="mt-2 text-[11.5px] font-semibold text-[color:var(--ol-subtle)]">
                    {copy.sourceLabels[item.source as keyof typeof copy.sourceLabels] ??
                      item.source}
                    {" · "}
                    {formatProposalDate(item.updated_at, locale)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="ol-panel ol-panel-pad">
          <h2 className="text-[16px] font-black text-[color:var(--ol-ink)]">
            {copy.pathTitle}
          </h2>
          <div className="mt-4 grid gap-2">
            {copy.paths.map(([label, href], index) => (
              <Link key={href} className={cn("ol-filter-item", index === 0 && "active")} href={href}>
                {label} <span>→</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function normalizeProposalDraft(draft: ProposalDraft): ProposalDraft | null {
  const proposedSkillID = draft.proposed_skill_id.trim().toLowerCase();
  const category = draft.category.trim().toLowerCase();
  const name = draft.name.trim();
  const description = draft.description.trim();
  if (!proposedSkillID || !category || !name || !description) {
    return null;
  }
  return {
    proposed_skill_id: proposedSkillID,
    category,
    name,
    description,
  };
}

function parseProposalImport(text: string, filter: FilterKey, locale: Locale): ProposalDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawID, rawName, rawDescription] = line.split("|").map((part) => part.trim());
      const proposedSkillID = rawID.toLowerCase();
      const inferredCategory =
        proposedSkillID.includes("/")
          ? proposedSkillID.split("/")[0]
          : filter === ALL_FILTER
            ? "ai"
            : filter;
      const fallbackName = proposedSkillID.split("/").pop() || proposedSkillID;
      return {
        proposed_skill_id: proposedSkillID,
        category: inferredCategory,
        name: rawName || fallbackName,
        description:
          rawDescription ||
          (locale === "zh"
            ? `从导入文本创建的 Skill 提案：${proposedSkillID}`
            : `Imported Skill proposal for ${proposedSkillID}`),
      };
    })
    .filter((draft) => Boolean(normalizeProposalDraft(draft)));
}

function upsertProposal(items: SkillProposal[], next: SkillProposal): SkillProposal[] {
  const withoutExisting = items.filter(
    (item) =>
      item.id !== next.id && item.proposed_skill_id !== next.proposed_skill_id,
  );
  return [next, ...withoutExisting];
}

function formatProposalDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
