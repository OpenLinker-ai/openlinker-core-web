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
            "“受限”下 Agent 只能读取页面，不改动网站上的任何数据。“完整交互”下，Agent 可以在你逐条列出的 HTTPS 网址上执行提交、修改这类动作，其他网址一律不行。这份名单由 Core 保管，网页内容和模型都改不了它。",
          restricted: "受限：只读取，不改动",
          full: "完整交互：可在下列网址上改动",
          origins: "允许改动的 HTTPS 网址",
          originsHint: "每行填一个完整网址，例如 https://example.com。不支持通配符、HTTP、路径、查询参数和 # 片段，最多 32 个。",
          generation: "当前版本",
          digest: "网址清单校验值",
          save: "保存浏览器权限",
          saving: "保存中…",
          saved: "浏览器权限已保存",
          invalid: "选择“完整交互”时，至少要填 1 个 HTTPS 网址，最多 32 个。",
          failed: "没有保存成功。请先结束正在进行的浏览器运行，等 Runtime Worker 处理完手上的任务，再重试。",
        }
      : {
          title: "Browser interaction permissions",
          description:
            "Under Restricted, the Agent can only read pages and changes nothing on the site. Under Full interaction, it can submit and modify things, but only on the HTTPS addresses you list below. Core keeps this list; page content and the model cannot add to it.",
          restricted: "Restricted: read only, no changes",
          full: "Full interaction: may change the addresses below",
          origins: "HTTPS addresses the Agent may change",
          originsHint: "One full address per line, such as https://example.com. Wildcards, HTTP, paths, query strings, and # fragments are not accepted. Up to 32.",
          generation: "Current version",
          digest: "Checksum of the address list",
          save: "Save browser permissions",
          saving: "Saving…",
          saved: "Browser permissions saved",
          invalid: "Full interaction needs at least 1 and at most 32 HTTPS addresses.",
          failed: "Not saved. End any browser run in progress, let Runtime Worker finish what it is holding, then try again.",
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
