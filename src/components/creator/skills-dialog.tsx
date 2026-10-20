"use client";

/**
 * Agent 管理：每个 Agent 的技能 dialog（子轮 2.3）。
 *
 * 后端契约：
 *   GET /api/v1/creator/agents/by-slug/:slug          → 含 skills?: Skill[]（owner 详情，支持 private/unlisted）
 *   PATCH /api/v1/creator/agents/:agentId/skills      body { skill_ids: string[] } → 204；最多 5
 *
 * 与其它受控 dialog 的交互模式保持一致：
 *   - open / onClose 受控
 *   - 打开瞬间并行拉 [skills 目录, agent 详情]，loading 期间显示骨架文案
 *   - 保存成功 toast + onClose + router.refresh() 让 hub 重新拉数据
 *   - 失败 toast，dialog 留开
 *
 * 容错：
 *   - 若 agent 详情没带 skills 字段（兄弟前端 D 还没上线），按"空列表"渲染，
 *     允许首次保存。后端 PATCH 才是 source of truth。
 */

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkillPicker } from "@/components/skill/skill-picker";
import { useApi } from "@/hooks/use-api";
import { useClientLocale } from "@/hooks/use-client-locale";
import { localizedErrorMessage } from "@/lib/api";
import { MAX_SKILLS_PER_AGENT, type Skill } from "@/lib/skills";
import { fetchCompleteSkillCatalog } from "@/lib/skill-package-catalog";

interface Props {
  agentId: string;
  agentSlug: string;
  agentName: string;
  open: boolean;
  onClose: () => void;
}

interface AgentDetailResponse {
  id: string;
  slug: string;
  // Frontend D 会补这个字段；当前可选，用 ?? [] 兜底。
  skills?: Skill[];
}

type Stage = "loading" | "ready" | "saving";

export function SkillsDialog(props: Props) {
  return props.open ? <OpenSkillsDialog key={`${props.agentId}:${props.agentSlug}`} {...props} /> : null;
}

function OpenSkillsDialog({
  agentId,
  agentSlug,
  agentName,
  open,
  onClose,
}: Props) {
  const locale = useClientLocale();
  const copy =
    locale === "zh"
      ? {
          loadFailed: "加载能力声明失败，请稍后重试",
          saved: "已保存能力声明",
          saveFailed: "保存失败，请稍后重试",
          title: "能力声明",
          desc: `选择该 Agent 对外声明的 Skill，最多 ${MAX_SKILLS_PER_AGENT} 个；保存后会影响 Agent 搜索结果和能力测评，不会安装技能包或 MCP 工具。`,
          loading: "加载能力目录中…",
          cancel: "取消",
          saving: "保存中…",
          save: "保存",
        }
      : {
          loadFailed: "Failed to load capability declarations. Try again later.",
          saved: "Capability declarations saved",
          saveFailed: "Save failed. Try again later.",
          title: "Capability declarations",
          desc: `Choose the Skills this Agent declares publicly, up to ${MAX_SKILLS_PER_AGENT}. Saving affects Registry search and benchmarks; it does not install skill packages or MCP tools.`,
          loading: "Loading capability directory…",
          cancel: "Cancel",
          saving: "Saving…",
          save: "Save",
        };
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);

  // Callback/token refreshes must not discard an in-progress selection.
  const load = useEffectEvent(() => Promise.all([
    fetchCompleteSkillCatalog(locale),
    apiFetch<AgentDetailResponse>(`/api/v1/creator/agents/by-slug/${encodeURIComponent(agentSlug)}`),
  ]));
  const loadFailed = useEffectEvent((error: unknown) => {
    toast.error(localizedErrorMessage(error, locale, copy.loadFailed));
    onClose();
  });
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const [items, agentRes] = await load();
        if (cancelled) return;
        const current = (agentRes?.skills ?? []).map((s) => s.id);
        setCatalog(items);
        setSelected(current);
        setInitialSelected(current);
        setStage("ready");
      } catch (e) {
        if (cancelled) return;
        loadFailed(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentSlug, locale, open]);

  const handleSave = async () => {
    setStage("saving");
    try {
      await apiFetch(`/api/v1/creator/agents/${agentId}/skills`, {
        method: "PATCH",
        body: { skill_ids: selected },
      });
      toast.success(copy.saved);
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(localizedErrorMessage(e, locale, copy.saveFailed));
      setStage("ready");
    }
  };

  // 选择是否变化（避免无意义的 PATCH）
  const dirty =
    initialSelected.length !== selected.length ||
    initialSelected.some((id) => !selected.includes(id)) ||
    selected.some((id) => !initialSelected.includes(id));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && stage !== "saving") onClose();
      }}
    >
      <DialogContent closeLabel={copy.cancel} className="max-h-[calc(100vh-48px)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.title} · {agentName}</DialogTitle>
          <DialogDescription>
            {copy.desc}
          </DialogDescription>
        </DialogHeader>

        {stage === "loading" ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {copy.loading}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col space-y-4">
            <div className="min-h-0 overflow-y-auto pr-1">
              <SkillPicker
                skills={catalog}
                value={selected}
                onChange={setSelected}
                max={MAX_SKILLS_PER_AGENT}
                locale={locale}
              />
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--ol-line)] pt-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={stage === "saving"}
              >
                {copy.cancel}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!dirty || stage === "saving"}
              >
                {stage === "saving" ? copy.saving : copy.save}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
