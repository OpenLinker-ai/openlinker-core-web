"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { localizedErrorMessage } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type InteractionPolicy = "restricted" | "full";

interface BrowserPolicy {
  browser_interaction_policy: InteractionPolicy;
  browser_interaction_policy_generation: number;
  browser_mutation_origins: string[];
  browser_mutation_origins_sha256: string;
  browser_interaction_policy_changed_at: string;
}

interface Props {
  agentId: string;
  locale: Locale;
  disabled?: boolean;
}

function parseOrigins(value: string): string[] {
  return [...new Set(value.split(/[\n,，]/u).map((entry) => entry.trim()).filter(Boolean))];
}

export function BrowserInteractionPolicyPanel({ agentId, locale, disabled = false }: Props) {
  const { fetch: apiFetch } = useApi();
  const [policy, setPolicy] = useState<BrowserPolicy | null>(null);
  const [selected, setSelected] = useState<InteractionPolicy>("restricted");
  const [originsText, setOriginsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy =
    locale === "zh"
      ? {
          title: "浏览器交互权限",
          description:
            "restricted 保持只读/低影响规则；full 允许智能体在 Owner 明确授权的 HTTPS Origin 上执行受支持的状态变更动作。策略来自 Core，页面和模型都不能扩大范围。",
          restricted: "Restricted（受限）",
          full: "Full（完整交互）",
          origins: "允许状态变更的 HTTPS Origin",
          originsHint: "每行一个精确 Origin；不支持通配符、HTTP、路径、查询或片段，最多 32 个。",
          generation: "策略代际",
          digest: "Origin 摘要",
          save: "保存浏览器策略",
          saving: "保存中…",
          saved: "浏览器策略已保存",
          invalid: "Full 策略至少需要一个 HTTPS Origin，且最多 32 个。",
          failed: "保存失败。请先结束 Browser Run 并排空 Runtime Session，再重试。",
        }
      : {
          title: "Browser interaction authority",
          description:
            "Restricted preserves the read-only/low-impact rules. Full permits supported state-changing actions only on exact Owner-authorized HTTPS origins. Core owns this authority; page content and the model cannot widen it.",
          restricted: "Restricted",
          full: "Full interaction",
          origins: "Mutation-authorized HTTPS origins",
          originsHint: "One exact origin per line. Wildcards, HTTP, paths, queries, and fragments are not accepted; maximum 32.",
          generation: "Policy generation",
          digest: "Origin digest",
          save: "Save Browser policy",
          saving: "Saving…",
          saved: "Browser policy saved",
          invalid: "Full policy requires one to 32 HTTPS origins.",
          failed: "Save failed. End Browser Runs and drain Runtime Sessions before retrying.",
        };

  useEffect(() => {
    let active = true;
    apiFetch<BrowserPolicy>(
      `/api/v1/creator/agents/${encodeURIComponent(agentId)}/browser-interaction-policy`,
    )
      .then((value) => {
        if (!active) return;
        setPolicy(value);
        setSelected(value.browser_interaction_policy);
        setOriginsText(value.browser_mutation_origins.join("\n"));
      })
      .catch(() => {
        if (active) setPolicy(null);
      });
    return () => {
      active = false;
    };
  }, [agentId, apiFetch]);

  const origins = useMemo(() => parseOrigins(originsText), [originsText]);

  if (policy === null) return null;

  const save = async () => {
    if (saving || disabled) return;
    const nextOrigins = selected === "full" ? origins : [];
    if (selected === "full" && (nextOrigins.length < 1 || nextOrigins.length > 32)) {
      setError(copy.invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<BrowserPolicy>(
        `/api/v1/creator/agents/${encodeURIComponent(agentId)}/browser-interaction-policy`,
        {
          method: "PUT",
          body: {
            browser_interaction_policy: selected,
            browser_mutation_origins: nextOrigins,
          },
        },
      );
      setPolicy(updated);
      setSelected(updated.browser_interaction_policy);
      setOriginsText(updated.browser_mutation_origins.join("\n"));
      toast.success(copy.saved);
    } catch (reason) {
      const message = localizedErrorMessage(reason, locale, copy.failed);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ol-panel ol-panel-pad space-y-4">
      <div>
        <div className="ol-kicker">{copy.title}</div>
        <h2 className="mt-1 flex items-center gap-2 text-[22px] font-black text-[color:var(--ol-ink)]">
          <ShieldCheck className="size-5" aria-hidden="true" />
          {copy.title}
        </h2>
        <p className="mt-1 max-w-3xl text-[13px] font-semibold leading-5 text-[color:var(--ol-muted)]">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["restricted", "full"] as const).map((value) => (
          <label
            key={value}
            className={`rounded-2xl border p-4 ${selected === value ? "border-[color:var(--ol-primary)] bg-[color:var(--ol-mint)]" : "border-[color:var(--ol-line)] bg-white"}`}
          >
            <input
              type="radio"
              name="browser-interaction-policy"
              value={value}
              checked={selected === value}
              onChange={() => {
                setSelected(value);
                setError(null);
              }}
              disabled={disabled || saving}
              className="sr-only"
            />
            <strong className="text-[14px] font-black text-[color:var(--ol-ink)]">
              {value === "full" ? copy.full : copy.restricted}
            </strong>
          </label>
        ))}
      </div>

      {selected === "full" ? (
        <label className="block">
          <span className="ol-auth-field-label">{copy.origins}</span>
          <textarea
            className="ol-publish-input ol-publish-textarea min-h-[112px] font-mono"
            value={originsText}
            onChange={(event) => {
              setOriginsText(event.target.value);
              setError(null);
            }}
            disabled={disabled || saving}
            spellCheck={false}
          />
          <p className="ol-publish-field-hint">{copy.originsHint}</p>
        </label>
      ) : null}

      <div className="grid gap-2 text-[12px] font-bold text-[color:var(--ol-muted)] md:grid-cols-2">
        <div className="rounded-xl bg-[color:var(--ol-soft)] p-3">
          {copy.generation}: <code>{policy.browser_interaction_policy_generation}</code>
        </div>
        <div className="min-w-0 rounded-xl bg-[color:var(--ol-soft)] p-3">
          {copy.digest}:{" "}
          <code className="break-all">{policy.browser_mutation_origins_sha256}</code>
        </div>
      </div>

      {error ? <p className="ol-publish-field-error">{error}</p> : null}
      <button
        type="button"
        className="ol-mini-btn ol-mini-btn-primary h-10 px-4"
        onClick={save}
        disabled={disabled || saving}
      >
        {saving ? copy.saving : copy.save}
      </button>
    </section>
  );
}

