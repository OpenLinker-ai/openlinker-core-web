"use client";

/**
 * Agent 管理：每个 Agent 的技能 dialog（子轮 2.3）。
 *
 * 后端契约：
 *   GET /api/v1/agents/:slug                          → 含 skills?: Skill[]（公开详情）
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

import { useEffect, useState } from "react";
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

interface SkillsCatalogResponse {
  items: Skill[];
}

type Stage = "loading" | "ready" | "saving";

export function SkillsDialog({
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
          loadFailed: "加载技能数据失败，请稍后重试",
          saved: "已保存技能",
          saveFailed: "保存失败，请稍后重试",
          title: "技能",
          desc: `选择该 Agent 对外声明的 Skill，最多 ${MAX_SKILLS_PER_AGENT} 个；保存后会影响 Agent 搜索结果和能力测评。`,
          loading: "加载技能目录中...",
          cancel: "取消",
          saving: "保存中...",
          save: "保存",
        }
      : {
          loadFailed: "Failed to load Skills. Try again later.",
          saved: "Skills saved",
          saveFailed: "Save failed. Try again later.",
          title: "Skills",
          desc: `Choose the Skills this Agent declares publicly, up to ${MAX_SKILLS_PER_AGENT}. Saving affects Registry search and benchmarks.`,
          loading: "Loading Skill directory...",
          cancel: "Cancel",
          saving: "Saving...",
          save: "Save",
        };
  const { fetch: apiFetch } = useApi();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);

  // 每次打开拉取目录 + 当前 agent 的 skills
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const [skillsRes, agentRes] = await Promise.all([
          apiFetch<SkillsCatalogResponse>("/api/v1/skills"),
          apiFetch<AgentDetailResponse>(`/api/v1/agents/${agentSlug}`),
        ]);
        if (cancelled) return;
        const items = skillsRes?.items ?? [];
        const current = (agentRes?.skills ?? []).map((s) => s.id);
        setCatalog(items);
        setSelected(current);
        setInitialSelected(current);
        setStage("ready");
      } catch (e) {
        if (cancelled) return;
        toast.error(localizedErrorMessage(e, locale, copy.loadFailed));
        onClose();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, agentSlug, copy.loadFailed, locale, onClose, open]);

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
